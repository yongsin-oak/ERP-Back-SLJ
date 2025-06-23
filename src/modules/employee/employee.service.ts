import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeCreateDto } from './dto/create-employee.dto';
import { EmployeeResponseDto } from './dto/response-employee.dto';
import { EmployeeUpdateDto } from './dto/update-emplote.dto';
import { Employee } from './entities/employee.entity';
import {
  getEntityOrNotFound,
  throwIfEntityExists,
} from '@app/common/helpers/entity.helper';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from '@app/common/dto/paginated.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  async employeeThrowExists(id: string): Promise<void> {
    await throwIfEntityExists(
      this.employeeRepo,
      {
        where: { id },
      },
      `Employee ${id}`,
    );
  }

  async employeeGetEntityOrNotFound(id: string): Promise<EmployeeResponseDto> {
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

  async findOne(id: string): Promise<EmployeeResponseDto> {
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
    const newEmployee = this.employeeRepo.create({
      ...data,
    });
    return this.employeeRepo.save(newEmployee);
  }

  async update(
    id: string,
    data: Partial<EmployeeUpdateDto>,
  ): Promise<EmployeeResponseDto> {
    await this.employeeGetEntityOrNotFound(id);
    await this.employeeRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<EmployeeResponseDto> {
    const employee = await this.employeeGetEntityOrNotFound(id);
    await this.employeeRepo.delete(id);
    return employee;
  }
}
