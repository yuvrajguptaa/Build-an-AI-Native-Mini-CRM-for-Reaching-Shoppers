import { Request, Response, NextFunction } from 'express';
import { Customer } from '../models/Customer';
import { Segment } from '../models/Segment';
import { buildSegmentFilter } from '../services/ai-builder.service';
import { createError } from '../middleware/error.middleware';

export async function aiSegmentBuild(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { prompt } = req.body as { prompt: string };
    if (!prompt?.trim()) throw createError('prompt is required', 400);

    const filter = await buildSegmentFilter(prompt);

    // Count + estimate revenue
    const [count, revenueAgg] = await Promise.all([
      Customer.countDocuments(filter),
      Customer.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$totalSpend' } } }]),
    ]);

    const estRevenue = revenueAgg[0]?.total ?? 0;

    // Preview — first 10 customers
    const preview = await Customer.find(filter).limit(10).select('name email location totalSpend').lean();

    res.json({
      success: true,
      filter,
      count,
      estRevenue,
      preview: preview.map((c) => ({
        id: c._id,
        name: c.name,
        email: c.email,
        city: c.location,
        total_spend: c.totalSpend,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function listSegments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const segments = await Segment.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: segments });
  } catch (err) {
    next(err);
  }
}

export async function createSegment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description, naturalLanguageQuery, filterDefinition, customerCount, estimatedRevenue } = req.body;
    if (!name || !filterDefinition) throw createError('name and filterDefinition are required', 400);

    const segment = await Segment.create({
      name,
      description,
      naturalLanguageQuery: naturalLanguageQuery || '',
      filterDefinition,
      customerCount: customerCount || 0,
      estimatedRevenue: estimatedRevenue || 0,
    });

    res.status(201).json({ success: true, segment });
  } catch (err) {
    next(err);
  }
}

export async function getSegment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const segment = await Segment.findById(req.params.id).lean();
    if (!segment) throw createError('Segment not found', 404);
    res.json({ success: true, segment });
  } catch (err) {
    next(err);
  }
}
