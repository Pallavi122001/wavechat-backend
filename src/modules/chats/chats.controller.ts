import { Response, NextFunction } from 'express';
import { ChatsService } from './chats.service';
import { createThreadSchema, sendMessageSchema, getMessagesQuerySchema } from './chats.validation';
import { successResponse } from '../../utils/response';
import { AuthRequest } from '../../middlewares/authGuard';

export class ChatsController {
  static async getThreads(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const threads = await ChatsService.getThreads(userId);
      return successResponse(res, threads, 'Chat threads retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createThread(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = createThreadSchema.parse(req.body);
      const currentUserId = req.user!.userId;
      const thread = await ChatsService.createOrFindThread(currentUserId, validated);
      return successResponse(res, thread, 'Chat thread created or found', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getThreadById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { threadId } = req.params;
      const currentUserId = req.user!.userId;
      const thread = await ChatsService.getThreadById(threadId, currentUserId);
      return successResponse(res, thread, 'Thread details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { threadId } = req.params;
      const currentUserId = req.user!.userId;
      const result = await ChatsService.markThreadAsRead(threadId, currentUserId);
      return successResponse(res, result, 'Thread marked as read');
    } catch (error) {
      next(error);
    }
  }

  static async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { threadId } = req.params;
      const currentUserId = req.user!.userId;
      const validatedQuery = getMessagesQuerySchema.parse(req.query);
      const result = await ChatsService.getThreadMessages(
        threadId,
        currentUserId,
        validatedQuery.cursor,
        validatedQuery.limit
      );
      return successResponse(res, result, 'Messages retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { threadId } = req.params;
      const currentUserId = req.user!.userId;
      const validated = sendMessageSchema.parse(req.body);
      const message = await ChatsService.sendMessage(threadId, currentUserId, validated);
      return successResponse(res, message, 'Message sent successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}
