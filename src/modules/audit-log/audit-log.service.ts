import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction, AuditActorType, AuditLog } from './entities/audit-log.entity';
import { getEntityOrNotFound } from '@app/common/helpers/entity.helper';
import { PaginatedGetAllDto, PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { paginatedResponse } from '@app/common/helpers/response';

export interface CreateAuditLogDto {
  actorType: AuditActorType;
  actorId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    return this.auditLogRepo.save(this.auditLogRepo.create(dto));
  }

  async findAll(query: PaginatedGetAllDto): Promise<PaginatedResponseDto<AuditLog>> {
    const { page, limit } = query;
    const [logs, total] = await this.auditLogRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return paginatedResponse(logs, page, limit, total);
  }

  async findOne(id: string): Promise<AuditLog> {
    return getEntityOrNotFound(this.auditLogRepo, { where: { id } }, `AuditLog ${id}`);
  }
}
