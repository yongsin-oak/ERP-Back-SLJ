import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { EmployeeCreateDto } from './dto/create-employee.dto';
import {
  getEntityOrNotFound,
  throwIfEntityExists,
} from 'src/common/helpers/entity.helper';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from 'src/common/dto/paginated.dto';
import { EmployeeResponseDto } from './dto/response-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  async employeeThrowExists(id: number): Promise<void> {
    await throwIfEntityExists(
      this.employeeRepo,
      {
        where: { id },
      },
      `Employee ${id}`,
    );
  }

  async employeeGetEntityOrNotFound(id: number): Promise<EmployeeResponseDto> {
    return await getEntityOrNotFound(
      this.employeeRepo,
      { where: { id } },
      `Employee ${id}`,
    );
  }

  async findAll(
    query: PaginatedGetAllDto,
  ): Promise<PaginatedResponseDto<EmployeeResponseDto>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const take = limit;
    const [employee, total] = await this.employeeRepo.findAndCount({
      skip,
      take,
    });
    return {
      data: employee,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<EmployeeResponseDto> {
    return this.employeeGetEntityOrNotFound(id);
  }

  async create(data: EmployeeCreateDto): Promise<EmployeeResponseDto> {
    await throwIfEntityExists(
      this.employeeRepo,
      {
        where: [{ firstName: data.firstName, lastName: data.lastName }],
      },
      `Employee with name ${data.firstName} ${data.lastName}`,
    );
    const { startDate } = data;
    const newEmployee = this.employeeRepo.create({
      ...data,
      startDate: startDate ? new Date(`${startDate}T09:00:00`) : null,
    });
    return this.employeeRepo.save(newEmployee);
  }

  async update(id: number, data: Partial<Employee>): Promise<EmployeeResponseDto> {
    await this.employeeGetEntityOrNotFound(id);
    await this.employeeRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<EmployeeResponseDto> {
    const employee = await this.employeeGetEntityOrNotFound(id);
    await this.employeeRepo.delete(id);
    return employee;
  }
}
