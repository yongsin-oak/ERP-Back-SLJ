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
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { toStreamableFile } from '@app/common/helpers/excel.helper';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { BulkDeleteEmployeeDto } from './dto/bulk-delete-employee.dto';
import { BulkCreateEmployeeDto } from './dto/bulk-create-employee.dto';
import { EmployeeCreateDto } from './dto/create-employee.dto';
import { EmployeeGetDto } from './dto/get-employee.dto';
import { EmployeeResponseDto } from './dto/response-employee.dto';
import { EmployeeUpdateDto } from './dto/update-emplote.dto';
import { SetPinDto } from './dto/set-pin.dto';
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

  @Roles(Role.SuperAdmin)
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: 'Create multiple employees' })
  async createManyEmployees(@Body() body: BulkCreateEmployeeDto) {
    return ok(await this.employerService.createMultiple(body.employees));
  }

  @Roles('*')
  @Get('export')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportAll(@Query() query: EmployeeGetDto): Promise<StreamableFile> {
    const buffer = await this.employerService.exportAll(query);
    return toStreamableFile(buffer, 'พนักงาน');
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
  @Patch(':id/pin')
  @ApiOkResponse({ description: 'Set employee PIN' })
  async setPin(@Param('id') id: string, @Body() body: SetPinDto) {
    await this.employerService.setPin(id, body.pin);
    return ok(null);
  }

  @Roles(Role.SuperAdmin)
  @Delete('bulk')
  @ApiOkResponse({
    description: 'Delete multiple employees',
    schema: {
      type: 'object',
      properties: {
        deleted: { type: 'array', items: { type: 'string' } },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async deleteManyEmployees(@Body() body: BulkDeleteEmployeeDto) {
    return ok(await this.employerService.bulkDelete(body));
  }

  @Roles(Role.SuperAdmin)
  @Delete(':id')
  @ApiOkResponse({ type: EmployeeResponseDto, description: 'Delete employee by ID' })
  async deleteEmployee(@Param('id') id: string) {
    return ok(await this.employerService.remove(id));
  }
}
