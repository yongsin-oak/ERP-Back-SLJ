import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Terminal } from './terminal.entity';
import { CreateTerminalDto, GetTerminalDto, UpdateTerminalDto } from './dto/terminal.dto';
import { conflict, notFound } from '@app/common/helpers/response';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { applyKeywordSearch, paginateQuery } from '@app/common/helpers/query.helper';

type TerminalView = Omit<Terminal, 'passwordHash' | 'generateId'>;

@Injectable()
export class TerminalService {
  constructor(
    @InjectRepository(Terminal)
    private readonly terminalRepo: Repository<Terminal>,
  ) {}

  async findAll(query: GetTerminalDto): Promise<PaginatedResponseDto<TerminalView>> {
    const { page = 1, limit = 20, search } = query;
    const qb = this.terminalRepo.createQueryBuilder('t').orderBy('t.createdAt', 'DESC');
    applyKeywordSearch(qb, ['t.name', 't.terminalCode'], search);
    // passwordHash is select:false, so it isn't loaded; strip defensively anyway.
    return paginateQuery(qb, page, limit, ({ passwordHash, ...t }) => t);
  }

  async findOne(id: string) {
    const terminal = await this.terminalRepo.findOneBy({ id });
    if (!terminal) throw notFound(`ไม่พบ Terminal ที่ระบุ`);
    const { passwordHash, ...result } = terminal;
    return result;
  }

  async create(dto: CreateTerminalDto) {
    const existing = await this.terminalRepo.findOneBy({ terminalCode: dto.terminalCode });
    if (existing) throw conflict(`รหัส Terminal "${dto.terminalCode}" มีอยู่แล้ว`);
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
    if (!terminal) throw notFound(`ไม่พบ Terminal ที่ระบุ`);

    if (dto.terminalCode && dto.terminalCode !== terminal.terminalCode) {
      const exists = await this.terminalRepo.findOneBy({ terminalCode: dto.terminalCode });
      if (exists) throw conflict(`รหัส Terminal "${dto.terminalCode}" มีอยู่แล้ว`);
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
    if (!terminal) throw notFound(`ไม่พบ Terminal ที่ระบุ`);
    await this.terminalRepo.remove(terminal);
  }
}
