import { prisma } from '../../config/db';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors';
import { CreateThreadInput, SendMessageInput } from './chats.validation';

export class ChatsService {
  static async getThreads(userId: string) {
    const participantRecords = await prisma.threadParticipant.findMany({
      where: { userId },
      include: {
        thread: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                    bio: true,
                    status: true,
                    lastSeenAt: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        thread: {
          updatedAt: 'desc',
        },
      },
    });

    const threads = await Promise.all(
      participantRecords.map(async (record) => {
        let lastMessage = null;
        if (record.thread.lastMessageId) {
          lastMessage = await prisma.message.findUnique({
            where: { id: record.thread.lastMessageId },
            include: {
              sender: {
                select: { id: true, name: true, email: true },
              },
            },
          });
        }

        return {
          id: record.thread.id,
          type: record.thread.type,
          name: record.thread.name,
          unreadCount: record.unreadCount,
          role: record.role,
          lastMessageId: record.thread.lastMessageId,
          lastMessage,
          createdAt: record.thread.createdAt,
          updatedAt: record.thread.updatedAt,
          participants: record.thread.participants.map((p) => ({
            id: p.id,
            userId: p.userId,
            role: p.role,
            unreadCount: p.unreadCount,
            user: p.user,
          })),
        };
      })
    );

    return threads;
  }

  static async createOrFindThread(currentUserId: string, input: CreateThreadInput) {
    if (input.type === 'DIRECT') {
      const recipientId = input.recipientUserId;
      if (!recipientId) {
        throw new BadRequestError('recipientUserId is required for direct chat');
      }

      if (recipientId === currentUserId) {
        throw new BadRequestError('Cannot start a direct chat with yourself');
      }

      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
      });
      if (!recipient) {
        throw new NotFoundError('Recipient user not found');
      }

      const existingThread = await prisma.chatThread.findFirst({
        where: {
          type: 'DIRECT',
          AND: [
            { participants: { some: { userId: currentUserId } } },
            { participants: { some: { userId: recipientId } } },
          ],
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                  bio: true,
                  status: true,
                  lastSeenAt: true,
                },
              },
            },
          },
        },
      });

      if (existingThread) {
        let lastMessage = null;
        if (existingThread.lastMessageId) {
          lastMessage = await prisma.message.findUnique({
            where: { id: existingThread.lastMessageId },
          });
        }
        return {
          ...existingThread,
          lastMessage,
        };
      }

      const newThread = await prisma.chatThread.create({
        data: {
          type: 'DIRECT',
          name: input.name || null,
          participants: {
            create: [
              { userId: currentUserId, role: 'MEMBER' },
              { userId: recipientId, role: 'MEMBER' },
            ],
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                  bio: true,
                  status: true,
                  lastSeenAt: true,
                },
              },
            },
          },
        },
      });

      return {
        ...newThread,
        lastMessage: null,
      };
    } else {
      const memberIds = Array.from(
        new Set([currentUserId, ...(input.participantUserIds || [])])
      );

      if (memberIds.length < 2) {
        throw new BadRequestError('Group chat must have at least 2 participants');
      }

      const newThread = await prisma.chatThread.create({
        data: {
          type: 'GROUP',
          name: input.name || 'Group Chat',
          participants: {
            create: memberIds.map((userId) => ({
              userId,
              role: userId === currentUserId ? 'ADMIN' : 'MEMBER',
            })),
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                  bio: true,
                  status: true,
                  lastSeenAt: true,
                },
              },
            },
          },
        },
      });

      return {
        ...newThread,
        lastMessage: null,
      };
    }
  }

  static async getThreadById(threadId: string, currentUserId: string) {
    const participant = await prisma.threadParticipant.findUnique({
      where: {
        threadId_userId: { threadId, userId: currentUserId },
      },
    });

    if (!participant) {
      throw new ForbiddenError('You are not a participant in this thread');
    }

    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                bio: true,
                status: true,
                lastSeenAt: true,
              },
            },
          },
        },
      },
    });

    if (!thread) {
      throw new NotFoundError('Thread not found');
    }

    let lastMessage = null;
    if (thread.lastMessageId) {
      lastMessage = await prisma.message.findUnique({
        where: { id: thread.lastMessageId },
      });
    }

    return {
      ...thread,
      unreadCount: participant.unreadCount,
      role: participant.role,
      lastMessage,
    };
  }

  static async markThreadAsRead(threadId: string, currentUserId: string) {
    const participant = await prisma.threadParticipant.findUnique({
      where: {
        threadId_userId: { threadId, userId: currentUserId },
      },
    });

    if (!participant) {
      throw new ForbiddenError('You are not a participant in this thread');
    }

    await prisma.threadParticipant.update({
      where: { id: participant.id },
      data: { unreadCount: 0 },
    });

    await prisma.message.updateMany({
      where: {
        threadId,
        senderId: { not: currentUserId },
        status: { not: 'READ' },
      },
      data: { status: 'READ' },
    });

    return { success: true, threadId, unreadCount: 0 };
  }

  static async getThreadMessages(
    threadId: string,
    currentUserId: string,
    cursor?: string,
    limit: number = 20
  ) {
    const participant = await prisma.threadParticipant.findUnique({
      where: {
        threadId_userId: { threadId, userId: currentUserId },
      },
    });

    if (!participant) {
      throw new ForbiddenError('You are not a participant in this thread');
    }

    const take = limit + 1;
    const queryOptions: any = {
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1;
    }

    const messages = await prisma.message.findMany(queryOptions);

    let hasMore = false;
    let nextCursor: string | null = null;

    if (messages.length > limit) {
      hasMore = true;
      const nextItem = messages.pop();
      nextCursor = nextItem?.id || null;
    }

    return {
      messages,
      nextCursor,
      hasMore,
    };
  }

  static async sendMessage(
    threadId: string,
    senderId: string,
    input: SendMessageInput
  ) {
    const participant = await prisma.threadParticipant.findUnique({
      where: {
        threadId_userId: { threadId, userId: senderId },
      },
    });

    if (!participant) {
      throw new ForbiddenError('You are not a participant in this thread');
    }

    const message = await prisma.message.create({
      data: {
        threadId,
        senderId,
        text: input.text || null,
        messageType: input.messageType || 'TEXT',
        mediaUrl: input.mediaUrl || null,
        status: 'SENT',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    await prisma.chatThread.update({
      where: { id: threadId },
      data: {
        lastMessageId: message.id,
        updatedAt: new Date(),
      },
    });

    await prisma.threadParticipant.updateMany({
      where: {
        threadId,
        userId: { not: senderId },
      },
      data: {
        unreadCount: { increment: 1 },
      },
    });

    return message;
  }
}
