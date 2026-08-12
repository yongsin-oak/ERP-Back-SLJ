import { Injectable, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  assertExportRowLimit,
  ExcelColumn,
  iterateQueryInBatches,
  streamExcel,
} from '@app/common/helpers/excel.helper';
import { EmployeeCreateDto } from './dto/create-employee.dto';
import { EmployeeResponseDto } from './dto/response-employee.dto';
import { EmployeeUpdateDto } from './dto/update-emplote.dto';
import { Employee } from './entities/employee.entity';
import { getEntityOrNotFound, throwIfEntityExists } from '@app/common/helpers/entity.helper';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { EmployeeGetDto } from './dto/get-employee.dto';
import { BulkDeleteEmployeeDto } from './dto/bulk-delete-employee.dto';
import { EmployeeDropdownItemDto } from './dto/dropdown-employee.dto';
import { DROPDOWN_DEFAULT_LIMIT, DropdownQueryDto } from '@app/common/dto/dropdown-query.dto';
import { DropdownResponseDto } from '@app/common/dto/dropdown-response.dto';
import { cursorPaginateQuery } from '@app/common/helpers/cursor.helper';
import { conflict, notFound } from '@app/common/helpers/response';
import { applyKeywordSearch, paginateQuery } from '@app/common/helpers/query.helper';

/** Worksheet tab and download file name for the employee export. */
const EMPLOYEE_EXPORT_NAME = 'พนักงาน';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  private async employeeGetEntityOrFail(id: string): Promise<Employee> {
    return getEntityOrNotFound(this.employeeRepo, { where: { id } }, `พนักงาน`);
  }

  async findAll(query: EmployeeGetDto): Promise<PaginatedResponseDto<EmployeeResponseDto>> {
    const { page, limit, search, department, isActive } = query;
    const qb = this.employeeRepo.createQueryBuilder('e');

    applyKeywordSearch(qb, ['e.firstName', 'e.lastName', 'e.nickname'], search);
    if (department) {
      qb.andWhere('e.department = :department', { department });
    }
    if (isActive !== undefined) {
      qb.andWhere('e.isActive = :isActive', { isActive });
    }

    return paginateQuery(qb, page, limit);
  }

  /**
   * Cursor-paginated options for `EmployeeSearchSelect`.
   * Searches all three name parts but orders by `firstName` only — see
   * `EmployeeDropdownItemDto`. No `isActive` filter, matching what the picker
   * showed before this endpoint existed.
   */
  async dropdownSearch(query: DropdownQueryDto): Promise<DropdownResponseDto<EmployeeDropdownItemDto>> {
    const qb = this.employeeRepo
      .createQueryBuilder('e')
      .select(['e.id', 'e.firstName', 'e.lastName', 'e.nickname']);
    applyKeywordSearch(qb, ['e.firstName', 'e.lastName', 'e.nickname'], query.search);
    return cursorPaginateQuery(qb, {
      limit: query.limit ?? DROPDOWN_DEFAULT_LIMIT,
      cursor: query.cursor,
      sortColumn: 'e.firstName',
      idColumn: 'e.id',
      map: ({ id, firstName, lastName, nickname }) => ({ id, firstName, lastName, nickname }),
    });
  }

  async findOne(id: string): Promise<EmployeeResponseDto> {
    return this.employeeGetEntityOrFail(id);
  }

  async create(data: EmployeeCreateDto): Promise<EmployeeResponseDto> {
    await throwIfEntityExists(
      this.employeeRepo,
      { where: [{ firstName: data.firstName, lastName: data.lastName }] },
      `พนักงาน "${data.firstName} ${data.lastName}"`,
    );
    const newEmployee = this.employeeRepo.create(data);
    return this.employeeRepo.save(newEmployee);
  }

  async createMultiple(dtos: EmployeeCreateDto[]): Promise<Employee[]> {
    if (!dtos.length) return [];

    // Check existing (firstName, lastName) pairs in one query instead of per row.
    const existing = await this.employeeRepo.find({
      where: dtos.map((d) => ({ firstName: d.firstName, lastName: d.lastName })),
      select: { firstName: true, lastName: true },
    });
    if (existing.length) {
      const names = existing.map((e) => `"${e.firstName} ${e.lastName}"`).join(', ');
      throw conflict(`พนักงาน ${names} มีอยู่ในระบบแล้ว`);
    }

    return this.employeeRepo.save(dtos.map((dto) => this.employeeRepo.create(dto)));
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
    if (!dto.ids.length) return { deleted: [], errors: [] };

    // One existence check for the whole batch (was a findOne per id).
    const found = await this.employeeRepo.find({ where: { id: In(dto.ids) }, select: { id: true } });
    const existing = new Set(found.map((e) => e.id));

    const errors = dto.ids.filter((id) => !existing.has(id)).map((id) => `ไม่พบพนักงาน (${id})`);
    const deletable = dto.ids.filter((id) => existing.has(id));
    if (!deletable.length) return { deleted: [], errors };

    try {
      await this.employeeRepo.delete({ id: In(deletable) });
    } catch {
      // The per-id loop this replaced reported every failure — missing row or
      // failed delete alike — with this same message; keep that contract.
      errors.push(...deletable.map((id) => `ไม่พบพนักงาน (${id})`));
      return { deleted: [], errors };
    }

    return { deleted: deletable, errors };
  }

  async setPin(id: string, pin: string): Promise<void> {
    const employee = await this.employeeRepo.findOneBy({ id });
    if (!employee) throw notFound(`ไม่พบพนักงาน`);
    employee.pinHash = await bcrypt.hash(pin, 10);
    await this.employeeRepo.save(employee);
  }

  async exportAll(query: Omit<EmployeeGetDto, 'page' | 'limit'>): Promise<StreamableFile> {
    const { search, department, isActive } = query;
    // Ordered by the PK because the export is streamed in pages — an unordered
    // query can repeat or drop a row across page boundaries.
    const qb = this.employeeRepo.createQueryBuilder('e').orderBy('e.id', 'ASC');

    applyKeywordSearch(qb, ['e.firstName', 'e.lastName', 'e.nickname'], search);
    if (department) qb.andWhere('e.department = :department', { department });
    if (isActive !== undefined) qb.andWhere('e.isActive = :isActive', { isActive });

    // Every filter is optional, so a bare request would otherwise select the whole
    // table. Counting first keeps the refusal a normal JSON error.
    assertExportRowLimit(await qb.getCount());

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

    return streamExcel({
      sheetName: EMPLOYEE_EXPORT_NAME,
      filename: EMPLOYEE_EXPORT_NAME,
      columns,
      rows: iterateQueryInBatches(qb),
    });
  }
}
