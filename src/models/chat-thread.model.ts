import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export type ThreadType = 'DIRECT' | 'GROUP';

export interface IChatThread extends Document<string> {
  _id: string;
  type: ThreadType;
  name?: string | null;
  lastMessageId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const chatThreadSchema = new Schema<IChatThread>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    type: { type: String, enum: ['DIRECT', 'GROUP'], required: true },
    name: { type: String, default: null },
    lastMessageId: { type: String, default: null, ref: 'Message' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ChatThread = mongoose.model<IChatThread>('ChatThread', chatThreadSchema);
