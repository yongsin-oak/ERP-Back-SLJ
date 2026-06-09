import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { buildExcelBuffer, ExcelColumn } from '@app/common/helpers/excel.helper';
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

  async exportAll(query: Omit<EmployeeGetDto, 'page' | 'limit'>): Promise<Buffer> {
    const { search, department, isActive } = query;
    const qb = this.employeeRepo.createQueryBuilder('e');

    if (search) qb.andWhere('(e.firstName ILIKE :q OR e.lastName ILIKE :q OR e.nickname ILIKE :q)', { q: `%${search}%` });
    if (department) qb.andWhere('e.department = :department', { department });
    if (isActive !== undefined) qb.andWhere('e.isActive = :isActive', { isActive });

    const employees = await qb.getMany();

    const columns: ExcelColumn<Employee>[] = [
      { header: 'รหัสพนักงาน', key: 'id', width: 16, getValue: (r) => r.id },
      { header: 'ชื่อ', key: 'firstName', width: 16, getValue: (r) => r.firstName },
      { header: 'นามสกุล', key: 'lastName', width: 16, getValue: (r) => r.lastName },
      { header: 'ชื่อเล่น', key: 'nickname', width: 12, getValue: (r) => r.nickname },
      { header: 'แผนก', key: 'department', width: 14, getValue: (r) => r.department },
      { header: 'เบอร์โทร', key: 'phoneNumber', width: 14, getValue: (r) => r.phoneNumber ?? '' },
      { header: 'วันที่เริ่มงาน', key: 'startDate', width: 14, getValue: (r) => r.startDate ? new Date(r.startDate).toLocaleDateString('th-TH') : '' },
      { header: 'สถานะ', key: 'isActive', width: 10, getValue: (r) => (r.isActive ? 'ใช้งาน' : 'ปิดใช้งาน') },
    ];

    return buildExcelBuffer('พนักงาน', columns, employees);
  }
}
