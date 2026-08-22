import { Router } from 'express';
import { ChatsController } from './chats.controller';
import { authGuard } from '../../middlewares/authGuard';

const router = Router();

router.use(authGuard);

router.get('/', ChatsController.getThreads);
router.post('/', ChatsController.createThread);
router.get('/:threadId', ChatsController.getThreadById);
router.patch('/:threadId/read', ChatsController.markAsRead);
router.get('/:threadId/messages', ChatsController.getMessages);
router.post('/:threadId/messages', ChatsController.sendMessage);

export default router;
