import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { Role } from '@app/auth/role/role.enum';
import { Roles } from '@app/auth/role/roles.decorator';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { NoCache } from '@app/common/decorator/cache-control.decorator';
import { ok } from '@app/common/helpers/response';
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
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto, UpdateUserRoleDto, UserResponseDto } from './dto/user.dto';
import { UserService } from './user.service';

@ApiTags('User Management')
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'user', version: '1' })
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(Role.SuperAdmin)
  @Get('roles')
  @ApiOkResponse({ description: 'List all available roles', schema: { type: 'array', items: { type: 'string' } } })
  getRoles() {
    return ok(this.userService.getRoles());
  }

  @Roles(Role.SuperAdmin)
  @Get()
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  async findAll() {
    return ok(await this.userService.findAll());
  }

  @Roles(Role.SuperAdmin)
  @Get(':id')
  @ApiOkResponse({ type: UserResponseDto })
  async findOne(@Param('id') id: string) {
    return ok(await this.userService.findOne(id));
  }

  @Roles(Role.SuperAdmin)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ type: UserResponseDto })
  async create(@Body() dto: CreateUserDto) {
    return ok(await this.userService.create(dto));
  }

  @Roles(Role.SuperAdmin)
  @Patch(':id/role')
  @ApiOkResponse({ type: UserResponseDto })
  async updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return ok(await this.userService.updateRole(id, dto.role));
  }

  @Roles(Role.SuperAdmin)
  @Delete(':id')
  @ApiOkResponse({ type: UserResponseDto })
  async remove(@Param('id') id: string) {
    return ok(await this.userService.remove(id));
  }
}
