import { z } from 'zod';

export const sendContactRequestSchema = z.object({
  contactUserId: z.string().min(1, 'contactUserId is required'),
});

export type SendContactRequestInput = z.infer<typeof sendContactRequestSchema>;
