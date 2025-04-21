// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from './user/user.entity';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthPayloadDto } from './dto/auth.dto';

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

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      token: this.jwtService.sign(payload),
    };
  }

  async updatePassword(username: number, currentPass: string, newPass: string) {
    const user = await this.usersRepo.findOne({ where: { id: username } });
    if (!user || !(await bcrypt.compare(currentPass, user.password))) {
      throw new UnauthorizedException('Invalid current password');
    }
    user.password = await bcrypt.hash(newPass, 10);
    return this.usersRepo.save(user);
  }
}
