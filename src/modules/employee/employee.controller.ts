import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { Role } from '@app/auth/role/role.enum';
import { Roles } from '@app/auth/role/roles.decorator';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { NoCache } from '@app/common/decorator/cache-control.decorator';
import { ApiOkResponsePaginated } from '@app/common/decorator/paginated.decorator';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { EmployeeCreateDto } from './dto/create-employee.dto';
import { EmployeeGetDto } from './dto/get-employee.dto';
import { EmployeeResponseDto } from './dto/response-employee.dto';
import { EmployeeUpdateDto } from './dto/update-emplote.dto';
import { EmployeeService } from './employee.service';

@Controller({ path: 'employee', version: '1' })
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeeController {
  constructor(private readonly employerService: EmployeeService) {}

  @Roles(Role.SuperAdmin)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ type: EmployeeResponseDto, description: 'Create a new employee' })
  async createEmployee(@Body() body: EmployeeCreateDto) {
    return ok(await this.employerService.create(body));
  }

  @Roles('*')
  @Get()
  @ApiOkResponsePaginated(EmployeeResponseDto)
  async getAllEmployees(@Query() query: EmployeeGetDto): Promise<PaginatedResponseDto<EmployeeResponseDto>> {
    return ok(await this.employerService.findAll(query));
  }

  @Roles('*')
  @Get(':id')
  @ApiOkResponse({ type: EmployeeResponseDto, description: 'Get employee by ID' })
  async getEmployeeById(@Param('id') id: string) {
    return ok(await this.employerService.findOne(id));
  }

  @Roles(Role.SuperAdmin)
  @Patch(':id')
  @ApiOkResponse({ type: EmployeeResponseDto, description: 'Update employee by ID' })
  async updateEmployee(@Param('id') id: string, @Body() body: EmployeeUpdateDto) {
    return ok(await this.employerService.update(id, body));
  }

  @Roles(Role.SuperAdmin)
  @Delete(':id')
  @ApiOkResponse({ type: EmployeeResponseDto, description: 'Delete employee by ID' })
  async deleteEmployee(@Param('id') id: string) {
    return ok(await this.employerService.remove(id));
  }
}
