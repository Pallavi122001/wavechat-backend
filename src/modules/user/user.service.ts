import { User } from '../../models';

export class UserService {
  static async searchUsers(query?: string, currentUserId?: string) {
    const filter: any = {};

    if (currentUserId) {
      filter._id = { $ne: currentUserId };
    }

    if (query && query.trim() !== '') {
      const regex = new RegExp(query.trim(), 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
      ];
    }

    const users = await User.find(filter)
      .select('_id name email avatarUrl bio status lastSeenAt createdAt')
      .limit(50)
      .lean();

    return users.map((user: any) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      status: user.status,
      lastSeenAt: user.lastSeenAt,
      createdAt: user.createdAt,
    }));
  }
}
