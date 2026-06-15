import { Schema, model, Document } from 'mongoose';

export interface ISegment extends Document {
  name: string;
  description?: string;
  naturalLanguageQuery: string;
  filterDefinition: Record<string, unknown>; // MongoDB match filter
  isDynamic: boolean;
  customerCount: number;
  estimatedRevenue: number;
  createdAt: Date;
  updatedAt: Date;
}

const SegmentSchema = new Schema<ISegment>(
  {
    name: { type: String, required: true },
    description: { type: String },
    naturalLanguageQuery: { type: String, default: '' },
    filterDefinition: { type: Schema.Types.Mixed, required: true },
    isDynamic: { type: Boolean, default: true },
    customerCount: { type: Number, default: 0 },
    estimatedRevenue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Segment = model<ISegment>('Segment', SegmentSchema);
