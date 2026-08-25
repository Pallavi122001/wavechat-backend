import { Server as HTTPServer } from 'http';
import { Server, ServerOptions } from 'socket.io';
import { verifySocketToken } from './socket.middleware';
import { registerSocketHandlers } from './socket.handler';

let io: Server | null = null;

export const initSocketServer = (httpServer: HTTPServer): Server => {
  const options: Partial<ServerOptions> = {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  };

  io = new Server(httpServer, options);

  // Authentication Middleware
  io.use(verifySocketToken);

  // Register Event Handlers
  io.on('connection', (socket) => {
    registerSocketHandlers(io!, socket);
  });

  console.log('⚡ Socket.io server initialized successfully');
  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet!');
  }
  return io;
};
