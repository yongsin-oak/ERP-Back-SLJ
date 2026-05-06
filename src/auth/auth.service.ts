import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from './user/user.entity';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './role/role.enum';
import { Terminal } from '@app/modules/terminal/terminal.entity';
import { Employee } from '@app/modules/employee/entities/employee.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Terminal) private readonly terminalRepo: Repository<Terminal>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
  ) {}

  // ─── User Auth ────────────────────────────────────────────────────────────

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersRepo.findOneBy({ username });
    if (!user) throw new UnauthorizedException('User not found');
    if (!(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid password');
    }
    const { password: _pw, refreshTokenHash: _rth, ...result } = user as any;
    return result;
  }

  async login(user: { id: string; username: string; role: Role }) {
    const token = this.signAccessToken(user);
    const refreshToken = await this.signRefreshToken(user);
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.usersRepo.update({ id: user.id }, { refreshTokenHash: hash });
    return { token, refreshToken, role: user.role, username: user.username };
  }

  async refresh(providedRefreshToken: string) {
    if (!providedRefreshToken) throw new UnauthorizedException('Unauthorized');
    let userId: string;
    try {
      const decoded = this.jwtService.verify(providedRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
      }) as any;
      if (decoded?.type !== 'refresh' || !decoded?.sub) throw new Error();
      userId = decoded.sub;
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user || !user.refreshTokenHash) throw new UnauthorizedException('Unauthorized');
    const isMatch = await bcrypt.compare(providedRefreshToken, user.refreshTokenHash);
    if (!isMatch) throw new UnauthorizedException('Unauthorized');
    const newAccessToken = this.signAccessToken(user);
    const newRefreshToken = await this.signRefreshToken(user);
    const newHash = await bcrypt.hash(newRefreshToken, 10);
    await this.usersRepo.update({ id: user.id }, { refreshTokenHash: newHash });
    return { token: newAccessToken, refreshToken: newRefreshToken };
  }

  async revokeRefreshToken(userId: string) {
    await this.usersRepo.update({ id: userId }, { refreshTokenHash: null });
  }

  async updatePassword(username: string, currentPass: string, newPass: string) {
    const user = await this.usersRepo.findOne({ where: { username } });
    if (!user || !(await bcrypt.compare(currentPass, user.password))) {
      throw new UnauthorizedException('Invalid current password');
    }
    user.password = await bcrypt.hash(newPass, 10);
    return this.usersRepo.save(user);
  }

  // ─── Terminal Auth ─────────────────────────────────────────────────────────

  async validateTerminal(terminalCode: string, password: string) {
    const terminal = await this.terminalRepo.findOneBy({ terminalCode, isActive: true });
    if (!terminal) throw new UnauthorizedException('Terminal not found or inactive');
    const match = await bcrypt.compare(password, terminal.passwordHash);
    if (!match) throw new UnauthorizedException('Invalid terminal credentials');
    return terminal;
  }

  async loginAsTerminal(terminal: Terminal) {
    const payload = {
      sub: terminal.id,
      terminalCode: terminal.terminalCode,
      name: terminal.name,
      role: terminal.role,
      type: 'terminal',
    };
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.TERMINAL_TOKEN_EXPIRES_IN ?? '24h',
    });
    return { token, role: terminal.role, terminalCode: terminal.terminalCode, name: terminal.name };
  }

  // ─── PIN / Actor Token ─────────────────────────────────────────────────────

  async verifyPin(terminalId: string, pin: string, employeeId: string) {
    const employee = await this.employeeRepo
      .createQueryBuilder('e')
      .addSelect('e.pinHash')
      .where('e.id = :id', { id: employeeId })
      .getOne();

    if (!employee || !employee.pinHash) {
      throw new UnauthorizedException('Employee not found or PIN not set');
    }
    const match = await bcrypt.compare(pin, employee.pinHash);
    if (!match) throw new UnauthorizedException('Invalid PIN');

    const expiresInSeconds = this.parseExpiry(process.env.ACTOR_TOKEN_EXPIRES_IN ?? '5m');
    const payload = {
      sub: employee.id,
      employeeId: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      role: employee.department,
      type: 'actor',
      terminalId,
    };
    const actorToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.ACTOR_TOKEN_EXPIRES_IN ?? '5m',
    });
    return {
      actorToken,
      expiresIn: expiresInSeconds,
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        role: employee.department,
      },
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private signAccessToken(user: { id: string; username: string; role: Role }): string {
    const payload = { sub: user.id, username: user.username, role: user.role, type: 'user' };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
    });
  }

  private async signRefreshToken(user: { id: string }): Promise<string> {
    const payload = { sub: user.id, type: 'refresh' };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    });
  }

  /** Converts strings like "5m", "1h", "30s" to seconds */
  private parseExpiry(s: string): number {
    const match = s.match(/^(\d+)([smhd])$/);
    if (!match) return 300;
    const n = parseInt(match[1], 10);
    const unit: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return n * (unit[match[2]] ?? 60);
  }
}
