/**
 * Seed script: populates MongoDB with realistic Indian D2C customer + order data
 * Run: npm run seed
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { Customer } from '../models/Customer';
import { Order } from '../models/Order';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/xeno-crm';

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat'];
const CHANNELS = ['email', 'sms', 'whatsapp'] as string[];
const GENDERS = ['male', 'female'] as string[];
const CATEGORIES = ['Electronics', 'Fashion', 'Beauty', 'Home Decor', 'Fitness', 'Books', 'Groceries', 'Jewellery', 'Footwear', 'Sports'];
const PRODUCTS = ['Wireless Earbuds', 'Sneakers', 'Moisturizer Kit', 'Yoga Mat', 'Coffee Table', 'Silk Saree', 'Smart Watch', 'Protein Powder', 'Backpack', 'Novel Set'];

const FIRST_NAMES_M = ['Aryan', 'Rohit', 'Vikas', 'Suresh', 'Aditya', 'Karan', 'Rahul', 'Dev', 'Nikhil', 'Siddharth', 'Vivek', 'Anand', 'Sanjeev', 'Raj', 'Manish'];
const FIRST_NAMES_F = ['Priya', 'Sneha', 'Anjali', 'Meera', 'Divya', 'Kavya', 'Ananya', 'Pooja', 'Riya', 'Shreya', 'Nisha', 'Deepa', 'Swati', 'Nidhi', 'Isha'];
const LAST_NAMES = ['Sharma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Reddy', 'Nair', 'Shah', 'Mehta', 'Joshi', 'Mishra', 'Rao', 'Verma', 'Agarwal', 'Chopra'];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min: number, max: number): number { return parseFloat((Math.random() * (max - min) + min).toFixed(2)); }
function daysAgo(n: number): Date { const d = new Date(); d.setDate(d.getDate() - n); return d; }

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('[Seed] Connected to MongoDB');

  // Clear existing data
  await Customer.deleteMany({});
  await Order.deleteMany({});
  console.log('[Seed] Cleared existing customers and orders');

  const customers = [];
  for (let i = 0; i < 500; i++) {
    const gender = rand(GENDERS);
    const firstName = gender === 'male' ? rand(FIRST_NAMES_M) : rand(FIRST_NAMES_F);
    const lastName = rand(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    const phone = `+91${randInt(7000000000, 9999999999)}`;

    customers.push({
      name,
      email,
      phone,
      location: rand(CITIES),
      age: randInt(22, 55),
      gender,
      channelPreference: rand(CHANNELS),
      totalSpend: 0,
      orderCount: 0,
      avgOrderValue: 0,
      lastPurchaseDate: null,
    });
  }

  const insertedCustomers = await Customer.insertMany(customers);
  console.log(`[Seed] Created ${insertedCustomers.length} customers`);

  const orders = [];
  for (const customer of insertedCustomers) {
    const orderCount = randInt(0, 8);
    let totalSpend = 0;
    let lastDate: Date | null = null;

    for (let j = 0; j < orderCount; j++) {
      const product = rand(PRODUCTS);
      const category = rand(CATEGORIES);
      const price = randInt(299, 15000);
      const quantity = randInt(1, 3);
      const amount = price * quantity;
      const purchaseDate = daysAgo(randInt(1, 365));

      orders.push({
        customerId: customer._id,
        orderNumber: `ORD-${Date.now()}-${customer._id.toString().slice(-4)}-${j}`,
        amount,
        status: 'completed',
        category,
        items: [{ name: product, quantity, price }],
        purchaseDate,
      });

      totalSpend += amount;
      if (!lastDate || purchaseDate > lastDate) lastDate = purchaseDate;
    }

    if (orderCount > 0) {
      await Customer.findByIdAndUpdate(customer._id, {
        totalSpend,
        orderCount,
        avgOrderValue: Math.round(totalSpend / orderCount),
        lastPurchaseDate: lastDate,
      });
    }
  }

  if (orders.length > 0) {
    // Insert in batches to avoid timeout
    const batchSize = 100;
    for (let i = 0; i < orders.length; i += batchSize) {
      await Order.insertMany(orders.slice(i, i + batchSize));
    }
    console.log(`[Seed] Created ${orders.length} orders`);
  }

  const stats = await Customer.aggregate([
    { $group: { _id: null, totalSpend: { $sum: '$totalSpend' }, avgSpend: { $avg: '$totalSpend' }, maxSpend: { $max: '$totalSpend' } } }
  ]);
  if (stats[0]) {
    console.log(`[Seed] Total revenue: ₹${stats[0].totalSpend.toLocaleString('en-IN')}`);
    console.log(`[Seed] Avg customer spend: ₹${Math.round(stats[0].avgSpend).toLocaleString('en-IN')}`);
    console.log(`[Seed] Top spender: ₹${stats[0].maxSpend.toLocaleString('en-IN')}`);
  }

  console.log('[Seed] ✅ Done! Database seeded successfully.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
