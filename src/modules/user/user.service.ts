import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '@app/auth/user/user.entity';
import { Role } from '@app/auth/role/role.enum';
import { getEntityOrNotFound, throwIfEntityExists } from '@app/common/helpers/entity.helper';
import { conflict } from '@app/common/helpers/response';
import { CreateUserDto, UserResponseDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private toResponse(user: User): UserResponseDto {
    return { id: user.id, username: user.username, role: user.role };
  }

  getRoles(): Role[] {
    return Object.values(Role);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepo.find({ order: { username: 'ASC' } });
    return users.map((u) => this.toResponse(u));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await getEntityOrNotFound(this.userRepo, { where: { id } }, `User ${id}`);
    return this.toResponse(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.userRepo.findOneBy({ username: dto.username });
    if (existing) throw conflict(`Username ${dto.username} already exists`);

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({ username: dto.username, password: hashed, role: dto.role });
    const saved = await this.userRepo.save(user);
    return this.toResponse(saved);
  }

  async updateRole(id: string, role: Role): Promise<UserResponseDto> {
    const user = await getEntityOrNotFound(this.userRepo, { where: { id } }, `User ${id}`);
    user.role = role;
    const saved = await this.userRepo.save(user);
    return this.toResponse(saved);
  }

  async remove(id: string): Promise<UserResponseDto> {
    const user = await getEntityOrNotFound(this.userRepo, { where: { id } }, `User ${id}`);
    await this.userRepo.remove(user);
    return { id, username: user.username, role: user.role };
  }
}
