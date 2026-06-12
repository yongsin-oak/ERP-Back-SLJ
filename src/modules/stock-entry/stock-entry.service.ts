import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { getEntityOrNotFound } from '@app/common/helpers/entity.helper';
import { badRequest, notFound } from '@app/common/helpers/response';
import { applyDateRange, paginateQuery } from '@app/common/helpers/query.helper';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { Product } from '../product/entities/product.entity';
import { Employee } from '../employee/entities/employee.entity';
import { StockEntry, StockEntryType } from './entities/stock-entry.entity';
import {
  BulkAdjustStockEntryDto,
  BulkCreateStockEntryDto,
  CreateStockEntryDto,
  StockEntryGetDto,
} from './dto/stock-entry.dto';
import { buildExcelBuffer, ExcelColumn } from '@app/common/helpers/excel.helper';

/** A single stock-balance mutation to apply atomically against one product. */
interface StockMutation {
  productBarcode: string;
  type: StockEntryType;
  quantity: number;
  costPricePerUnit?: number | null;
  employeeId?: string;
  employee?: Employee | null;
  note?: string;
}

@Injectable()
export class StockEntryService {
  constructor(
    @InjectRepository(StockEntry)
    private readonly stockEntryRepo: Repository<StockEntry>,

    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: StockEntryGetDto): Promise<PaginatedResponseDto<StockEntry>> {
    const { page, limit, productBarcode, type, employeeId, dateFrom, dateTo } = query;
    const qb = this.stockEntryRepo
      .createQueryBuilder('se')
      .leftJoinAndSelect('se.product', 'product')
      .leftJoinAndSelect('se.employee', 'employee')
      .orderBy('se.createdAt', 'DESC');

    if (productBarcode) qb.andWhere('se.productBarcode = :productBarcode', { productBarcode });
    if (type) qb.andWhere('se.type = :type', { type });
    if (employeeId) qb.andWhere('se.employeeId = :employeeId', { employeeId });
    applyDateRange(qb, 'se.createdAt', dateFrom, dateTo);

    return paginateQuery(qb, page, limit);
  }

  async create(dto: CreateStockEntryDto): Promise<StockEntry> {
    const employee = await this.resolveEmployee(dto.employeeId);
    return this.dataSource.transaction((manager) =>
      this.applyStockEntry(manager, {
        productBarcode: dto.productBarcode,
        type: dto.type,
        quantity: dto.quantity,
        costPricePerUnit: dto.costPricePerUnit,
        employeeId: dto.employeeId,
        employee,
        note: dto.note,
      }),
    );
  }

  async createBulk(
    dto: BulkCreateStockEntryDto,
  ): Promise<{ created: StockEntry[]; errors: string[] }> {
    const employee = await this.resolveEmployee(dto.employeeId);
    return this.applyManyIndependently(
      dto.entries.map((item) => ({
        productBarcode: item.productBarcode,
        type: item.type,
        quantity: item.quantity,
        costPricePerUnit: item.costPricePerUnit,
        employeeId: dto.employeeId,
        employee,
        note: dto.note,
      })),
    );
  }

  async createBulkAdjust(
    dto: BulkAdjustStockEntryDto,
  ): Promise<{ created: StockEntry[]; errors: string[] }> {
    const employee = await this.resolveEmployee(dto.employeeId);
    return this.applyManyIndependently(
      dto.adjustments.map((item) => ({
        productBarcode: item.productBarcode,
        type: StockEntryType.ADJUST,
        quantity: item.actualQuantity,
        employeeId: dto.employeeId,
        employee,
        note: dto.note,
      })),
    );
  }

