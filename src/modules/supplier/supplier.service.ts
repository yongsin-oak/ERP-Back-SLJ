import { Injectable, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { PartialType } from '@nestjs/swagger';
import { getEntityOrNotFound, throwIfEntityExists } from '@app/common/helpers/entity.helper';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { SupplierGetDto } from './dto/get-supplier.dto';
import { DropdownItemDto } from '@app/common/dto/dropdown-item.dto';
import { DROPDOWN_DEFAULT_LIMIT, DropdownQueryDto } from '@app/common/dto/dropdown-query.dto';
import { DropdownResponseDto } from '@app/common/dto/dropdown-response.dto';
import { cursorPaginateQuery } from '@app/common/helpers/cursor.helper';
import { applyKeywordSearch, paginateQuery } from '@app/common/helpers/query.helper';
import {
  assertExportRowLimit,
  ExcelColumn,
  iterateQueryInBatches,
  streamExcel,
} from '@app/common/helpers/excel.helper';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

/** Worksheet tab and download file name for the supplier export. */
const SUPPLIER_EXPORT_NAME = 'ซัพพลายเออร์';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
  ) {}

  async findAll(query: SupplierGetDto): Promise<PaginatedResponseDto<Supplier>> {
    const { page, limit, search } = query;
    const qb = this.supplierRepo.createQueryBuilder('s').orderBy('s.name', 'ASC');
    applyKeywordSearch(qb, ['s.name'], search);
    return paginateQuery(qb, page, limit);
  }

  /**
   * Cursor-paginated options for `SupplierSearchSelect`.
   * Does not filter on `isActive` — same set the picker showed before, so an
   * order still referencing a deactivated supplier keeps resolving.
   */
  async dropdownSearch(query: DropdownQueryDto): Promise<DropdownResponseDto<DropdownItemDto>> {
    const qb = this.supplierRepo.createQueryBuilder('s').select(['s.id', 's.name']);
    applyKeywordSearch(qb, ['s.name'], query.search);
    return cursorPaginateQuery(qb, {
      limit: query.limit ?? DROPDOWN_DEFAULT_LIMIT,
      cursor: query.cursor,
      sortColumn: 's.name',
      idColumn: 's.id',
      map: ({ id, name }) => ({ id, name }),
    });
  }

  async findOne(id: string): Promise<Supplier> {
    return getEntityOrNotFound(this.supplierRepo, { where: { id } }, `ซัพพลายเออร์`);
  }

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    await throwIfEntityExists(this.supplierRepo, { where: { name: dto.name } }, `ซัพพลายเออร์ "${dto.name}"`);
    return this.supplierRepo.save(this.supplierRepo.create(dto));
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await getEntityOrNotFound(this.supplierRepo, { where: { id } }, `ซัพพลายเออร์`);
    if (dto.name && dto.name !== supplier.name) {
      await throwIfEntityExists(this.supplierRepo, { where: { name: dto.name } }, `ซัพพลายเออร์ "${dto.name}"`);
    }
    Object.assign(supplier, dto);
    return this.supplierRepo.save(supplier);
  }

  async remove(id: string): Promise<Supplier> {
    const supplier = await getEntityOrNotFound(this.supplierRepo, { where: { id } }, `ซัพพลายเออร์`);
    await this.supplierRepo.delete(id);
    return supplier;
  }

  async exportAll(search?: string): Promise<StreamableFile> {
    const qb = this.supplierRepo
      .createQueryBuilder('s')
      .orderBy('s.name', 'ASC')
      // Streaming reads the result in pages, so the sort needs a unique
      // tie-breaker or a row can repeat (or vanish) across page boundaries.
      .addOrderBy('s.id', 'ASC');
    applyKeywordSearch(qb, ['s.name', 's.contactName'], search);

    // `search` is optional, so a bare request would otherwise select the whole
    // table. Counting first keeps the refusal a normal JSON error.
    assertExportRowLimit(await qb.getCount());

    const columns: ExcelColumn<Supplier>[] = [
      { header: 'รหัสซัพพลายเออร์', key: 'id', width: 20, getValue: (r) => r.id },
      { header: 'ชื่อบริษัท', key: 'name', width: 28, getValue: (r) => r.name },
      { header: 'ผู้ติดต่อ', key: 'contactName', width: 20, getValue: (r) => r.contactName ?? '' },
      { header: 'เบอร์โทร', key: 'phone', width: 14, getValue: (r) => r.phone ?? '' },
      { header: 'อีเมล', key: 'email', width: 22, getValue: (r) => r.email ?? '' },
      { header: 'เลขผู้เสียภาษี', key: 'taxId', width: 16, getValue: (r) => r.taxId ?? '' },
      { header: 'ที่อยู่', key: 'address', width: 32, getValue: (r) => r.address ?? '' },
    ];

    return streamExcel({
      sheetName: SUPPLIER_EXPORT_NAME,
      filename: SUPPLIER_EXPORT_NAME,
      columns,
      rows: iterateQueryInBatches(qb),
    });
  }
}
