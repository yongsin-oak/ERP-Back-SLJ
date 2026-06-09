import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildExcelBuffer, ExcelColumn } from '@app/common/helpers/excel.helper';
import { Product } from '../product/entities/product.entity';
import { StockCount, StockCountStatus } from './entities/stock-count.entity';
import { StockCountItem } from './entities/stock-count-item.entity';
import {
  CreateStockCountDto,
  GetStockCountDto,
  UpdateStockCountItemsDto,
} from './dto/stock-count.dto';

@Injectable()
export class StockCountService {
  constructor(
    @InjectRepository(StockCount)
    private readonly stockCountRepo: Repository<StockCount>,
    @InjectRepository(StockCountItem)
    private readonly itemRepo: Repository<StockCountItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(dto: CreateStockCountDto): Promise<StockCount> {
    const countDate = new Date().toISOString().split('T')[0];
    const stockCount = this.stockCountRepo.create({
      countDate,
      status: StockCountStatus.DRAFT,
      note: dto.note,
      employeeId: dto.employeeId,
    });
    const saved = await this.stockCountRepo.save(stockCount);

    const products = await this.productRepo.find({ where: { isActive: true } });
    if (products.length > 0) {
      const items = products.map((p) =>
        this.itemRepo.create({
          stockCountId: saved.id,
          productBarcode: p.barcode,
          systemQty: p.remaining,
          countedQty: null,
          diff: null,
        }),
      );
      await this.itemRepo.save(items);
    }

    return saved;
  }

  async findAll(query: GetStockCountDto) {
    const { page = 1, limit = 20, status } = query;
    const qb = this.stockCountRepo
      .createQueryBuilder('sc')
      .leftJoinAndSelect('sc.employee', 'employee')
      .loadRelationCountAndMap('sc.totalItems', 'sc.items')
      .loadRelationCountAndMap('sc.countedItems', 'sc.items', 'item', (qb) =>
        qb.where('item.countedQty IS NOT NULL'),
      )
      .orderBy('sc.createdAt', 'DESC');

    if (status) {
      qb.andWhere('sc.status = :status', { status });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, pagination: { total, page, limit } };
  }

  async findOne(id: string): Promise<StockCount> {
    const sc = await this.stockCountRepo.findOne({
      where: { id },
      relations: ['employee', 'items', 'items.product', 'items.product.brand', 'items.product.category'],
    });
    if (!sc) throw new NotFoundException('ไม่พบรายการนับสต็อก');
    return sc;
  }

  async updateItems(id: string, dto: UpdateStockCountItemsDto) {
    const sc = await this.stockCountRepo.findOne({ where: { id } });
    if (!sc) throw new NotFoundException('ไม่พบรายการนับสต็อก');
    if (sc.status !== StockCountStatus.DRAFT) {
      throw new BadRequestException('ไม่สามารถแก้ไขได้ เนื่องจากการนับสต็อกสิ้นสุดแล้ว');
    }

    for (const item of dto.items) {
      await this.itemRepo.update(
        { stockCountId: id, productBarcode: item.productBarcode },
        { countedQty: item.countedQty },
      );
    }

    return { success: true };
  }

  async complete(id: string) {
    const sc = await this.findOne(id);
    if (sc.status !== StockCountStatus.DRAFT) {
      throw new BadRequestException('การนับสต็อกนี้สิ้นสุดแล้ว');
    }

    const uncounted = sc.items.filter((i) => i.countedQty == null);
    if (uncounted.length > 0) {
      throw new BadRequestException(`ยังมี ${uncounted.length} รายการที่ยังไม่ได้นับ`);
    }

    await this.itemRepo
      .createQueryBuilder()
      .update(StockCountItem)
      .set({ diff: () => '"countedQty" - "systemQty"' })
      .where('stockCountId = :id', { id })
      .execute();

    await this.stockCountRepo.update(id, {
      status: StockCountStatus.COMPLETED,
      completedAt: new Date(),
    });

    return { success: true };
  }

  async remove(id: string) {
    const sc = await this.stockCountRepo.findOne({ where: { id } });
    if (!sc) throw new NotFoundException('ไม่พบรายการนับสต็อก');
    if (sc.status !== StockCountStatus.DRAFT) {
      throw new BadRequestException('ไม่สามารถลบได้ เนื่องจากการนับสต็อกสิ้นสุดแล้ว');
    }
    await this.stockCountRepo.delete(id);
    return { success: true };
  }

  async exportBlank(id: string): Promise<Buffer> {
    const sc = await this.findOne(id);

    const columns: ExcelColumn<StockCountItem>[] = [
      { header: 'Barcode', key: 'barcode', width: 20, getValue: (r) => r.productBarcode },
      { header: 'ชื่อสินค้า', key: 'name', width: 35, getValue: (r) => r.product?.name ?? '' },
      { header: 'หมวดหมู่', key: 'category', width: 18, getValue: (r) => r.product?.category?.name ?? '' },
      { header: 'แบรนด์', key: 'brand', width: 18, getValue: (r) => r.product?.brand?.name ?? '' },
      { header: 'จำนวนที่นับได้', key: 'countedQty', width: 16, getValue: () => '' },
    ];

    return buildExcelBuffer(`นับสต็อก-${sc.id}`, columns, sc.items);
  }

  async exportResult(id: string): Promise<Buffer> {
    const sc = await this.findOne(id);
    if (sc.status !== StockCountStatus.COMPLETED) {
      throw new BadRequestException('ยังไม่ได้สิ้นสุดการนับสต็อก');
    }

    const columns: ExcelColumn<StockCountItem>[] = [
      { header: 'Barcode', key: 'barcode', width: 20, getValue: (r) => r.productBarcode },
      { header: 'ชื่อสินค้า', key: 'name', width: 35, getValue: (r) => r.product?.name ?? '' },
      { header: 'หมวดหมู่', key: 'category', width: 18, getValue: (r) => r.product?.category?.name ?? '' },
      { header: 'แบรนด์', key: 'brand', width: 18, getValue: (r) => r.product?.brand?.name ?? '' },
      { header: 'ระบบ (ก่อนนับ)', key: 'systemQty', width: 16, getValue: (r) => r.systemQty },
      { header: 'ที่นับได้', key: 'countedQty', width: 14, getValue: (r) => r.countedQty ?? 0 },
      { header: 'ส่วนต่าง', key: 'diff', width: 12, getValue: (r) => r.diff ?? 0 },
    ];

    return buildExcelBuffer(`ผลนับสต็อก-${sc.id}`, columns, sc.items);
  }
}
