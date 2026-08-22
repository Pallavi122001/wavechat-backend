import express, { Express } from 'express';
import cors from 'cors';
import { apiRateLimiter } from './middlewares/rateLimiter';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import contactsRoutes from './modules/contacts/contacts.routes';
import chatsRoutes from './modules/chats/chats.routes';

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(apiRateLimiter);

app.get('/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'wavechat-backend',
    timestamp: new Date().toISOString(),
  });
});

app.use('/v1/auth', authRoutes);
app.use('/v1/user', userRoutes);
app.use('/v1/contacts', contactsRoutes);
app.use('/v1/chats', chatsRoutes);

app.use(errorHandler);

export default app;
