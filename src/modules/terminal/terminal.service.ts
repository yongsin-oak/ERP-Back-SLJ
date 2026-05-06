import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Terminal } from './terminal.entity';
import { CreateTerminalDto, UpdateTerminalDto } from './dto/terminal.dto';
import { conflict, notFound } from '@app/common/helpers/response';

@Injectable()
export class TerminalService {
  constructor(
    @InjectRepository(Terminal)
    private readonly terminalRepo: Repository<Terminal>,
  ) {}

  async findAll() {
    const terminals = await this.terminalRepo.find({ order: { createdAt: 'DESC' } });
    return terminals.map(({ passwordHash, ...t }) => t);
  }

  async findOne(id: string) {
    const terminal = await this.terminalRepo.findOneBy({ id });
    if (!terminal) throw notFound(`Terminal ${id} not found`);
    const { passwordHash, ...result } = terminal;
    return result;
  }

  async create(dto: CreateTerminalDto) {
    const existing = await this.terminalRepo.findOneBy({ terminalCode: dto.terminalCode });
    if (existing) throw conflict(`Terminal code "${dto.terminalCode}" already exists`);
    const terminal = this.terminalRepo.create({
      terminalCode: dto.terminalCode,
      name: dto.name,
      role: dto.role,
      passwordHash: await bcrypt.hash(dto.password, 10),
      isActive: true,
    });
    const saved = await this.terminalRepo.save(terminal);
    const { passwordHash, ...result } = saved;
    return result;
  }

  async update(id: string, dto: UpdateTerminalDto) {
    const terminal = await this.terminalRepo.findOneBy({ id });
    if (!terminal) throw notFound(`Terminal ${id} not found`);

    if (dto.terminalCode && dto.terminalCode !== terminal.terminalCode) {
      const exists = await this.terminalRepo.findOneBy({ terminalCode: dto.terminalCode });
      if (exists) throw conflict(`Terminal code "${dto.terminalCode}" already exists`);
      terminal.terminalCode = dto.terminalCode;
    }
    if (dto.name !== undefined) terminal.name = dto.name;
    if (dto.role !== undefined) terminal.role = dto.role;
    if (dto.isActive !== undefined) terminal.isActive = dto.isActive;
    if (dto.password) terminal.passwordHash = await bcrypt.hash(dto.password, 10);

    const saved = await this.terminalRepo.save(terminal);
    const { passwordHash, ...result } = saved;
    return result;
  }

  async remove(id: string) {
    const terminal = await this.terminalRepo.findOneBy({ id });
    if (!terminal) throw notFound(`Terminal ${id} not found`);
    await this.terminalRepo.remove(terminal);
  }
}
