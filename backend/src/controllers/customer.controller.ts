import { Request, Response, NextFunction } from 'express';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';
import { createError } from '../middleware/error.middleware';

export async function createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, phone, city, gender, age } = req.body;
    
    if (!name || !email) throw createError('Name and email are required', 400);

    const existing = await Customer.findOne({ email });
    if (existing) throw createError('A customer with this email already exists', 400);

    const customer = await Customer.create({
      name,
      email,
      phone,
      location: city,
      gender,
      age: parseInt(age) || undefined,
      totalSpend: 0,
      orderCount: 0,
      channelPreference: 'email',
    });

    res.status(201).json({ success: true, customer });
  } catch (err) {
    next(err);
  }
}

export async function listCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 25);
    const search = (req.query.search as string) || '';
    const city = (req.query.city as string) || '';
    const gender = (req.query.gender as string) || '';
    const segment = (req.query.segment as string) || '';
    const sortBy = (req.query.sortBy as string) || 'totalSpend';
    const sortDir = req.query.sortDir === 'asc' ? 1 : -1;

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (city) filter.location = { $regex: city, $options: 'i' };
    if (gender) filter.gender = gender;

    if (segment === 'active') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      filter.lastPurchaseDate = { $gte: d };
    } else if (segment === 'inactive') {
      const d = new Date();
      d.setDate(d.getDate() - 60);
      filter.lastPurchaseDate = { $lte: d };
    } else if (segment === 'high_value') {
      filter.totalSpend = { $gte: 20000 };
    } else if (segment === 'low_value') {
      filter.totalSpend = { $lt: 5000 };
    }

    const sortField = sortBy === 'last_purchase_date' ? 'lastPurchaseDate' : 'totalSpend';
    const [rows, total] = await Promise.all([
      Customer.find(filter)
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Customer.countDocuments(filter),
    ]);

    // Get all unique cities for filter dropdown
    const cities = await Customer.distinct('location');

    res.json({
      success: true,
      data: rows.map((c) => ({
        id: c._id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        city: c.location,
        age: c.age,
        gender: c.gender,
        total_spend: c.totalSpend,
        order_count: c.orderCount,
        avg_order_value: c.avgOrderValue,
        last_purchase_date: c.lastPurchaseDate,
        channel_preference: c.channelPreference,
        created_at: c.createdAt,
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      meta: { cities: cities.filter(Boolean).sort() },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) throw createError('Customer not found', 404);

    const orders = await Order.find({ customerId: customer._id })
      .sort({ purchaseDate: -1 })
      .lean();

    // Spend trend (monthly, last 12 months)
    const twelve = new Date();
    twelve.setMonth(twelve.getMonth() - 12);
    const spendTrend = await Order.aggregate([
      { $match: { customerId: customer._id, purchaseDate: { $gte: twelve } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$purchaseDate' } },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { month: '$_id', amount: 1, _id: 0 } },
    ]);

    const daysSinceLastPurchase = customer.lastPurchaseDate
      ? Math.floor((Date.now() - new Date(customer.lastPurchaseDate).getTime()) / 86400000)
      : 9999;

    const spend = customer.totalSpend ?? 0;
    let segment = 'Regular';
    if (spend >= 20000) segment = 'High Value';
    else if (daysSinceLastPurchase > 60) segment = 'Inactive';
    else if (daysSinceLastPurchase <= 30) segment = 'Active';
    else if (spend < 5000) segment = 'Low Value';

    res.json({
      success: true,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        city: customer.location,
        age: customer.age,
        gender: customer.gender,
        total_spend: customer.totalSpend,
        order_count: customer.orderCount,
        channel_preference: customer.channelPreference,
        created_at: customer.createdAt,
      },
      orders: orders.map((o) => ({
        id: o._id,
        order_number: o.orderNumber,
        amount: o.amount,
        status: o.status,
        category: o.category,
        order_date: o.purchaseDate,
      })),
      spendTrend,
      segment,
      daysSinceLastPurchase,
    });
  } catch (err) {
    next(err);
  }
}

export async function importOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = req.body as Array<{
      orderNumber: string;
      customerEmail: string;
      customerName: string;
      amount: number;
      status?: string;
      category?: string;
      items?: Array<{ name: string; quantity: number; price: number }>;
      purchaseDate: string;
    }>;

    if (!Array.isArray(rows)) throw createError('Body must be an array', 400);

    let imported = 0;
    for (const row of rows) {
      // Upsert customer
      let customer = await Customer.findOne({ email: row.customerEmail });
      if (!customer) {
        customer = await Customer.create({
          name: row.customerName,
          email: row.customerEmail,
          totalSpend: 0,
          orderCount: 0,
        });
      }

      // Create order
      const order = await Order.create({
        customerId: customer._id,
        orderNumber: row.orderNumber,
        amount: row.amount,
        status: row.status || 'completed',
        category: row.category || 'general',
        items: row.items || [{ name: 'Product', quantity: 1, price: row.amount }],
        purchaseDate: new Date(row.purchaseDate),
      });

      // Update customer aggregates
      const agg = await Order.aggregate([
        { $match: { customerId: customer._id } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 }, last: { $max: '$purchaseDate' } } },
      ]);
      if (agg[0]) {
        await Customer.findByIdAndUpdate(customer._id, {
          totalSpend: agg[0].total,
          orderCount: agg[0].count,
          avgOrderValue: Math.round(agg[0].total / agg[0].count),
          lastPurchaseDate: agg[0].last,
        });
      }
      imported++;
    }

    res.json({ success: true, importedCount: imported });
  } catch (err) {
    next(err);
  }
}

export async function getDistinctCities(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cities = await Customer.distinct('location');
    res.json({ success: true, cities: cities.filter(Boolean).sort() });
  } catch (err) {
    next(err);
  }
}
