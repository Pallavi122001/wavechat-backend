import bcrypt from 'bcryptjs';
import { User } from '../../models';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../utils/errors';
import { RegisterInput, LoginInput, RefreshTokenInput } from './auth.validation';

export class AuthService {
  static async register(input: RegisterInput) {
    const existingUser = await User.findOne({ email: input.email.toLowerCase() });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const userDoc = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      avatarUrl: input.avatarUrl || null,
      bio: input.bio || null,
      status: 'ONLINE',
    });

    const user = userDoc.toObject();
    const tokenPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  static async login(input: LoginInput) {
    const userDoc = await User.findOne({ email: input.email.toLowerCase() });

    if (!userDoc) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(input.password, userDoc.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    userDoc.status = 'ONLINE';
    await userDoc.save();

    const user = userDoc.toObject();
    const tokenPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: { ...userWithoutPassword, status: 'ONLINE' },
      accessToken,
      refreshToken,
    };
  }

  static async refreshTokens(input: RefreshTokenInput) {
    let payload;
    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const userDoc = await User.findById(payload.userId);

    if (!userDoc) {
      throw new NotFoundError('User not found');
    }

    const tokenPayload = { userId: userDoc._id, email: userDoc.email };
    const accessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  static async logout(userId: string) {
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        status: 'OFFLINE',
        lastSeenAt: new Date(),
      });
    }
    return { success: true };
  }
}
