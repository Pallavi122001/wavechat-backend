import { Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { successResponse } from '../../utils/response';
import { AuthRequest } from '../../middlewares/authGuard';

export class UserController {
  static async searchUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = (req.query.query as string) || '';
      const currentUserId = req.user!.userId;
      const users = await UserService.searchUsers(query, currentUserId);
      return successResponse(res, users, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
