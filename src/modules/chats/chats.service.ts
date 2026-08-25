import { ChatThread, ThreadParticipant, Message, User } from '../../models';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors';
import { CreateThreadInput, SendMessageInput } from './chats.validation';

export class ChatsService {
  static async getThreads(userId: string) {
    const participantRecords = await ThreadParticipant.find({ userId }).lean();

    const threadIds = participantRecords.map((p) => p.threadId);

    const threadsDocs = await ChatThread.find({ _id: { $in: threadIds } })
      .sort({ updatedAt: -1 })
      .lean();

    const threads = await Promise.all(
      threadsDocs.map(async (thread) => {
        const currentParticipant = participantRecords.find(
          (p) => p.threadId === thread._id
        );

        const allParticipants = await ThreadParticipant.find({ threadId: thread._id })
          .populate({
            path: 'userId',
            select: '_id name email avatarUrl bio status lastSeenAt',
          })
          .lean();

        let lastMessage = null;
        if (thread.lastMessageId) {
          const msgDoc: any = await Message.findById(thread.lastMessageId)
            .populate({
              path: 'senderId',
              select: '_id name email',
            })
            .lean();

          if (msgDoc) {
            lastMessage = {
              id: msgDoc._id,
              threadId: msgDoc.threadId,
              senderId: msgDoc.senderId?._id || msgDoc.senderId,
              text: msgDoc.text,
              messageType: msgDoc.messageType,
              mediaUrl: msgDoc.mediaUrl,
              status: msgDoc.status,
              createdAt: msgDoc.createdAt,
              sender: typeof msgDoc.senderId === 'object' && msgDoc.senderId !== null
                ? {
                    id: msgDoc.senderId._id,
                    name: msgDoc.senderId.name,
                    email: msgDoc.senderId.email,
                  }
                : null,
            };
          }
        }

        const formattedParticipants = allParticipants.map((p: any) => {
          const userObj = p.userId;
          return {
            id: p._id,
            userId: typeof userObj === 'object' && userObj !== null ? userObj._id : p.userId,
            role: p.role,
            unreadCount: p.unreadCount,
            user: typeof userObj === 'object' && userObj !== null
              ? {
                  id: userObj._id,
                  name: userObj.name,
                  email: userObj.email,
                  avatarUrl: userObj.avatarUrl,
                  bio: userObj.bio,
                  status: userObj.status,
                  lastSeenAt: userObj.lastSeenAt,
                }
              : null,
          };
        });

        return {
          id: thread._id,
          type: thread.type,
          name: thread.name,
          unreadCount: currentParticipant?.unreadCount || 0,
          role: currentParticipant?.role || 'MEMBER',
          lastMessageId: thread.lastMessageId,
          lastMessage,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
          participants: formattedParticipants,
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

      const recipient = await User.findById(recipientId);
      if (!recipient) {
        throw new NotFoundError('Recipient user not found');
      }

      // Find existing DIRECT thread containing both participants
      const currentUserThreads = await ThreadParticipant.find({ userId: currentUserId }).distinct('threadId');
      const recipientThreads = await ThreadParticipant.find({ userId: recipientId }).distinct('threadId');

      const commonThreadIds = currentUserThreads.filter((id) =>
        recipientThreads.includes(id)
      );

      const existingThread = await ChatThread.findOne({
        _id: { $in: commonThreadIds },
        type: 'DIRECT',
      }).lean();

      if (existingThread) {
        let lastMessage = null;
        if (existingThread.lastMessageId) {
          lastMessage = await Message.findById(existingThread.lastMessageId).lean();
        }

        const participants = await ThreadParticipant.find({ threadId: existingThread._id })
          .populate({
            path: 'userId',
            select: '_id name email avatarUrl bio status lastSeenAt',
          })
          .lean();

        return {
          id: existingThread._id,
          type: existingThread.type,
          name: existingThread.name,
          lastMessageId: existingThread.lastMessageId,
          lastMessage: lastMessage ? { ...lastMessage, id: lastMessage._id } : null,
          createdAt: existingThread.createdAt,
          updatedAt: existingThread.updatedAt,
          participants: participants.map((p: any) => ({
            id: p._id,
            userId: p.userId?._id || p.userId,
            role: p.role,
            unreadCount: p.unreadCount,
            user: p.userId
              ? {
                  id: p.userId._id,
                  name: p.userId.name,
                  email: p.userId.email,
                  avatarUrl: p.userId.avatarUrl,
                  bio: p.userId.bio,
                  status: p.userId.status,
                  lastSeenAt: p.userId.lastSeenAt,
                }
              : null,
          })),
        };
      }

      const newThread = await ChatThread.create({
        type: 'DIRECT',
        name: input.name || null,
      });

      await ThreadParticipant.create([
        { threadId: newThread._id, userId: currentUserId, role: 'MEMBER' },
        { threadId: newThread._id, userId: recipientId, role: 'MEMBER' },
      ]);

      const participants = await ThreadParticipant.find({ threadId: newThread._id })
        .populate({
          path: 'userId',
          select: '_id name email avatarUrl bio status lastSeenAt',
        })
        .lean();

      return {
        id: newThread._id,
        type: newThread.type,
        name: newThread.name,
        lastMessageId: null,
        lastMessage: null,
        createdAt: newThread.createdAt,
        updatedAt: newThread.updatedAt,
        participants: participants.map((p: any) => ({
          id: p._id,
          userId: p.userId?._id || p.userId,
          role: p.role,
          unreadCount: p.unreadCount,
          user: p.userId
            ? {
                id: p.userId._id,
                name: p.userId.name,
                email: p.userId.email,
                avatarUrl: p.userId.avatarUrl,
                bio: p.userId.bio,
                status: p.userId.status,
                lastSeenAt: p.userId.lastSeenAt,
              }
            : null,
        })),
      };
    } else {
      const memberIds = Array.from(
        new Set([currentUserId, ...(input.participantUserIds || [])])
      );

      if (memberIds.length < 2) {
        throw new BadRequestError('Group chat must have at least 2 participants');
      }

      const newThread = await ChatThread.create({
        type: 'GROUP',
        name: input.name || 'Group Chat',
      });

      const participantDocs = memberIds.map((uId) => ({
        threadId: newThread._id,
        userId: uId,
        role: uId === currentUserId ? 'ADMIN' : 'MEMBER',
      }));

      await ThreadParticipant.create(participantDocs);

      const participants = await ThreadParticipant.find({ threadId: newThread._id })
        .populate({
          path: 'userId',
          select: '_id name email avatarUrl bio status lastSeenAt',
        })
        .lean();

      return {
        id: newThread._id,
        type: newThread.type,
        name: newThread.name,
        lastMessageId: null,
        lastMessage: null,
        createdAt: newThread.createdAt,
        updatedAt: newThread.updatedAt,
        participants: participants.map((p: any) => ({
          id: p._id,
          userId: p.userId?._id || p.userId,
          role: p.role,
          unreadCount: p.unreadCount,
          user: p.userId
            ? {
                id: p.userId._id,
                name: p.userId.name,
                email: p.userId.email,
                avatarUrl: p.userId.avatarUrl,
                bio: p.userId.bio,
                status: p.userId.status,
                lastSeenAt: p.userId.lastSeenAt,
              }
            : null,
        })),
      };
    }
  }

  static async getThreadById(threadId: string, currentUserId: string) {
    const participant = await ThreadParticipant.findOne({
      threadId,
      userId: currentUserId,
    }).lean();

    if (!participant) {
      throw new ForbiddenError('You are not a participant in this thread');
    }

    const thread = await ChatThread.findById(threadId).lean();
    if (!thread) {
      throw new NotFoundError('Thread not found');
    }

    const participants = await ThreadParticipant.find({ threadId })
      .populate({
        path: 'userId',
        select: '_id name email avatarUrl bio status lastSeenAt',
      })
      .lean();

    let lastMessage = null;
    if (thread.lastMessageId) {
      const msg = await Message.findById(thread.lastMessageId).lean();
      if (msg) {
        lastMessage = { ...msg, id: msg._id };
      }
    }

    return {
      id: thread._id,
      type: thread.type,
      name: thread.name,
      lastMessageId: thread.lastMessageId,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      unreadCount: participant.unreadCount,
      role: participant.role,
      lastMessage,
      participants: participants.map((p: any) => ({
        id: p._id,
        userId: p.userId?._id || p.userId,
        role: p.role,
        unreadCount: p.unreadCount,
        user: p.userId
          ? {
              id: p.userId._id,
              name: p.userId.name,
              email: p.userId.email,
              avatarUrl: p.userId.avatarUrl,
              bio: p.userId.bio,
              status: p.userId.status,
              lastSeenAt: p.userId.lastSeenAt,
            }
          : null,
      })),
    };
  }

  static async markThreadAsRead(threadId: string, currentUserId: string) {
    const participant = await ThreadParticipant.findOne({
      threadId,
      userId: currentUserId,
    });

    if (!participant) {
      throw new ForbiddenError('You are not a participant in this thread');
    }

    participant.unreadCount = 0;
    await participant.save();

    await Message.updateMany(
      {
        threadId,
        senderId: { $ne: currentUserId },
        status: { $ne: 'READ' },
      },
      { status: 'READ' }
    );

    return { success: true, threadId, unreadCount: 0 };
  }

  static async getThreadMessages(
    threadId: string,
    currentUserId: string,
    cursor?: string,
    limit: number = 20
  ) {
    const participant = await ThreadParticipant.findOne({
      threadId,
      userId: currentUserId,
    }).lean();

    if (!participant) {
      throw new ForbiddenError('You are not a participant in this thread');
    }

    const filter: any = { threadId };

    if (cursor) {
      const cursorMessage = await Message.findById(cursor).lean();
      if (cursorMessage) {
        filter.createdAt = { $lt: cursorMessage.createdAt };
      }
    }

    const messagesDocs = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate({
        path: 'senderId',
        select: '_id name email avatarUrl',
      })
      .lean();

    let hasMore = false;
    let nextCursor: string | null = null;

    if (messagesDocs.length > limit) {
      hasMore = true;
      const nextItem = messagesDocs.pop();
      nextCursor = nextItem?._id || null;
    }

    const messages = messagesDocs.map((m: any) => ({
      id: m._id,
      threadId: m.threadId,
      senderId: m.senderId?._id || m.senderId,
      text: m.text,
      messageType: m.messageType,
      mediaUrl: m.mediaUrl,
      status: m.status,
      createdAt: m.createdAt,
      sender: m.senderId
        ? {
            id: m.senderId._id,
            name: m.senderId.name,
            email: m.senderId.email,
            avatarUrl: m.senderId.avatarUrl,
          }
        : null,
    }));

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
    const participant = await ThreadParticipant.findOne({
      threadId,
      userId: senderId,
    }).lean();

    if (!participant) {
      throw new ForbiddenError('You are not a participant in this thread');
    }

    const messageDoc = await Message.create({
      threadId,
      senderId,
      text: input.text || null,
      messageType: input.messageType || 'TEXT',
      mediaUrl: input.mediaUrl || null,
      status: 'SENT',
    });

    await ChatThread.findByIdAndUpdate(threadId, {
      lastMessageId: messageDoc._id,
      updatedAt: new Date(),
    });

    await ThreadParticipant.updateMany(
      {
        threadId,
        userId: { $ne: senderId },
      },
      {
        $inc: { unreadCount: 1 },
      }
    );

    const populatedMsg: any = await Message.findById(messageDoc._id)
      .populate({
        path: 'senderId',
        select: '_id name email avatarUrl',
      })
      .lean();

    return {
      id: populatedMsg._id,
      threadId: populatedMsg.threadId,
      senderId: populatedMsg.senderId?._id || populatedMsg.senderId,
      text: populatedMsg.text,
      messageType: populatedMsg.messageType,
      mediaUrl: populatedMsg.mediaUrl,
      status: populatedMsg.status,
      createdAt: populatedMsg.createdAt,
      sender: populatedMsg.senderId
        ? {
            id: populatedMsg.senderId._id,
            name: populatedMsg.senderId.name,
            email: populatedMsg.senderId.email,
            avatarUrl: populatedMsg.senderId.avatarUrl,
          }
        : null,
    };
  }
}
