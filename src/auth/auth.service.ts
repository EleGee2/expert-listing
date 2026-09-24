import { createHash, randomUUID } from 'node:crypto';

import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { User, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { PrismaService } from '@/database/prisma.service';
import { UsersService } from '@/users/users.service';
import { serializeUser } from '@/users/users.serializer';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AccessTokenPayload, RefreshTokenPayload } from './types/jwt-payload';

const PASSWORD_SALT_ROUNDS = 12;
type JwtExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role ?? UserRole.USER,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.assertUserCanAuthenticate(user);

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        id: payload.jti,
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    this.assertUserCanAuthenticate(storedToken.user);

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.buildAuthResponse(storedToken.user);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return { message: 'Logged out successfully' };
  }

  async validateAccessToken(accessToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(accessToken, {
        secret: this.config.getOrThrow<string>('app.jwt.accessSecret'),
      });
      const user = await this.usersService.findActiveById(payload.sub);

      this.assertUserCanAuthenticate(user);

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid access token');
    }
  }

  private async buildAuthResponse(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.issueRefreshToken(user),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      user: serializeUser(user),
    };
  }

  private signAccessToken(user: User): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('app.jwt.accessSecret'),
      expiresIn: this.config.getOrThrow<string>('app.jwt.accessTtl') as JwtExpiresIn,
    });
  }

  private async issueRefreshToken(user: User): Promise<string> {
    const expiresAt = new Date(Date.now() + this.parseDurationMs(this.config.getOrThrow<string>('app.jwt.refreshTtl')));
    const storedToken = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: `pending:${randomUUID()}`,
        expiresAt,
      },
    });
    const payload: RefreshTokenPayload = {
      sub: user.id,
      jti: storedToken.id,
      type: 'refresh',
    };
    const token = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('app.jwt.refreshSecret'),
      expiresIn: this.config.getOrThrow<string>('app.jwt.refreshTtl') as JwtExpiresIn,
    });

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { tokenHash: this.hashToken(token) },
    });

    return token;
  }

  private async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('app.jwt.refreshSecret'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private assertUserCanAuthenticate(user: Pick<User, 'status'>) {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('User account is not active');
    }
  }

  private parseDurationMs(value: string): number {
    const match = /^(\d+)(ms|s|m|h|d)$/.exec(value);

    if (!match) {
      throw new Error(`Unsupported duration format: ${value}`);
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return amount * multipliers[unit];
  }
}
