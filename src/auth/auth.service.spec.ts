import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole, UserStatus } from '@prisma/client';

import { PrismaService } from '@/database/prisma.service';
import { UsersService } from '@/users/users.service';

import { AuthService } from './auth.service';

const user: User = {
  id: 'user_1',
  email: 'ada@example.com',
  passwordHash: '$2b$12$hashed',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: null,
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
};

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'create' | 'findByEmail' | 'findActiveById'>>;
  let prisma: { refreshToken: { create: jest.Mock; update: jest.Mock; updateMany: jest.Mock; findFirst: jest.Mock } };

  beforeEach(() => {
    const config = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'app.jwt.accessSecret': 'access-secret-for-tests-123',
          'app.jwt.refreshSecret': 'refresh-secret-for-tests-123',
          'app.jwt.accessTtl': '15m',
          'app.jwt.refreshTtl': '30d',
        };

        return values[key];
      }),
    } as unknown as ConfigService;
    const jwt = {
      signAsync: jest.fn((payload: { type?: string }) =>
        Promise.resolve(payload.type === 'refresh' ? 'refresh-token' : 'access-token'),
      ),
      verifyAsync: jest.fn(),
    } as unknown as JwtService;

    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'refresh_1' }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn(),
      },
    };
    usersService = {
      create: jest.fn().mockResolvedValue(user),
      findByEmail: jest.fn(),
      findActiveById: jest.fn(),
    };

    authService = new AuthService(
      config,
      jwt,
      prisma as unknown as PrismaService,
      usersService as unknown as UsersService,
    );
  });

  it('registers a user and issues access and refresh tokens', async () => {
    const result = await authService.register({
      email: 'ADA@example.com',
      password: 'Str0ngPassw0rd!',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ADA@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        role: UserRole.USER,
      }),
    );
    expect(usersService.create.mock.calls[0][0].passwordHash).not.toBe('Str0ngPassw0rd!');
    expect(prisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: user.id }) }),
    );
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'refresh_1' },
        data: expect.objectContaining({ tokenHash: expect.any(String) }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        user: expect.objectContaining({ id: user.id, email: user.email }),
      }),
    );
  });

  it('rejects invalid login credentials', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({ email: 'missing@example.com', password: 'bad-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
