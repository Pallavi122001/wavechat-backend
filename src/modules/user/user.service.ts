import { prisma } from '../../config/db';

export class UserService {
  static async searchUsers(query: string, currentUserId: string) {
    if (!query || query.trim() === '') {
      return [];
    }

    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        bio: true,
        status: true,
        lastSeenAt: true,
        createdAt: true,
      },
      take: 20,
    });

    return users;
  }
}
