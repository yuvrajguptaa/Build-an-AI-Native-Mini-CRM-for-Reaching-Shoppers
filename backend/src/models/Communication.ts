import { Schema, model, Document, Types } from 'mongoose';

export interface ICommunication extends Document {
  campaignId: Types.ObjectId;
  customerId: Types.ObjectId;
  channel: 'email' | 'sms' | 'whatsapp';
  messageContent: string;
  status: 'sent' | 'delivered' | 'failed' | 'opened' | 'read' | 'clicked' | 'converted';
  history: Array<{ status: string; timestamp: Date }>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CommunicationSchema = new Schema<ICommunication>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    channel: { type: String, enum: ['email', 'sms', 'whatsapp'], required: true },
    messageContent: { type: String, required: true },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed', 'opened', 'read', 'clicked', 'converted'],
      default: 'sent',
      index: true,
    },
    history: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

CommunicationSchema.index({ campaignId: 1, status: 1 });

export const Communication = model<ICommunication>('Communication', CommunicationSchema);
