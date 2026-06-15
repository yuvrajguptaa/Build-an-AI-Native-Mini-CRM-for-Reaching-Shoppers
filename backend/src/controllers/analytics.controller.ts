import { Request, Response, NextFunction } from 'express';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';
import { Campaign } from '../models/Campaign';
import { generateDashboardRecommendations } from '../services/ai-builder.service';

export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [totalCustomers, totalOrders, totalCampaigns] = await Promise.all([
      Customer.countDocuments(),
      Order.countDocuments(),
      Campaign.countDocuments(),
    ]);

    // Total revenue from all completed orders
    const revenueAgg = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const revenue = revenueAgg[0]?.total ?? 0;

    // Revenue last 30 days (daily series)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const revenueSeries = await Order.aggregate([
      { $match: { purchaseDate: { $gte: thirtyDaysAgo }, status: 'completed' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$purchaseDate' } },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', amount: 1, _id: 0 } },
    ]);

    // Channel mix (campaigns by channel)
    const channelMix = await Campaign.aggregate([
      { $group: { _id: '$channel', count: { $sum: 1 } } },
      { $project: { channel: '$_id', count: 1, _id: 0 } },
    ]);

    const recommendations = await generateDashboardRecommendations({
      totalCustomers,
      totalOrders,
      revenue,
      totalCampaigns,
    });

    res.json({
      success: true,
      totalCustomers,
      totalOrders,
      revenue,
      totalCampaigns,
      revenueSeries,
      channelMix,
      recommendations,
    });
  } catch (err) {
    next(err);
  }
}
