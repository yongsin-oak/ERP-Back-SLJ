import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Not, Repository } from 'typeorm';
import { buildExcelBuffer, ExcelColumn } from '@app/common/helpers/excel.helper';
import { paginateQuery } from '@app/common/helpers/query.helper';
import { badRequest, notFound } from '@app/common/helpers/response';
import { Product } from '../product/entities/product.entity';
import { StockEntry, StockEntryType } from '../stock-entry/entities/stock-entry.entity';
import { StockCount, StockCountStatus } from './entities/stock-count.entity';
import { StockCountItem } from './entities/stock-count-item.entity';
import {
  CreateStockCountDto,
  GetStockCountDto,
  UpdateItemDto,
  UpdateStockCountItemsDto,
} from './dto/stock-count.dto';

/**
 * Rows per statement for the set-based writes below. A whole-catalogue count
 * costs a handful of round-trips instead of one per product, while every
 * generated statement stays far under Postgres' 65535 bind-parameter ceiling
 * (the widest one here binds ~10 parameters per row).
 */
const WRITE_CHUNK_SIZE = 500;

const COUNT_NOT_FOUND = 'ไม่พบรายการนับสต็อก';

function chunk<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  return chunks;
}

/**
 * Collapse repeated barcodes keeping the LAST occurrence — the sequential
 * per-row UPDATE this replaces ended with that value, and a `FROM (VALUES …)`
 * join would otherwise pick an arbitrary duplicate.
 */
function dedupeByBarcode<T extends { productBarcode: string }>(rows: T[]): T[] {
  return [...new Map(rows.map((row) => [row.productBarcode, row])).values()];
}

@Injectable()
export class StockCountService {
  constructor(
    @InjectRepository(StockCount)
    private readonly stockCountRepo: Repository<StockCount>,
    @InjectRepository(StockCountItem)
    private readonly itemRepo: Repository<StockCountItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
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

    // The sheet seeds one row per active product, so this must stay column-lean:
    // full entities would drag four jsonb blobs per product into memory.
    const products = await this.productRepo.find({
      where: { isActive: true },
      select: { barcode: true, remaining: true },
    });
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
      await this.itemRepo.save(items, { chunk: WRITE_CHUNK_SIZE });
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

    if (status) qb.andWhere('sc.status = :status', { status });

    return paginateQuery(qb, page, limit);
  }

  /**
   * Full sheet with the product details the UI and the Excel exports render.
   * Cost grows with the catalogue, so the write paths use the lean loaders below
   * instead — only `GET /stock-count/:id` and the exports need this shape.
   */
  async findOne(id: string): Promise<StockCount> {
    const sc = await this.stockCountRepo.findOne({
      where: { id },
      relations: ['employee', 'items', 'items.product', 'items.product.brand', 'items.product.category'],
    });
    if (!sc) throw notFound(COUNT_NOT_FOUND);
    return sc;
  }

  /** Header only — status/employee checks never need the item sheet. */
  private async findHeaderOrFail(id: string): Promise<StockCount> {
    const sc = await this.stockCountRepo.findOne({ where: { id } });
    if (!sc) throw notFound(COUNT_NOT_FOUND);
    return sc;
  }

  async updateItems(id: string, dto: UpdateStockCountItemsDto) {
    const sc = await this.findHeaderOrFail(id);
    if (sc.status !== StockCountStatus.DRAFT) {
      throw badRequest('ไม่สามารถแก้ไขได้ เนื่องจากการนับสต็อกสิ้นสุดแล้ว');
    }

    const items = dedupeByBarcode(dto.items);
    if (items.length > 0) {
      // All-or-nothing: a sheet that saved half its rows and then failed would be
      // indistinguishable from a genuinely half-counted one.
      await this.dataSource.transaction(async (manager) => {
        for (const slice of chunk(items, WRITE_CHUNK_SIZE)) {
          await this.setCountedQty(manager, id, slice);
        }
      });
    }

    return { success: true };
  }

