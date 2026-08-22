import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authGuard } from '../../middlewares/authGuard';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', authGuard, AuthController.logout);

export default router;
