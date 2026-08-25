import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export type Platform = 'ANDROID' | 'IOS';

export interface IDeviceToken extends Document<string> {
  _id: string;
  userId: string;
  fcmToken: string;
  platform: Platform;
  createdAt: Date;
  updatedAt: Date;
}

const deviceTokenSchema = new Schema<IDeviceToken>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    userId: { type: String, required: true, ref: 'User' },
    fcmToken: { type: String, required: true },
    platform: { type: String, enum: ['ANDROID', 'IOS'], required: true },
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

export const DeviceToken = mongoose.model<IDeviceToken>('DeviceToken', deviceTokenSchema);