  async complete(id: string) {
    const sc = await this.findHeaderOrFail(id);
    if (sc.status !== StockCountStatus.DRAFT) {
      throw badRequest('การนับสต็อกนี้สิ้นสุดแล้ว');
    }

    const uncounted = await this.itemRepo.count({
      where: { stockCountId: id, countedQty: IsNull() },
    });
    if (uncounted > 0) {
      throw badRequest(`ยังมี ${uncounted} รายการที่ยังไม่ได้นับ`);
    }

    // The stored diffs and the Completed status describe the same snapshot —
    // they must land together or not at all.
    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(StockCountItem)
        .set({ diff: () => '"countedQty" - "systemQty"' })
        .where('stockCountId = :id', { id })
        .execute();

      await manager.update(StockCount, { id }, {
        status: StockCountStatus.COMPLETED,
        completedAt: new Date(),
      });
    });

    return { success: true };
  }

  async applyAdjustments(id: string) {
    const sc = await this.findHeaderOrFail(id);
    if (sc.status !== StockCountStatus.COMPLETED) {
      throw badRequest('ปรับสต็อกได้เฉพาะรายการที่สิ้นสุดแล้ว');
    }
    if (sc.adjustedAt) {
      throw badRequest('รายการนี้ถูกปรับสต็อกไปแล้ว');
    }

    // Only the columns the write needs. `diff <> 0` also drops never-counted rows
    // (NULL <> 0 is unknown), and the barcode ordering carries over to the locked
    // read below so concurrent runs still take product locks in the same order.
    const diffItems = await this.itemRepo.find({
      where: { stockCountId: id, diff: Not(0) },
      select: { id: true, productBarcode: true, countedQty: true },
      order: { productBarcode: 'ASC' },
    });

    if (diffItems.length === 0) {
      await this.stockCountRepo.update(id, { adjustedAt: new Date() });
      return { success: true, adjusted: 0 };
    }

    const targets = dedupeByBarcode(diffItems);

    // Apply every adjustment + the stock_entry audit rows atomically: a completed
    // count is applied all-or-none. Product rows are still locked (`FOR UPDATE`)
    // because the audit row records the *live* previous balance, which a bare
    // `UPDATE … SET remaining = …` cannot report back.
    await this.dataSource.transaction(async (manager) => {
      const previousRemainingByBarcode = new Map<string, number>();
      for (const slice of chunk(targets, WRITE_CHUNK_SIZE)) {
        // One locked read per chunk instead of one per product. Postgres applies
        // FOR UPDATE above the ORDER BY, so rows are locked barcode-ascending —
        // the deterministic order the per-item loop used to guarantee.
        const locked = await manager.find(Product, {
          where: { barcode: In(slice.map((item) => item.productBarcode)) },
          select: { barcode: true, remaining: true },
          order: { barcode: 'ASC' },
          lock: { mode: 'pessimistic_write' },
        });
        for (const product of locked) {
          previousRemainingByBarcode.set(product.barcode, product.remaining);
        }
      }

      // Products deleted since the sheet was created are skipped, as before.
      const applicable = targets.filter((item) =>
        previousRemainingByBarcode.has(item.productBarcode),
      );

      if (applicable.length > 0) {
        const entries = applicable.map((item) => {
          const previousRemaining = previousRemainingByBarcode.get(item.productBarcode)!;
          const newRemaining = item.countedQty!;
          return manager.create(StockEntry, {
            productBarcode: item.productBarcode,
            type: StockEntryType.ADJUST,
            quantity: newRemaining - previousRemaining,
            previousRemaining,
            newRemaining,
            employeeId: sc.employeeId ?? undefined,
            note: `ปรับจากการนับสต็อก ${id}`,
          });
        });
        await manager.save(entries, { chunk: WRITE_CHUNK_SIZE });

        for (const slice of chunk(applicable, WRITE_CHUNK_SIZE)) {
          await this.setProductRemaining(
            manager,
            slice.map((item) => ({ barcode: item.productBarcode, remaining: item.countedQty! })),
          );
        }
      }

      await manager.update(StockCount, { id }, { adjustedAt: new Date() });
    });

    return { success: true, adjusted: diffItems.length };
  }

  async remove(id: string) {
    const sc = await this.findHeaderOrFail(id);
    if (sc.status !== StockCountStatus.DRAFT) {
      throw badRequest('ไม่สามารถลบได้ เนื่องจากการนับสต็อกสิ้นสุดแล้ว');
    }
    await this.stockCountRepo.delete(id);
    return { success: true };
  }

  /**
   * Write the counted quantities of one chunk in a single statement.
   * `updatedAt` is bumped by hand: raw SQL bypasses @UpdateDateColumn, which the
   * per-row `repo.update()` this replaces maintained.
   */
  private async setCountedQty(
    manager: EntityManager,
    stockCountId: string,
    rows: UpdateItemDto[],
  ): Promise<void> {
    const params: unknown[] = [stockCountId];
    const values = rows
      .map((row, i) => {
        params.push(row.productBarcode, row.countedQty);
        return `($${i * 2 + 2}::varchar, $${i * 2 + 3}::int)`;
      })
      .join(', ');

    await manager.query(
      `UPDATE ${this.itemRepo.metadata.tablePath} AS i
       SET "countedQty" = v.qty, "updatedAt" = CURRENT_TIMESTAMP
       FROM (VALUES ${values}) AS v(barcode, qty)
       WHERE i."stockCountId" = $1 AND i."productBarcode" = v.barcode`,
      params,
    );
  }

  /**
   * Set the balance of one chunk of products in a single statement. The rows are
   * already locked by the calling transaction, so the join cannot race a
   * concurrent writer. `updatedAt` is bumped by hand for the same reason as above.
   */
  private async setProductRemaining(
    manager: EntityManager,
    rows: { barcode: string; remaining: number }[],
  ): Promise<void> {
    const params: unknown[] = [];
    const values = rows
      .map((row, i) => {
        params.push(row.barcode, row.remaining);
        return `($${i * 2 + 1}::varchar, $${i * 2 + 2}::int)`;
      })
      .join(', ');

    await manager.query(
      `UPDATE ${this.productRepo.metadata.tablePath} AS p
       SET "remaining" = v.qty, "updatedAt" = CURRENT_TIMESTAMP
       FROM (VALUES ${values}) AS v(barcode, qty)
       WHERE p."barcode" = v.barcode`,
      params,
    );
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
      throw badRequest('ยังไม่ได้สิ้นสุดการนับสต็อก');
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
