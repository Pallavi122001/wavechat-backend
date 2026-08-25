import { z } from 'zod';

export const createThreadSchema = z.object({
  type: z.enum(['DIRECT', 'GROUP']).default('DIRECT'),
  recipientUserId: z.string().optional(),
  participantUserIds: z.array(z.string()).optional(),
  name: z.string().optional().nullable(),
});

export const sendMessageSchema = z.object({
  text: z.string().optional().nullable(),
  messageType: z.enum(['TEXT', 'IMAGE', 'FILE']).default('TEXT'),
  mediaUrl: z.string().optional().nullable().transform((val) => (!val || val.trim() === '' ? null : val)),
}).refine((data) => data.text || data.mediaUrl, {
  message: 'Message must contain either text or mediaUrl',
});

export const getMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).optional().default('20'),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
