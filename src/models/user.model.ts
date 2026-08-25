import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export type UserStatus = 'ONLINE' | 'OFFLINE' | 'AWAY';

export interface IUser extends Document<string> {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string | null;
  bio?: string | null;
  status: UserStatus;
  lastSeenAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: null },
    bio: { type: String, default: null },
    status: { type: String, enum: ['ONLINE', 'OFFLINE', 'AWAY'], default: 'OFFLINE' },
    lastSeenAt: { type: Date, default: null },
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

export const User = mongoose.model<IUser>('User', userSchema);
