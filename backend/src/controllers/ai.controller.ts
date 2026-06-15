import { Request, Response, NextFunction } from 'express';
import { Customer } from '../models/Customer';
import { Campaign } from '../models/Campaign';
import { Order } from '../models/Order';
import { generateCampaignDraft, chatWithAssistant } from '../services/ai-builder.service';
import { createError } from '../middleware/error.middleware';

export async function aiGenerateCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { objective, audienceHint } = req.body as { objective: string; audienceHint?: string };
    if (!objective?.trim()) throw createError('objective is required', 400);

    const draft = await generateCampaignDraft(objective, audienceHint || '');
    res.json({ success: true, draft });
  } catch (err) {
    next(err);
  }
}

export async function aiAssistantChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { messages } = req.body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      throw createError('messages array is required', 400);
    }

    // Build brief context from DB
    const [customers, orders, campaigns] = await Promise.all([
      Customer.countDocuments(),
      Order.countDocuments(),
      Campaign.countDocuments(),
    ]);

    const revenueAgg = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const revenue = revenueAgg[0]?.total ?? 0;

    const context = `You have ${customers} customers, ${orders} total orders, ₹${revenue.toLocaleString('en-IN')} revenue, ${campaigns} campaigns.`;
    const reply = await chatWithAssistant(messages, context);

    res.json({ success: true, reply });
  } catch (err) {
    next(err);
  }
}
