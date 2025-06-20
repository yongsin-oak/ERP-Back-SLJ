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
      const { password, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Invalid password');
  }

  async login(user: {
    id: string;
    username: string;
    role: Role;
  }): Promise<{ token: string; role: string; username: string }> {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      token: this.jwtService.sign(payload),
      role: user.role,
      username: user.username,
    };
  }

  async updatePassword(username: string, currentPass: string, newPass: string) {
    const user = await this.usersRepo.findOne({ where: { username: username } });
    if (!user || !(await bcrypt.compare(currentPass, user.password))) {
      throw new UnauthorizedException('Invalid current password');
    }
    user.password = await bcrypt.hash(newPass, 10);
    return this.usersRepo.save(user);
  }
}
