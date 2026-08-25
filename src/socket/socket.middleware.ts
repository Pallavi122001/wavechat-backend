import { Socket } from 'socket.io';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    user: TokenPayload;
  };
}

export const verifySocketToken = (socket: Socket, next: (err?: Error) => void) => {
  try {
    const authHeader =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization;

    if (!authHeader) {
      return next(new Error('Authentication error: Token missing'));
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : authHeader;

    const decoded = verifyAccessToken(token);
    socket.data.userId = decoded.userId;
    socket.data.user = decoded;

    next();
  } catch (error: any) {
    console.error('Socket authentication failed:', error.message);
    next(new Error('Authentication error: Invalid or expired token'));
  }
};
