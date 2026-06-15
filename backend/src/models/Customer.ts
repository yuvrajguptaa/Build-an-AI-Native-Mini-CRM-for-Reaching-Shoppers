import { Schema, model, Document } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  email: string;
  phone: string;
  location: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  channelPreference: 'email' | 'sms' | 'whatsapp';
  totalSpend: number;
  orderCount: number;
  avgOrderValue: number;
  lastPurchaseDate: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true, index: 'text' },
    email: { type: String, unique: true, sparse: true, lowercase: true, index: true },
    phone: { type: String, unique: true, sparse: true, index: true },
    location: { type: String, index: true },
    age: { type: Number, default: 0 },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    channelPreference: { type: String, enum: ['email', 'sms', 'whatsapp'], default: 'email' },
    totalSpend: { type: Number, default: 0, index: true },
    orderCount: { type: Number, default: 0, index: true },
    avgOrderValue: { type: Number, default: 0 },
    lastPurchaseDate: { type: Date, default: null, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Compound indexes for common segmentation queries
CustomerSchema.index({ totalSpend: -1, lastPurchaseDate: 1 });
CustomerSchema.index({ orderCount: -1, lastPurchaseDate: 1 });
CustomerSchema.index({ name: 'text', email: 'text', phone: 'text' });

export const Customer = model<ICustomer>('Customer', CustomerSchema);
