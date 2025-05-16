import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeCreateDto } from './dto/create-employee.dto';
import { Employee } from './entities/employee.entity';
import { EmployeeUpdateDto } from './dto/update-emplote.dto';

@Controller('employee')
export class EmployeeController {
  constructor(private readonly employerService: EmployeeService) {}

  @Post()
  async createEmployee(@Body() body: EmployeeCreateDto): Promise<Employee> {
    return this.employerService.create(body);
  }

  @Get()
  async getAllEmployees(): Promise<Employee[]> {
    return this.employerService.findAll();
  }

  @Get(':id')
  async getEmployeeById(@Param('id') id: number): Promise<Employee> {
    return this.employerService.findOne(id);
  }

  @Patch(':id')
  async updateEmployee(
    @Param('id') id: number,
    @Body() body: EmployeeUpdateDto,
  ): Promise<Employee> {
    return this.employerService.update(id, body);
  }

  @Delete(':id')
  async deleteEmployee(@Param('id') id: number): Promise<void> {
    return this.employerService.remove(id);
  }
}
