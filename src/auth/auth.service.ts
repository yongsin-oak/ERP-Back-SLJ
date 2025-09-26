// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from './user/user.entity';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthPayloadDto } from './dto/auth.dto';
import { Role } from './role/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  async validateUser({ username, password }: AuthPayloadDto): Promise<any> {
    const user = await this.usersRepo.findOneBy({ username });
    if (!user) throw new UnauthorizedException('User not found');
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, refreshTokenHash, ...result } = user as any;
      return result;
    }
    throw new UnauthorizedException('Invalid password');
  }

  private signAccessToken(user: {
    id: string;
    username: string;
    role: Role;
  }): string {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '1m',
    });
  }

  private async signRefreshToken(user: { id: string }): Promise<string> {
    const payload = { sub: user.id, type: 'refresh' };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    });
  }

  async login(user: { id: string; username: string; role: Role }): Promise<{
    token: string;
    refreshToken: string;
    role: string;
    username: string;
  }> {
    const token = this.signAccessToken(user);
    const refreshToken = await this.signRefreshToken(user);

    const hash = await bcrypt.hash(refreshToken, 10);
    await this.usersRepo.update({ id: user.id }, { refreshTokenHash: hash });

    return {
      token,
      refreshToken,
      role: user.role,
      username: user.username,
    };
  }

  async refresh(
    providedRefreshToken: string,
  ): Promise<{ token: string; refreshToken: string }> {
    if (!providedRefreshToken) {
      throw new UnauthorizedException('Unauthorized');
    }

    // 1) Verify and decode refresh token to get userId (sub) and ensure type is 'refresh'
    let userId: string | undefined;
    try {
      const decoded = this.jwtService.verify(providedRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
      }) as any;
      if (decoded?.type !== 'refresh' || !decoded?.sub) {
        throw new Error('Invalid refresh token');
      }
      userId = decoded.sub as string;
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }

    // 2) Find user and validate stored refresh token hash
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user || !user.refreshTokenHash)
      throw new UnauthorizedException('Unauthorized');

    const isMatch = await bcrypt.compare(
      providedRefreshToken,
      user.refreshTokenHash,
    );
    if (!isMatch) throw new UnauthorizedException('Unauthorized');

    // 3) Issue new tokens
    const newAccessToken = this.signAccessToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });
    const newRefreshToken = await this.signRefreshToken({ id: user.id });

    // 4) Rotate refresh token: store new hash
    const newHash = await bcrypt.hash(newRefreshToken, 10);
    await this.usersRepo.update({ id: user.id }, { refreshTokenHash: newHash });

    return { token: newAccessToken, refreshToken: newRefreshToken };
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.usersRepo.update({ id: userId }, { refreshTokenHash: null });
  }

  async updatePassword(username: string, currentPass: string, newPass: string) {
    const user = await this.usersRepo.findOne({
      where: { username: username },
    });
    if (!user || !(await bcrypt.compare(currentPass, user.password))) {
      throw new UnauthorizedException('Invalid current password');
    }
    user.password = await bcrypt.hash(newPass, 10);
    return this.usersRepo.save(user);
  }
}
