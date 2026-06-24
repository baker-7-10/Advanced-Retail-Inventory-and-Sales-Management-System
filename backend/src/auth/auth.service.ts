import { Injectable, Logger, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { UsersRepository } from '../users/repositories/users.repository';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuditLogService } from '../common/services/audit-log.service';
import { AuditEvent } from '../common/audit/audit-event.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async validateUser(email: string, password: string, ip?: string): Promise<User | null> {
    const user = await this.usersRepository.findByEmailWithPassword(email);

    if (!user) {
      this.auditLogService.log(AuditEvent.LOGIN_FAILED, { email, ip, reason: 'User not found' });
      return null;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      this.auditLogService.log(AuditEvent.ACCOUNT_LOCKED, { userId: user.id, email, ip });
      throw new ForbiddenException('Account temporarily locked');
    }

    if (!user.isActive) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      this.auditLogService.log(AuditEvent.ACCOUNT_LOCKED, { userId: user.id, email, ip });
      }

      await this.usersRepository.save(user);
      this.auditLogService.log(AuditEvent.LOGIN_FAILED, { email, ip, reason: 'Invalid password' });
      return null;
    }

    return user;
  }

  async login(user: User, ip?: string): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
        expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRES_IN', '7d'),
      },
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.hashedRefreshToken = hashedRefreshToken;
    await this.usersRepository.save(user);

    this.auditLogService.log(AuditEvent.LOGIN_SUCCESS, { userId: user.id, email: user.email, ip });

    const response: AuthResponseDto = {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };

    return response;
  }

  async refresh(refreshToken: string, ip?: string): Promise<AuthResponseDto> {
    let payload: { sub: number; email: string };

    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersRepository.findByIdWithPassword(payload.sub);

    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isValid = await bcrypt.compare(refreshToken, user.hashedRefreshToken);

    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const newAccessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
        expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRES_IN', '7d'),
      },
    );

    user.hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await this.usersRepository.save(user);

    this.auditLogService.log(AuditEvent.TOKEN_REFRESHED, { userId: user.id, email: user.email, ip });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async logout(userId: number): Promise<void> {
    const user = await this.usersRepository.findByIdWithPassword(userId);

    if (user) {
      user.hashedRefreshToken = null;
      await this.usersRepository.save(user);
    }
  }

  async getProfile(userId: number) {
    return this.usersRepository.findOneWithSelect(userId, [
      'id', 'name', 'email', 'role', 'createdAt',
    ]);
  }
}
