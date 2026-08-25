import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export type ContactStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED';

export interface IContact extends Document<string> {
  _id: string;
  userId: string;
  contactUserId: string;
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    userId: { type: String, required: true, ref: 'User' },
    contactUserId: { type: String, required: true, ref: 'User' },
    status: { type: String, enum: ['PENDING', 'ACCEPTED', 'BLOCKED'], required: true },
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

contactSchema.index({ userId: 1, contactUserId: 1 }, { unique: true });

export const Contact = mongoose.model<IContact>('Contact', contactSchema);
