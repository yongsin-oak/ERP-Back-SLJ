import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { Role } from '@app/auth/role/role.enum';
import { Roles } from '@app/auth/role/roles.decorator';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { NoCache } from '@app/common/decorator/cache-control.decorator';
import { ApiOkResponsePaginated } from '@app/common/decorator/paginated.decorator';
import { PaginatedGetAllDto, PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { ok } from '@app/common/helpers/response';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { AuditLog } from './entities/audit-log.entity';

@Controller({ path: 'audit-log', version: '1' })
@ApiBearerAuth()
@NoCache()
@Roles(Role.SuperAdmin)
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOkResponsePaginated(AuditLog)
  async getAllLogs(@Query() query: PaginatedGetAllDto): Promise<PaginatedResponseDto<AuditLog>> {
    return ok(await this.auditLogService.findAll(query));
  }

  @Get(':id')
  @ApiOkResponse({ type: AuditLog })
  async getLogById(@Param('id') id: string) {
    return ok(await this.auditLogService.findOne(id));
  }
}
