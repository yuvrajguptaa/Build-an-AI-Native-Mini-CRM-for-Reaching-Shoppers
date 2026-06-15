import { Request, Response, NextFunction } from 'express';
import { Campaign } from '../models/Campaign';
import { Customer } from '../models/Customer';
import { Communication } from '../models/Communication';
import { createError } from '../middleware/error.middleware';
import { generateCampaignInsights } from '../services/ai-builder.service';
import axios from 'axios';

// Channel simulator is now embedded in this server
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const CHANNEL_SERVICE_URL = `${BACKEND_URL}/channel`;

export async function listCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      data: campaigns.map((c) => ({
        id: c._id,
        name: c.name,
        title: c.name,
        objective: c.objective,
        channel: c.channel,
        audience_size: c.audienceSize,
        status: c.status,
        created_at: c.createdAt,
        sent_count: c.sentCount,
        delivered_count: c.deliveredCount,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      name,
      objective,
      audienceFilter,
      channel,
      messageTemplate,
      segmentId,
    } = req.body;

    if (!name || !channel || !messageTemplate?.body) {
      throw createError('name, channel, and messageTemplate.body are required', 400);
    }

    // Count audience
    const filter = audienceFilter || {};
    const audienceSize = Object.keys(filter).length > 0 ? await Customer.countDocuments(filter) : 0;

    const campaign = await Campaign.create({
      name,
      objective: objective || '',
      segmentId: segmentId || null,
      audienceFilter: filter,
      audienceSize,
      channel,
      messageTemplate,
      status: 'draft',
    });

    res.status(201).json({ success: true, campaign: { id: campaign._id, ...campaign.toObject() } });
  } catch (err) {
    next(err);
  }
}

export async function getCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const campaign = await Campaign.findById(req.params.id).lean();
    if (!campaign) throw createError('Campaign not found', 404);

    const stats = {
      sent: campaign.sentCount,
      delivered: campaign.deliveredCount,
      failed: campaign.failedCount,
      opened: campaign.openedCount,
      clicked: campaign.clickedCount,
    };

    const insights = await generateCampaignInsights({ ...stats, channel: campaign.channel });

    // Communication trend over time (hourly buckets)
    const trendSeries = await Communication.aggregate([
      { $match: { campaignId: campaign._id } },
      {
        $group: {
          _id: { $dateToString: { format: '%H:%M', date: '$updatedAt' } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          opened: { $sum: { $cond: [{ $eq: ['$status', 'opened'] }, 1, 0] } },
          clicked: { $sum: { $cond: [{ $eq: ['$status', 'clicked'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { t: '$_id', delivered: 1, opened: 1, clicked: 1, _id: 0 } },
    ]);

    res.json({
      success: true,
      campaign: {
        id: campaign._id,
        title: campaign.name,
        objective: campaign.objective,
        channel: campaign.channel,
        status: campaign.status,
        audience_size: campaign.audienceSize,
        message: campaign.messageTemplate.body,
        subject: campaign.messageTemplate.subject,
        cta: campaign.messageTemplate.ctaText,
      },
      stats,
      trendSeries,
      insights,
    });
  } catch (err) {
    next(err);
  }
}

export async function sendCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) throw createError('Campaign not found', 404);
    if (campaign.status === 'completed') throw createError('Campaign already completed', 400);

    // Get audience
    const filter = campaign.audienceFilter || {};
    const customers = await Customer.find(filter).select('_id name email phone channelPreference').lean();

    if (customers.length === 0) throw createError('No customers match this audience filter', 400);

    // Update campaign status
    campaign.status = 'running';
    campaign.audienceSize = customers.length;
    await campaign.save();

    // Create communication records + send to channel service
    let sentCount = 0;
    const promises = customers.map(async (customer) => {
      try {
        const personalizedMsg = campaign.messageTemplate.body.replace(/{{name}}/g, customer.name);
        const comm = await Communication.create({
          campaignId: campaign._id,
          customerId: customer._id,
          channel: campaign.channel,
          messageContent: personalizedMsg,
          status: 'sent',
          history: [{ status: 'sent', timestamp: new Date() }],
        });

        // Try to notify channel service (fire-and-forget)
        try {
          await axios.post(`${CHANNEL_SERVICE_URL}/send-message`, {
            messageId: comm._id.toString(),
            customerId: customer._id.toString(),
            channel: campaign.channel,
            content: personalizedMsg,
            callbackUrl: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/receipt`,
          }, { timeout: 3000 });
        } catch {
          // Channel service unavailable — simulate delivery in-process
          await simulateDelivery(comm._id.toString(), campaign._id.toString());
        }

        sentCount++;
      } catch (e) {
        console.error('[Campaign Send] Error for customer', customer._id, e);
      }
    });

    await Promise.allSettled(promises);

    await Campaign.findByIdAndUpdate(campaign._id, {
      sentCount,
      status: 'completed',
    });

    res.json({ success: true, audienceSize: customers.length, sentCount });
  } catch (err) {
    next(err);
  }
}

// Simulate delivery when channel service is unavailable
async function simulateDelivery(commId: string, campaignId: string): Promise<void> {
  const rand = Math.random();
  const newStatus = rand < 0.1 ? 'failed' : rand < 0.6 ? 'delivered' : rand < 0.85 ? 'opened' : 'clicked';

  await Communication.findByIdAndUpdate(commId, {
    status: newStatus,
    $push: { history: { status: newStatus, timestamp: new Date() } },
  });

  const inc: Record<string, number> = {};
  if (newStatus !== 'failed') inc['deliveredCount'] = 1;
  if (newStatus === 'failed') inc['failedCount'] = 1;
  if (newStatus === 'opened' || newStatus === 'clicked') inc['openedCount'] = 1;
  if (newStatus === 'clicked') inc['clickedCount'] = 1;

  if (Object.keys(inc).length > 0) {
    await Campaign.findByIdAndUpdate(campaignId, { $inc: inc });
  }
}
