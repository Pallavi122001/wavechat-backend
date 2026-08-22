import { Router } from 'express';
import { UserController } from './user.controller';
import { authGuard } from '../../middlewares/authGuard';

const router = Router();

router.use(authGuard);
router.get('/search', UserController.searchUsers);

export default router;
