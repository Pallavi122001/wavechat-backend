import { Server, Socket } from 'socket.io';
import { User, ThreadParticipant, ChatThread } from '../models';
import { ChatsService } from '../modules/chats/chats.service';

export const registerSocketHandlers = async (io: Server, socket: Socket) => {
  const userId = socket.data.userId;

  console.log(`🔌 User connected to socket: ${userId} (Socket ID: ${socket.id})`);

  // Join personal user room for direct notifications
  socket.join(`user:${userId}`);

  // 1. Update User Status to ONLINE
  try {
    await User.findByIdAndUpdate(userId, { status: 'ONLINE' });
    io.emit('user_status_changed', {
      userId,
      status: 'ONLINE',
    });
  } catch (err: any) {
    console.error(`Failed to update online status for user ${userId}:`, err.message);
  }

  // 2. Room Management
  socket.on('join_thread', async ({ threadId }: { threadId: string }) => {
    try {
      if (!threadId) return;

      // Verify participant
      const participant = await ThreadParticipant.findOne({ threadId, userId }).lean();

      if (participant) {
        socket.join(`thread:${threadId}`);
        console.log(`User ${userId} joined room thread:${threadId}`);
      } else {
        socket.emit('error', { message: 'Not a participant in this thread' });
      }
    } catch (err: any) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('leave_thread', ({ threadId }: { threadId: string }) => {
    if (threadId) {
      socket.leave(`thread:${threadId}`);
      console.log(`User ${userId} left room thread:${threadId}`);
    }
  });

  // 3. Real-time Message Event
  socket.on(
    'send_message',
    async (
      payload: {
        threadId: string;
        text?: string;
        messageType?: 'TEXT' | 'IMAGE' | 'FILE';
        mediaUrl?: string;
      },
      callback?: (response: any) => void
    ) => {
      try {
        const { threadId, text, messageType, mediaUrl } = payload;
        if (!threadId) {
          throw new Error('threadId is required');
        }

        const message = await ChatsService.sendMessage(threadId, userId, {
          text: text || null,
          messageType: messageType || 'TEXT',
          mediaUrl: mediaUrl || null,
        });

        // Broadcast to thread room
        io.to(`thread:${threadId}`).emit('new_message', message);

        // Fetch thread participants to notify their individual user rooms (for unread count updates)
        const participantUserIds = await ThreadParticipant.find({ threadId }).distinct('userId');

        participantUserIds.forEach((pUserId) => {
          if (pUserId !== userId) {
            io.to(`user:${pUserId}`).emit('thread_updated', {
              threadId,
              lastMessage: message,
            });
          }
        });

        if (callback) {
          callback({ success: true, message });
        }
      } catch (err: any) {
        console.error('Error handling send_message socket event:', err.message);
        socket.emit('error', { message: err.message });
        if (callback) {
          callback({ success: false, error: err.message });
        }
      }
    }
  );

  // 4. Typing Indicators
  socket.on('typing_start', ({ threadId }: { threadId: string }) => {
    if (threadId) {
      socket.to(`thread:${threadId}`).emit('user_typing', {
        threadId,
        userId,
        isTyping: true,
      });
    }
  });

  socket.on('typing_stop', ({ threadId }: { threadId: string }) => {
    if (threadId) {
      socket.to(`thread:${threadId}`).emit('user_typing', {
        threadId,
        userId,
        isTyping: false,
      });
    }
  });

  // 5. Mark Messages Read Receipt
  socket.on('mark_read', async ({ threadId }: { threadId: string }) => {
    try {
      if (!threadId) return;

      const result = await ChatsService.markThreadAsRead(threadId, userId);
      io.to(`thread:${threadId}`).emit('messages_read', {
        threadId,
        userId,
      });

      // Update user room about read status
      socket.emit('thread_read_updated', result);
    } catch (err: any) {
      socket.emit('error', { message: err.message });
    }
  });

  // 6. Handle Disconnect
  socket.on('disconnect', async (reason) => {
    console.log(`❌ User disconnected: ${userId} (Reason: ${reason})`);

    try {
      const now = new Date();
      await User.findByIdAndUpdate(userId, {
        status: 'OFFLINE',
        lastSeenAt: now,
      });

      io.emit('user_status_changed', {
        userId,
        status: 'OFFLINE',
        lastSeenAt: now.toISOString(),
      });
    } catch (err: any) {
      console.error(`Failed to update offline status for user ${userId}:`, err.message);
    }
  });
};
