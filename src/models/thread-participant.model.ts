import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export type ParticipantRole = 'MEMBER' | 'ADMIN';

export interface IThreadParticipant extends Document<string> {
  _id: string;
  threadId: string;
  userId: string;
  unreadCount: number;
  role: ParticipantRole;
  createdAt: Date;
  updatedAt: Date;
}

const threadParticipantSchema = new Schema<IThreadParticipant>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    threadId: { type: String, required: true, ref: 'ChatThread' },
    userId: { type: String, required: true, ref: 'User' },
    unreadCount: { type: Number, default: 0 },
    role: { type: String, enum: ['MEMBER', 'ADMIN'], default: 'MEMBER' },
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

threadParticipantSchema.index({ threadId: 1, userId: 1 }, { unique: true });

export const ThreadParticipant = mongoose.model<IThreadParticipant>(
  'ThreadParticipant',
  threadParticipantSchema
);
