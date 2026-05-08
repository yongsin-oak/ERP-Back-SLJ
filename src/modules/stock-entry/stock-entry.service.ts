import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getEntityOrNotFound } from '@app/common/helpers/entity.helper';
import { badRequest, paginatedResponse } from '@app/common/helpers/response';
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

@Injectable()
export class StockEntryService {
  constructor(
    @InjectRepository(StockEntry)
    private readonly stockEntryRepo: Repository<StockEntry>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  async findAll(query: StockEntryGetDto): Promise<PaginatedResponseDto<StockEntry>> {
    const { page, limit, productBarcode, type, employeeId, dateFrom, dateTo } = query;
    const qb = this.stockEntryRepo
      .createQueryBuilder('se')
      .leftJoinAndSelect('se.product', 'product')
      .leftJoinAndSelect('se.employee', 'employee')
      .orderBy('se.createdAt', 'DESC');

    if (productBarcode) {
      qb.andWhere('se.productBarcode = :productBarcode', { productBarcode });
    }
    if (type) {
      qb.andWhere('se.type = :type', { type });
    }
    if (employeeId) {
      qb.andWhere('se.employeeId = :employeeId', { employeeId });
    }
    if (dateFrom) {
      qb.andWhere('se.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }
    if (dateTo) {
      qb.andWhere('se.createdAt <= :dateTo', { dateTo: new Date(dateTo) });
    }

    const [entries, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return paginatedResponse(entries, page, limit, total);
  }

  async create(dto: CreateStockEntryDto): Promise<StockEntry> {
    const product = await getEntityOrNotFound(
      this.productRepo,
      { where: { barcode: dto.productBarcode } },
      `Product ${dto.productBarcode}`,
    );

    let employee: Employee | null = null;
    if (dto.employeeId) {
      employee = await getEntityOrNotFound(
        this.employeeRepo,
        { where: { id: dto.employeeId } },
        `Employee ${dto.employeeId}`,
      );
    }

    const previousRemaining = product.remaining;
    let newRemaining: number;

    switch (dto.type) {
      case StockEntryType.IN:
      case StockEntryType.RETURN:
        newRemaining = previousRemaining + dto.quantity;
        break;
      case StockEntryType.ADJUST:
        newRemaining = dto.quantity;
        break;
      default:
        throw badRequest(`Unknown stock entry type: ${dto.type}`);
    }

    await this.productRepo.update({ barcode: dto.productBarcode }, { remaining: newRemaining });

    const entry = this.stockEntryRepo.create({
      productBarcode: dto.productBarcode,
      product,
      type: dto.type,
      quantity: dto.quantity,
      previousRemaining,
      newRemaining,
      employeeId: dto.employeeId,
      employee,
      note: dto.note,
    });

    return this.stockEntryRepo.save(entry);
  }

  async createBulk(
    dto: BulkCreateStockEntryDto,
  ): Promise<{ created: StockEntry[]; errors: string[] }> {
    const created: StockEntry[] = [];
    const errors: string[] = [];

    let employee: Employee | null = null;
    if (dto.employeeId) {
      employee = await getEntityOrNotFound(
        this.employeeRepo,
        { where: { id: dto.employeeId } },
        `Employee ${dto.employeeId}`,
      );
    }

    for (const item of dto.entries) {
      try {
        const product = await getEntityOrNotFound(
          this.productRepo,
          { where: { barcode: item.productBarcode } },
          `Product ${item.productBarcode}`,
        );
        const previousRemaining = product.remaining;
        let newRemaining: number;
        switch (item.type) {
          case StockEntryType.IN:
          case StockEntryType.RETURN:
            newRemaining = previousRemaining + item.quantity;
            break;
          case StockEntryType.ADJUST:
            newRemaining = item.quantity;
            break;
          default:
            throw badRequest(`Unknown type: ${item.type}`);
        }
        await this.productRepo.update({ barcode: item.productBarcode }, { remaining: newRemaining });
        const entry = this.stockEntryRepo.create({
          productBarcode: item.productBarcode,
          product,
          type: item.type,
          quantity: item.quantity,
          previousRemaining,
          newRemaining,
          employeeId: dto.employeeId,
          employee,
          note: dto.note,
        });
        created.push(await this.stockEntryRepo.save(entry));
      } catch (err) {
        errors.push(`${item.productBarcode}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { created, errors };
  }

  async createBulkAdjust(
    dto: BulkAdjustStockEntryDto,
  ): Promise<{ created: StockEntry[]; errors: string[] }> {
    const created: StockEntry[] = [];
    const errors: string[] = [];

    let employee: Employee | null = null;
    if (dto.employeeId) {
      employee = await getEntityOrNotFound(
        this.employeeRepo,
        { where: { id: dto.employeeId } },
        `Employee ${dto.employeeId}`,
      );
    }

    for (const item of dto.adjustments) {
      try {
        const product = await getEntityOrNotFound(
          this.productRepo,
          { where: { barcode: item.productBarcode } },
          `Product ${item.productBarcode}`,
        );
        const previousRemaining = product.remaining;
        const newRemaining = item.actualQuantity;
        await this.productRepo.update({ barcode: item.productBarcode }, { remaining: newRemaining });
        const entry = this.stockEntryRepo.create({
          productBarcode: item.productBarcode,
          product,
          type: StockEntryType.ADJUST,
          quantity: item.actualQuantity,
          previousRemaining,
          newRemaining,
          employeeId: dto.employeeId,
          employee,
          note: dto.note,
        });
        created.push(await this.stockEntryRepo.save(entry));
      } catch (err) {
        errors.push(`${item.productBarcode}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { created, errors };
  }
}
