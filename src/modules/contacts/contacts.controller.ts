import { Response, NextFunction } from 'express';
import { ContactsService } from './contacts.service';
import { sendContactRequestSchema } from './contacts.validation';
import { successResponse } from '../../utils/response';
import { AuthRequest } from '../../middlewares/authGuard';

export class ContactsController {
  static async getContacts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const contacts = await ContactsService.getContacts(userId);
      return successResponse(res, contacts, 'Contacts retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async sendRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = sendContactRequestSchema.parse(req.body);
      const userId = req.user!.userId;
      const contact = await ContactsService.sendRequest(userId, validated.contactUserId);
      return successResponse(res, contact, 'Contact request sent successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async acceptRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const contact = await ContactsService.acceptRequest(userId, id);
      return successResponse(res, contact, 'Contact request accepted successfully');
    } catch (error) {
      next(error);
    }
  }
}
