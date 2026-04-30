import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getEntityOrNotFound } from '@app/common/helpers/entity.helper';
import { badRequest, paginatedResponse } from '@app/common/helpers/response';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { Product } from '../product/entities/product.entity';
import { Employee } from '../employee/entities/employee.entity';
import { StockEntry, StockEntryType } from './entities/stock-entry.entity';
import { CreateStockEntryDto, StockEntryGetDto } from './dto/stock-entry.dto';

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
    const { page, limit, productBarcode } = query;
    const qb = this.stockEntryRepo
      .createQueryBuilder('se')
      .leftJoinAndSelect('se.product', 'product')
      .leftJoinAndSelect('se.employee', 'employee')
      .orderBy('se.createdAt', 'DESC');

    if (productBarcode) {
      qb.andWhere('se.productBarcode = :productBarcode', { productBarcode });
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
}