  /**
   * Apply each mutation in its own transaction so one bad item doesn't roll back
   * the rest — matching the per-item error-collection contract of the bulk
   * endpoints. Only one product row is locked per transaction, so there is no
   * cross-row deadlock window.
   */
  private async applyManyIndependently(
    mutations: StockMutation[],
  ): Promise<{ created: StockEntry[]; errors: string[] }> {
    const created: StockEntry[] = [];
    const errors: string[] = [];
    for (const mutation of mutations) {
      try {
        created.push(
          await this.dataSource.transaction((manager) => this.applyStockEntry(manager, mutation)),
        );
      } catch (err) {
        errors.push(`${mutation.productBarcode}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return { created, errors };
  }

  /**
   * Single source of truth for a stock mutation. Locks the product row
   * (`SELECT … FOR UPDATE`), computes the new balance, then writes the product
   * update and the stock_entry audit row in the same transaction. The lock
   * serialises concurrent writers on the same product, closing both the
   * partial-write desync and the lost-update race. Must run inside a
   * transaction (`dataSource.transaction`); the locked read stays join-free.
   */
  private async applyStockEntry(manager: EntityManager, m: StockMutation): Promise<StockEntry> {
    const product = await manager.findOne(Product, {
      where: { barcode: m.productBarcode },
      lock: { mode: 'pessimistic_write' },
    });
    if (!product) throw notFound(`ไม่พบสินค้า "${m.productBarcode}"`);

    const previousRemaining = product.remaining;
    const newRemaining = this.computeNewRemaining(m.type, m.quantity, previousRemaining);

    await manager.update(Product, { barcode: m.productBarcode }, { remaining: newRemaining });

    const entry = manager.create(StockEntry, {
      productBarcode: m.productBarcode,
      product,
      type: m.type,
      quantity: m.quantity,
      previousRemaining,
      newRemaining,
      costPricePerUnit: m.costPricePerUnit ?? null,
      employeeId: m.employeeId,
      employee: m.employee ?? null,
      note: m.note,
    });
    return manager.save(entry);
  }

  private computeNewRemaining(type: StockEntryType, quantity: number, previous: number): number {
    switch (type) {
      case StockEntryType.IN:
      case StockEntryType.RETURN:
        return previous + quantity;
      case StockEntryType.ADJUST:
        return quantity;
      case StockEntryType.DAMAGE: {
        const next = previous - quantity;
        if (next < 0) throw badRequest(`สต็อกไม่เพียงพอ (มี ${previous} ชิ้น)`);
        return next;
      }
      default:
        throw badRequest('ประเภทการเคลื่อนไหวสต็อกไม่ถูกต้อง');
    }
  }

  private resolveEmployee(employeeId?: string): Promise<Employee | null> {
    if (!employeeId) return Promise.resolve(null);
    return getEntityOrNotFound(this.employeeRepo, { where: { id: employeeId } }, `Employee ${employeeId}`);
  }

  async exportAll(query: Omit<StockEntryGetDto, 'page' | 'limit'>): Promise<Buffer> {
    const { productBarcode, type, employeeId, dateFrom, dateTo } = query;
    const qb = this.stockEntryRepo
      .createQueryBuilder('se')
      .leftJoinAndSelect('se.product', 'product')
      .leftJoinAndSelect('se.employee', 'employee')
      .orderBy('se.createdAt', 'DESC');

    if (productBarcode) qb.andWhere('se.productBarcode = :productBarcode', { productBarcode });
    if (type) qb.andWhere('se.type = :type', { type });
    if (employeeId) qb.andWhere('se.employeeId = :employeeId', { employeeId });
    applyDateRange(qb, 'se.createdAt', dateFrom, dateTo);

    const entries = await qb.getMany();

    const columns: ExcelColumn<StockEntry>[] = [
      { header: 'รหัสรายการ', key: 'id', width: 28, getValue: (r) => r.id },
      { header: 'Barcode', key: 'barcode', width: 18, getValue: (r) => r.productBarcode },
      { header: 'ชื่อสินค้า', key: 'productName', width: 28, getValue: (r) => r.product?.name ?? '' },
      { header: 'ประเภท', key: 'type', width: 12, getValue: (r) => r.type },
      { header: 'จำนวน', key: 'quantity', width: 10, getValue: (r) => r.quantity },
      { header: 'สต็อกก่อน', key: 'previousRemaining', width: 12, getValue: (r) => r.previousRemaining },
      { header: 'สต็อกหลัง', key: 'newRemaining', width: 12, getValue: (r) => r.newRemaining },
      { header: 'ราคาทุน/หน่วย', key: 'costPricePerUnit', width: 14, getValue: (r) => r.costPricePerUnit ?? '' },
      { header: 'พนักงาน', key: 'employee', width: 20, getValue: (r) => r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '' },
      { header: 'หมายเหตุ', key: 'note', width: 24, getValue: (r) => r.note ?? '' },
      { header: 'วันที่บันทึก', key: 'createdAt', width: 20, getValue: (r) => new Date(r.createdAt).toLocaleString('th-TH') },
    ];

    return buildExcelBuffer('รับเข้า/ปรับสต็อก', columns, entries);
  }
}
