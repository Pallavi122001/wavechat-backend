import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface IMessage extends Document<string> {
  _id: string;
  threadId: string;
  senderId: string;
  text?: string | null;
  messageType: MessageType;
  mediaUrl?: string | null;
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    threadId: { type: String, required: true, ref: 'ChatThread' },
    senderId: { type: String, required: true, ref: 'User' },
    text: { type: String, default: null },
    messageType: { type: String, enum: ['TEXT', 'IMAGE', 'FILE'], default: 'TEXT' },
    mediaUrl: { type: String, default: null },
    status: { type: String, enum: ['SENT', 'DELIVERED', 'READ'], default: 'SENT' },
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

messageSchema.index({ threadId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
