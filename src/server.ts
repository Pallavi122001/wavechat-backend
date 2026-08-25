import './config/env';
import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { initSocketServer } from './socket/socket.service';

const PORT = env.PORT;

const httpServer = http.createServer(app);

// Initialize Socket.io Server
initSocketServer(httpServer);

const startServer = async () => {
  await connectDB();
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 WaveChat Backend running:`);
    console.log(`   - Local:   http://localhost:${PORT}/v1`);
    console.log(`   - Network: http://192.168.31.156:${PORT}/v1`);
  });
};

startServer();

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  httpServer.close(async () => {
    await disconnectDB();
    console.log('Database disconnected. Process terminated.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

