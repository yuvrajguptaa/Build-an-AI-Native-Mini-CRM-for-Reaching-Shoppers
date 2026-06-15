import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('[AI] Gemini API initialized');
} else {
  console.warn('[AI] GEMINI_API_KEY not set — using deterministic fallbacks');
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. NL → MongoDB Segment Filter
// ─────────────────────────────────────────────────────────────────────────────
export async function buildSegmentFilter(prompt: string): Promise<Record<string, unknown>> {
  if (!genAI) return mockSegmentFilter(prompt);

  const currentDate = new Date().toISOString();
  const systemPrompt = `You are an expert MongoDB query builder for a CRM system.
The "customers" collection has these fields:
- totalSpend (number, in INR)
- orderCount (number)
- avgOrderValue (number)
- lastPurchaseDate (Date ISO)
- location (string, city name)
- channelPreference (string: "email" | "sms" | "whatsapp")
- age (number)
- gender (string: "male" | "female")
- name (string)

Current date: ${currentDate}

Return ONLY a valid JSON object representing a MongoDB $match filter.
No markdown, no explanation, ONLY JSON.

User query: "${prompt}"`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(systemPrompt);
    const text = result.response.text().trim();
    // Strip markdown code blocks if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[AI] Segment filter error:', err);
    return mockSegmentFilter(prompt);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Campaign Copy Generator (multi-channel)
// ─────────────────────────────────────────────────────────────────────────────
export interface CampaignDraft {
  title: string;
  objective: string;
  rationale: string;
  channel: 'email' | 'whatsapp' | 'sms';
  subject: string;
  body: string;
  cta: string;
}

export async function generateCampaignDraft(
  objective: string,
  audienceHint: string
): Promise<CampaignDraft> {
  if (!genAI) return mockCampaignDraft(objective);

  const systemPrompt = `You are a senior marketing copywriter for an Indian D2C brand.
Create a high-converting campaign message for: "${objective}"
Audience context: ${audienceHint}

Return ONLY a JSON object with these fields (no markdown):
{
  "title": "Campaign title (max 60 chars)",
  "rationale": "One sentence explaining why this works",
  "channel": "email" | "whatsapp" | "sms",
  "subject": "Email subject line",
  "body": "Message body (max 200 chars for SMS/WhatsApp, longer for email)",
  "cta": "Call to action button text"
}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(systemPrompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[AI] Campaign draft error:', err);
    return mockCampaignDraft(objective);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. AI Campaign Insights
// ─────────────────────────────────────────────────────────────────────────────
export async function generateCampaignInsights(stats: {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  channel: string;
}): Promise<string[]> {
  if (!genAI) return mockInsights(stats);

  const deliveryRate = stats.sent > 0 ? ((stats.delivered / stats.sent) * 100).toFixed(1) : '0';
  const openRate = stats.delivered > 0 ? ((stats.opened / stats.delivered) * 100).toFixed(1) : '0';
  const clickRate = stats.opened > 0 ? ((stats.clicked / stats.opened) * 100).toFixed(1) : '0';

  const prompt = `CRM campaign analytics: channel=${stats.channel}, sent=${stats.sent}, delivery_rate=${deliveryRate}%, open_rate=${openRate}%, click_rate=${clickRate}%.
Generate 3 actionable insights as a JSON array of strings. Max 120 chars each. No markdown.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : mockInsights(stats);
  } catch {
    return mockInsights(stats);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. AI Dashboard Recommendations
// ─────────────────────────────────────────────────────────────────────────────
export async function generateDashboardRecommendations(stats: {
  totalCustomers: number;
  totalOrders: number;
  revenue: number;
  totalCampaigns: number;
}): Promise<Array<{ title: string; detail: string; impact: string; action: string }>> {
  if (!genAI) return mockRecommendations(stats);

  const prompt = `CRM data: ${stats.totalCustomers} customers, ${stats.totalOrders} orders, ₹${stats.revenue} revenue, ${stats.totalCampaigns} campaigns.
Generate 4 AI marketing recommendations as a JSON array. Each object: { "title": string, "detail": string (max 80 chars), "impact": "High"|"Medium"|"Low", "action": string (max 40 chars) }. No markdown.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return mockRecommendations(stats);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. AI Assistant Chat
// ─────────────────────────────────────────────────────────────────────────────
export async function chatWithAssistant(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: string
): Promise<string> {
  if (!genAI) {
    return 'I can help you with customer segments, campaigns, and analytics! Ask me anything about your CRM data. (Note: Connect a Gemini API key for real AI responses.)';
  }

  const systemPrompt = `You are XenoAI's marketing copilot for an Indian D2C brand CRM.
Context: ${context}
Be concise, actionable, and use ₹ for Indian rupees. Max 200 words per response.`;

  const conversationHistory = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const fullPrompt = `${systemPrompt}\n\nConversation:\n${conversationHistory}\nAssistant:`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(fullPrompt);
    return result.response.text().trim();
  } catch (err) {
    console.error('[AI] Chat error:', err);
    return 'Sorry, I encountered an error. Please try again.';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK FALLBACKS (when no API key is configured)
// ─────────────────────────────────────────────────────────────────────────────
function mockSegmentFilter(prompt: string): Record<string, unknown> {
  const lower = prompt.toLowerCase();
  const filter: Record<string, unknown> = {};

  // Extract email address if present
  const emailMatch = prompt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    filter['email'] = emailMatch[0];
  }

  if (lower.includes('5000') || lower.includes('₹5000')) filter['totalSpend'] = { $gt: 5000 };
  if (lower.includes('inactive') || lower.includes('60 day') || lower.includes('60d')) {
    const d = new Date();
    d.setDate(d.getDate() - 60);
    filter['lastPurchaseDate'] = { $lte: d.toISOString() };
  }
  if (lower.includes('high value') || lower.includes('20000')) filter['totalSpend'] = { $gte: 20000 };
  if (lower.includes('3 order') || lower.includes('multiple order')) filter['orderCount'] = { $gte: 3 };
  
  // Improved fallback for gender
  if (lower.includes('female') || lower.includes('women')) {
    filter['gender'] = 'female';
  } else if (lower.includes('male') || lower.includes('men')) {
    filter['gender'] = 'male';
  }

  // Improved fallback for Indian cities
  const cities = ['mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata', 'hyderabad', 'pune', 'jaipur', 'bhopal', 'indore', 'lucknow', 'ahmedabad', 'surat'];
  for (const city of cities) {
    if (lower.includes(city)) {
      filter['location'] = city.charAt(0).toUpperCase() + city.slice(1);
      break;
    }
  }

  if (Object.keys(filter).length === 0) filter['orderCount'] = { $gte: 1 };
  return filter;
}

function mockCampaignDraft(objective: string): CampaignDraft {
  return {
    title: `Campaign: ${objective.slice(0, 40)}`,
    objective,
    rationale: 'Targeting engaged customers with personalized offers drives higher conversion.',
    channel: 'email',
    subject: 'A special offer just for you! 🎉',
    body: `Hi {{name}},\n\nWe have a special offer crafted just for you based on your shopping history.\n\nDon't miss out — this limited-time deal is available for the next 48 hours only.\n\nShop now and save big!`,
    cta: 'Claim Your Offer',
  };
}

function mockInsights(stats: {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  channel: string;
}): string[] {
  const dr = stats.sent > 0 ? ((stats.delivered / stats.sent) * 100).toFixed(0) : 0;
  return [
    `${dr}% delivery rate on ${stats.channel} — consider cleaning unresponsive contacts.`,
    `Open-to-click ratio suggests the CTA could be more compelling. Try A/B testing button text.`,
    `Re-engage non-openers with a follow-up message 3 days after the initial send.`,
  ];
}

function mockRecommendations(stats: {
  totalCustomers: number;
  revenue: number;
}): Array<{ title: string; detail: string; impact: string; action: string }> {
  const ltv = stats.totalCustomers > 0 ? Math.round(stats.revenue / stats.totalCustomers) : 0;
  return [
    {
      title: 'Win-back inactive customers',
      detail: 'Customers inactive for 60+ days respond well to personalized discount codes.',
      impact: 'High',
      action: 'Build segment',
    },
    {
      title: 'Upsell to high-value buyers',
      detail: 'Customers with spend >₹20K have 3x higher repeat purchase probability.',
      impact: 'High',
      action: 'Create campaign',
    },
    {
      title: `Improve average LTV (₹${ltv.toLocaleString('en-IN')})`,
      detail: 'Loyalty programs increase repeat order rate by 25-40% on average.',
      impact: 'Medium',
      action: 'Set up loyalty tier',
    },
    {
      title: 'WhatsApp channel opportunity',
      detail: 'WhatsApp has 3x higher open rates than email for promotional messages.',
      impact: 'Medium',
      action: 'Enable WhatsApp',
    },
  ];
}
