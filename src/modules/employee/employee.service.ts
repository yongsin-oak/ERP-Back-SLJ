import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { EmployeeCreateDto } from './dto/create-employee.dto';
import { EmployeeResponseDto } from './dto/response-employee.dto';
import { EmployeeUpdateDto } from './dto/update-emplote.dto';
import { Employee } from './entities/employee.entity';
import { getEntityOrNotFound, throwIfEntityExists } from '@app/common/helpers/entity.helper';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { EmployeeGetDto } from './dto/get-employee.dto';
import { BulkDeleteEmployeeDto } from './dto/bulk-delete-employee.dto';
import { paginatedResponse, notFound } from '@app/common/helpers/response';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  private async employeeGetEntityOrFail(id: string): Promise<Employee> {
    return getEntityOrNotFound(this.employeeRepo, { where: { id } }, `Employee ${id}`);
  }

  async findAll(query: EmployeeGetDto): Promise<PaginatedResponseDto<EmployeeResponseDto>> {
    const { page, limit, search, department, isActive } = query;
    const qb = this.employeeRepo.createQueryBuilder('e');

    if (search) {
      qb.andWhere(
        '(e.firstName ILIKE :q OR e.lastName ILIKE :q OR e.nickname ILIKE :q)',
        { q: `%${search}%` },
      );
    }
    if (department) {
      qb.andWhere('e.department = :department', { department });
    }
    if (isActive !== undefined) {
      qb.andWhere('e.isActive = :isActive', { isActive });
    }

    const [employees, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return paginatedResponse(employees, page, limit, total);
  }

  async findOne(id: string): Promise<EmployeeResponseDto> {
    return this.employeeGetEntityOrFail(id);
  }

  async create(data: EmployeeCreateDto): Promise<EmployeeResponseDto> {
    await throwIfEntityExists(
      this.employeeRepo,
      { where: [{ firstName: data.firstName, lastName: data.lastName }] },
      `Employee "${data.firstName} ${data.lastName}"`,
    );
    const newEmployee = this.employeeRepo.create(data);
    return this.employeeRepo.save(newEmployee);
  }

  async createMultiple(dtos: EmployeeCreateDto[]): Promise<Employee[]> {
    if (!dtos.length) return [];
    const employees: Employee[] = [];
    for (const dto of dtos) {
      await throwIfEntityExists(
        this.employeeRepo,
        { where: [{ firstName: dto.firstName, lastName: dto.lastName }] },
        `Employee "${dto.firstName} ${dto.lastName}"`,
      );
      employees.push(this.employeeRepo.create(dto));
    }
    return this.employeeRepo.save(employees);
  }

  async update(id: string, data: Partial<EmployeeUpdateDto>): Promise<EmployeeResponseDto> {
    await this.employeeGetEntityOrFail(id);
    await this.employeeRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<EmployeeResponseDto> {
    const employee = await this.employeeGetEntityOrFail(id);
    await this.employeeRepo.delete(id);
    return employee;
  }

  async bulkDelete(dto: BulkDeleteEmployeeDto): Promise<{ deleted: string[]; errors: string[] }> {
    const deleted: string[] = [];
    const errors: string[] = [];

    for (const id of dto.ids) {
      try {
        await this.employeeGetEntityOrFail(id);
        await this.employeeRepo.delete(id);
        deleted.push(id);
      } catch {
        errors.push(`Employee ${id} not found`);
      }
    }

    return { deleted, errors };
  }

  async setPin(id: string, pin: string): Promise<void> {
    const employee = await this.employeeRepo.findOneBy({ id });
    if (!employee) throw notFound(`Employee ${id} not found`);
    employee.pinHash = await bcrypt.hash(pin, 10);
    await this.employeeRepo.save(employee);
  }
}
