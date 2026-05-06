import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { Roles } from '@app/auth/role/roles.decorator';
import { Role } from '@app/auth/role/role.enum';
import { NoCache } from '@app/common/decorator/cache-control.decorator';
import { ok } from '@app/common/helpers/response';
import { TerminalService } from './terminal.service';
import { CreateTerminalDto, UpdateTerminalDto } from './dto/terminal.dto';

@ApiTags('terminal')
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin)
@Controller({ path: 'terminal', version: '1' })
export class TerminalController {
  constructor(private readonly terminalService: TerminalService) {}

  @Get()
  async findAll() {
    return ok(await this.terminalService.findAll());
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return ok(await this.terminalService.findOne(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTerminalDto) {
    return ok(await this.terminalService.create(dto));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTerminalDto) {
    return ok(await this.terminalService.update(id, dto));
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.terminalService.remove(id);
    return ok(null);
  }
}
