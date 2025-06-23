import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeCreateDto } from './dto/create-employee.dto';
import { Employee } from './entities/employee.entity';
import { EmployeeUpdateDto } from './dto/update-emplote.dto';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { EmployeeResponseDto } from './dto/response-employee.dto';
import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { Roles } from '@app/auth/role/roles.decorator';
import { Role } from '@app/auth/role/role.enum';
import { ApiOkResponsePaginated } from '@app/common/decorator/paginated.decorator';
import { PaginatedGetAllDto, PaginatedResponseDto } from '@app/common/dto/paginated.dto';

@Controller('employee')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeeController {
  constructor(private readonly employerService: EmployeeService) {}

  @Roles(Role.SuperAdmin)
  @Post()
  @ApiOkResponse({
    type: EmployeeResponseDto,
    description: 'Create a new employee',
  })
  async createEmployee(
    @Body() body: EmployeeCreateDto,
  ): Promise<EmployeeResponseDto> {
    return this.employerService.create(body);
  }

  @Roles('*')
  @Get()
  @ApiOkResponsePaginated(Employee)
  async getAllEmployees(
    @Query() query: PaginatedGetAllDto,
  ): Promise<PaginatedResponseDto<EmployeeResponseDto>> {
    return this.employerService.findAll(query);
  }

  @Roles('*')
  @Get(':id')
  @ApiOkResponse({
    type: EmployeeResponseDto,
    description: 'Get employee by ID',
  })
  async getEmployeeById(@Param('id') id: string): Promise<EmployeeResponseDto> {
    return this.employerService.findOne(id);
  }

  @Roles(Role.SuperAdmin)
  @Patch(':id')
  @ApiOkResponse({
    type: EmployeeResponseDto,
    description: 'Update employee by ID',
  })
  async updateEmployee(
    @Param('id') id: string,
    @Body() body: EmployeeUpdateDto,
  ): Promise<EmployeeResponseDto> {
    return this.employerService.update(id, body);
  }

  @Roles(Role.SuperAdmin)
  @Delete(':id')
  @ApiOkResponse({
    type: EmployeeResponseDto,
    description: 'Delete employee by ID',
  })
  async deleteEmployee(@Param('id') id: string): Promise<EmployeeResponseDto> {
    return this.employerService.remove(id);
  }
}
