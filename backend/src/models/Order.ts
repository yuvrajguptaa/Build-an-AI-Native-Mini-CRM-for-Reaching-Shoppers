import { Schema, model, Document, Types } from 'mongoose';

export interface IOrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface IOrder extends Document {
  customerId: Types.ObjectId;
  orderNumber: string;
  amount: number;
  status: 'pending' | 'completed' | 'refunded';
  category: string;
  items: IOrderItem[];
  purchaseDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    orderNumber: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, index: true },
    status: { type: String, enum: ['pending', 'completed', 'refunded'], default: 'completed' },
    category: { type: String, default: 'general' },
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    purchaseDate: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

OrderSchema.index({ customerId: 1, purchaseDate: -1 });

export const Order = model<IOrder>('Order', OrderSchema);
