import { Schema, model, Document, Types } from 'mongoose';

export interface IMessageTemplate {
  subject?: string;
  body: string;
  ctaUrl?: string;
  ctaText?: string;
}

export interface ICampaign extends Document {
  name: string;
  objective: string;
  segmentId: Types.ObjectId | null;
  audienceFilter: Record<string, unknown>;
  audienceSize: number;
  channel: 'email' | 'sms' | 'whatsapp';
  messageTemplate: IMessageTemplate;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'failed';
  scheduledTime?: Date;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  openedCount: number;
  clickedCount: number;
  conversionCount: number;
  revenueGenerated: number;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    name: { type: String, required: true },
    objective: { type: String, default: '' },
    segmentId: { type: Schema.Types.ObjectId, ref: 'Segment', default: null, index: true },
    audienceFilter: { type: Schema.Types.Mixed, default: {} },
    audienceSize: { type: Number, default: 0 },
    channel: { type: String, enum: ['email', 'sms', 'whatsapp'], required: true },
    messageTemplate: {
      subject: { type: String },
      body: { type: String, required: true },
      ctaUrl: { type: String },
      ctaText: { type: String },
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'completed', 'failed'],
      default: 'draft',
      index: true,
    },
    scheduledTime: { type: Date, index: true },
    sentCount: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    openedCount: { type: Number, default: 0 },
    clickedCount: { type: Number, default: 0 },
    conversionCount: { type: Number, default: 0 },
    revenueGenerated: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Campaign = model<ICampaign>('Campaign', CampaignSchema);
