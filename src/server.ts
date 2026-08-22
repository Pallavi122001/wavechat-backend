import app from './app';
import { env } from './config/env';
import { prisma } from './config/db';

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log(`🚀 WaveChat Backend server running on http://localhost:${PORT}/v1`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database disconnected. Process terminated.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
