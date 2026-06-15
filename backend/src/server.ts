import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/db';
import { errorHandler, notFound } from './middleware/error.middleware';
import { Campaign } from './models/Campaign';
import { Communication } from './models/Communication';
import { Customer } from './models/Customer';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Routes
import authRoutes from './routes/auth.routes';
import customerRoutes from './routes/customer.routes';
import segmentRoutes from './routes/segment.routes';
import campaignRoutes from './routes/campaign.routes';
import aiRoutes from './routes/ai.routes';

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ────────────────────────────────────────────────────────────────
const allowedOrigins = [
  (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, ''),
  'http://localhost:3000',
  'http://localhost:3001',
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. Postman, server-to-server)
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.some((o) => cleanOrigin.startsWith(o) || o.startsWith(cleanOrigin))) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date(), version: '1.0.0' });
});

// ─── Embedded Channel Simulator (replaces the separate channel-service) ────────
app.post('/channel/send-message', async (req, res) => {
  const { messageId, customerId, channel, content, callbackUrl } = req.body as {
    messageId: string;
    customerId: string;
    channel: 'email' | 'sms' | 'whatsapp';
    content: string;
    callbackUrl: string;
  };

  if (!messageId || !callbackUrl || !customerId) {
    res.status(400).json({ error: 'messageId, customerId, and callbackUrl are required' });
    return;
  }

  res.json({ success: true, queued: true, messageId });

  if (channel === 'email' && process.env.SMTP_USER && process.env.SMTP_USER !== 'your_email@gmail.com') {
    // Real email dispatch
    try {
      const customer = await Customer.findById(customerId);
      if (!customer || !customer.email) throw new Error('Customer email not found');

      const personalizedContent = content.replace(/{{customerName}}/g, customer.name);

      await transporter.sendMail({
        from: `"XenoPilot CRM" <${process.env.SMTP_USER}>`,
        to: customer.email,
        subject: 'Message from XenoPilot CRM',
        text: personalizedContent,
      });

      console.log(`[Email] ✓ Sent real email to ${customer.email}`);
      await sendDeliveryCallback(callbackUrl, messageId, 'DELIVERED');
      
      // Simulate an open 50% of the time after 5 seconds
      if (Math.random() > 0.5) {
        setTimeout(() => sendDeliveryCallback(callbackUrl, messageId, 'OPENED').catch(console.error), 5000 + Math.random() * 5000);
      }
    } catch (err: any) {
      console.error(`[Email] ✗ Delivery failed for ${messageId}:`, err.message);
      await sendDeliveryCallback(callbackUrl, messageId, 'FAILED');
    }
  } else {
    // Simulate async delivery in background for SMS/WhatsApp or if SMTP is not configured
    simulateChannelDelivery(messageId, channel, callbackUrl, content).catch((err: any) =>
      console.error('[Channel] Simulation error:', err.message)
    );
  }
});

async function simulateChannelDelivery(
  messageId: string,
  channel: string,
  callbackUrl: string,
  _content: string
) {
  const rand = Math.random();

  // 90% delivery rate
  if (rand < 0.1) {
    await delay(500 + Math.random() * 1000);
    await sendDeliveryCallback(callbackUrl, messageId, 'FAILED');
    return;
  }

  // DELIVERED
  await delay(300 + Math.random() * 700);
  await sendDeliveryCallback(callbackUrl, messageId, 'DELIVERED');

  // Open probability
  const openProb = channel === 'whatsapp' ? 0.85 : channel === 'sms' ? 0.70 : 0.55;
  if (Math.random() > openProb) return;

  await delay(1000 + Math.random() * 3000);
  await sendDeliveryCallback(callbackUrl, messageId, 'OPENED');

  // 40% click rate of openers
  if (Math.random() > 0.40) return;
  await delay(500 + Math.random() * 2000);
  await sendDeliveryCallback(callbackUrl, messageId, 'CLICKED');

  // 15% purchase/conversion
  if (Math.random() > 0.15) return;
  await delay(2000 + Math.random() * 5000);
  await sendDeliveryCallback(callbackUrl, messageId, 'PURCHASED');
}

async function sendDeliveryCallback(callbackUrl: string, messageId: string, eventType: string) {
  try {
    // Use internal HTTP call to receipt endpoint
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
    const url = callbackUrl.startsWith('http') ? callbackUrl : `${baseUrl}${callbackUrl}`;

    // Directly process internally to avoid network round-trip when possible
    await processDeliveryReceipt(messageId, eventType as any);
    console.log(`[Channel] ✓ ${eventType} processed for ${messageId}`);
  } catch (err: any) {
    console.error(`[Channel] ✗ Callback failed for ${messageId}: ${err.message}`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Internal receipt processor (used by both webhook and channel simulator) ──
async function processDeliveryReceipt(
  messageId: string,
  eventType: 'DELIVERED' | 'FAILED' | 'OPENED' | 'READ' | 'CLICKED' | 'PURCHASED'
) {
  const statusMap: Record<string, string> = {
    DELIVERED: 'delivered',
    FAILED: 'failed',
    OPENED: 'opened',
    READ: 'read',
    CLICKED: 'clicked',
    PURCHASED: 'converted',
  };

  const newStatus = statusMap[eventType] || 'delivered';
  const comm = await Communication.findByIdAndUpdate(
    messageId,
    {
      status: newStatus,
      $push: { history: { status: newStatus, timestamp: new Date() } },
    },
    { new: true }
  );

  if (comm) {
    const inc: Record<string, number> = {};
    if (newStatus === 'delivered') inc['deliveredCount'] = 1;
    if (newStatus === 'failed') inc['failedCount'] = 1;
    if (newStatus === 'opened') inc['openedCount'] = 1;
    if (newStatus === 'clicked') inc['clickedCount'] = 1;
    if (newStatus === 'converted') inc['conversionCount'] = 1;
    if (Object.keys(inc).length > 0) {
      await Campaign.findByIdAndUpdate(comm.campaignId, { $inc: inc });
    }
  }
}

// ─── Webhook: Channel Service Delivery Callback ────────────────────────────────
app.post('/api/receipt', async (req, res) => {
  const { messageId, eventType, timestamp } = req.body as {
    messageId: string;
    eventType: 'DELIVERED' | 'FAILED' | 'OPENED' | 'READ' | 'CLICKED' | 'PURCHASED';
    timestamp: string;
  };

  try {
    await processDeliveryReceipt(messageId, eventType);
    console.log(`[Webhook] ${eventType} for message ${messageId}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Webhook] Error:', err);
    res.status(500).json({ success: false });
  }
});

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/ai', aiRoutes);

// ─── Error Handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🚀 XenoAI CRM Backend running on http://localhost:${PORT}`);
    console.log(`   Health:    GET  /health`);
    console.log(`   Auth:      POST /api/auth/register | /api/auth/login`);
    console.log(`   Customers: GET  /api/customers`);
    console.log(`   Segments:  POST /api/segments/ai-build`);
    console.log(`   Campaigns: GET  /api/campaigns`);
    console.log(`   AI:        POST /api/ai/chat`);
    console.log(`   Channel:   POST /channel/send-message`);
    console.log(`   Webhook:   POST /api/receipt\n`);
  });
}

if (!process.env.VERCEL) {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
} else {
  // In Vercel serverless environment, connect to the database
  connectDB().catch((err) => {
    console.error('Failed to connect to DB in serverless mode:', err);
  });
}

export default app;
