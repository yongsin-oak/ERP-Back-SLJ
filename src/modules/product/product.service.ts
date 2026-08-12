import { Injectable, OnModuleInit, StreamableFile } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CheckExistProductDto } from './dto/check-exist-product.dto';
import { ProductCreateDto } from './dto/create-product.dto';
import { ProductDropdownItemDto, ProductDropdownSearchDto } from './dto/dropdown-search-product.dto';
import { ProductRefDto } from './dto/ref-product.dto';
import { ProductResponseDto } from './dto/response.dto';
import { CreateShopPriceDto, UpdateShopPriceDto } from './dto/shop-price.dto';
import { ProductShopPrice } from './entities/product-shop-price.entity';
import { Product } from './entities/product.entity';
import { getEntityOrNotFound, throwIfEntityExists } from '@app/common/helpers/entity.helper';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { BulkUpdateProductDto, BulkUpdateProductItemDto } from './dto/bulk-update-product.dto';
import { BulkDeleteProductDto } from './dto/bulk-delete-product.dto';
import { ProductUpdateDto } from './dto/update-product.dto';
import { Brand } from '../brand/entities/brand.entity';
import { Category } from '../category/entities/category.entity';
import { badRequest, conflict, notFound } from '@app/common/helpers/response';
import { applyKeywordSearch, applySmartMatch, paginateQuery } from '@app/common/helpers/query.helper';
import { DROPDOWN_DEFAULT_LIMIT } from '@app/common/dto/dropdown-query.dto';
import { DropdownResponseDto } from '@app/common/dto/dropdown-response.dto';
import { cursorPaginateQuery } from '@app/common/helpers/cursor.helper';
import {
  assertExportRowLimit,
  ExcelColumn,
  iterateQueryInBatches,
  streamExcel,
} from '@app/common/helpers/excel.helper';
import { ProductGetDto } from './dto/get-product.dto';

/** Worksheet tab and download file name for the product export. */
const PRODUCT_EXPORT_NAME = 'สินค้า';

@Injectable()
export class ProductService implements OnModuleInit {
  /** Whether pg_trgm is installed — gates fuzzy search (set once at startup). */
  private trigramEnabled = false;

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,

    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,

    @InjectRepository(ProductShopPrice)
    private readonly shopPriceRepo: Repository<ProductShopPrice>,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    // Fuzzy search needs pg_trgm. In dev we provision it automatically (consistent
    // with synchronize:true); in prod it's a deploy step. Either way we only
    // *detect* it here and degrade to substring search when absent — never 500.
    if (process.env.NODE_ENV !== 'production') {
      try {
        await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        await this.dataSource.query(
          'CREATE INDEX IF NOT EXISTS product_name_trgm_idx ON product USING gin (name gin_trgm_ops)',
        );
      } catch {
        // best-effort in dev; missing privilege just means no fuzzy search
      }
    }
    try {
      const rows = await this.dataSource.query("SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'");
      this.trigramEnabled = Array.isArray(rows) && rows.length > 0;
    } catch {
      this.trigramEnabled = false;
    }
  }

  private async productGetEntityOrFail(barcode: string): Promise<Product> {
    return getEntityOrNotFound(this.productRepo, { where: { barcode } }, `สินค้า (${barcode})`);
  }

  private async productThrowIfExists(barcode: string): Promise<void> {
    await throwIfEntityExists(this.productRepo, { where: { barcode } }, `บาร์โค้ด "${barcode}"`);
  }

  async create(data: ProductCreateDto): Promise<Product> {
    await this.productThrowIfExists(data.barcode);
    const newProduct = this.productRepo.create(data);
    return this.productRepo.save(newProduct);
  }

  /**
   * แปลงรายชื่อ (แบรนด์/หมวดหมู่) → id แบบ find-or-create:
   * ชื่อที่มีอยู่แล้ว map ไปหา id เดิม, ชื่อใหม่สร้างให้อัตโนมัติ
   * คืน Map ที่ key = ชื่อ (trim + lowercase) → id
   */
  private async resolveNamesToIds<T extends { id: string; name: string }>(
    repo: Repository<T>,
    rawNames: (string | undefined | null)[],
  ): Promise<Map<string, string>> {
    const names = [...new Set(rawNames.map((n) => n?.trim()).filter(Boolean) as string[])];
    const map = new Map<string, string>();
    if (!names.length) return map;

    const existing = await repo.find({ where: { name: In(names) } as never });
    for (const e of existing) map.set(e.name.trim().toLowerCase(), e.id);

    const missing = names.filter((n) => !map.has(n.toLowerCase()));
    for (const name of missing) {
      const saved = await repo.save(repo.create({ name } as never));
      map.set(name.toLowerCase(), (saved as unknown as T).id);
    }
    return map;
  }

  /**
   * Bulk create สำหรับ import — partial success:
   * - แบรนด์/หมวดหมู่ส่งมาเป็น "ชื่อ" ได้ (brandName/categoryName) → find-or-create
   * - barcode ที่ซ้ำในระบบหรือซ้ำกันเองในไฟล์ จะถูก "ข้าม" และรายงานใน errors (ไม่ล้มทั้งชุด)
   * - แถวที่บันทึกไม่สำเร็จ (เช่น sku ซ้ำ) ถูกเก็บใน errors รายแถว
   */
  async createMultiple(
    dtos: ProductCreateDto[],
  ): Promise<{ created: Product[]; errors: string[] }> {
    if (!dtos.length) return { created: [], errors: [] };

    const errors: string[] = [];

    // resolve ชื่อ → id ทีเดียวแบบ batch (find-or-create)
    const brandMap = await this.resolveNamesToIds(this.brandRepo, dtos.map((d) => d.brandName));
    const categoryMap = await this.resolveNamesToIds(this.categoryRepo, dtos.map((d) => d.categoryName));

    // ตรวจ FK id ที่ส่งมาตรงๆ (ไม่ผ่านชื่อ) ว่ามีจริง
    const brandIds = [...new Set(dtos.map((d) => d.brandId).filter(Boolean) as string[])];
    if (brandIds.length) {
      const found = await this.brandRepo.count({ where: { id: In(brandIds) } });
      if (found !== brandIds.length) throw badRequest(`ไม่พบแบรนด์ที่เลือก`);
    }
    const categoryIds = [...new Set(dtos.map((d) => d.categoryId).filter(Boolean) as string[])];
    if (categoryIds.length) {
      const found = await this.categoryRepo.count({ where: { id: In(categoryIds) } });
      if (found !== categoryIds.length) throw badRequest(`ไม่พบหมวดหมู่ที่เลือก`);
    }

    const existing = new Set(
      (
        await this.productRepo.find({
          where: { barcode: In(dtos.map((d) => d.barcode)) },
          select: { barcode: true },
        })
      ).map((p) => p.barcode),
    );

    const seen = new Set<string>();
    const created: Product[] = [];

    for (const dto of dtos) {
      if (existing.has(dto.barcode)) {
        errors.push(`บาร์โค้ด "${dto.barcode}" มีอยู่ในระบบแล้ว — ข้าม`);
        continue;
      }
      if (seen.has(dto.barcode)) {
        errors.push(`บาร์โค้ด "${dto.barcode}" ซ้ำในไฟล์ — ข้าม`);
        continue;
      }
      seen.add(dto.barcode);

      const { brandName, categoryName, ...rest } = dto;
      try {
        const entity = this.productRepo.create({
          ...rest,
          brandId: brandName ? brandMap.get(brandName.trim().toLowerCase()) : rest.brandId,
          categoryId: categoryName ? categoryMap.get(categoryName.trim().toLowerCase()) : rest.categoryId,
        });
        created.push(await this.productRepo.save(entity));
      } catch (e) {
        errors.push(`บาร์โค้ด "${dto.barcode}": ${(e as Error)?.message ?? 'บันทึกไม่สำเร็จ'}`);
      }
    }

    return { created, errors };
  }

  async findAll(query: ProductGetDto): Promise<PaginatedResponseDto<ProductResponseDto>> {
    const { page, limit, search, brandId, categoryId, isActive, lowStock } = query;
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.brand', 'brand')
      .leftJoinAndSelect('p.category', 'category')
      .orderBy('p.barcode', 'ASC');

    applyKeywordSearch(qb, ['p.name', 'p.barcode'], search);
    if (brandId) qb.andWhere('p.brandId = :brandId', { brandId });
    if (categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId });
    if (isActive !== undefined) qb.andWhere('p.isActive = :isActive', { isActive });
    if (lowStock) {
      qb.andWhere('(p.remaining = 0 OR (p.minStock IS NOT NULL AND p.remaining <= p.minStock))');
    }

    return paginateQuery(qb, page, limit);
  }

  async findOne(barcode: string): Promise<Product> {
    return getEntityOrNotFound(
      this.productRepo,
      { where: { barcode }, relations: ['brand', 'category'] },
      `สินค้า (${barcode})`,
    );
  }

  /**
   * Barcode lookup for order scanning — the hot path (operators scan all day).
   * Returns barcode + name only and skips the brand/category joins findOne() does:
   * the order-entry screen shows no price, stock, brand or category.
   */
  async findOneRef(barcode: string): Promise<ProductRefDto> {
    const product = await this.productRepo.findOne({
      where: { barcode },
      select: { barcode: true, name: true },
    });
    if (!product) throw notFound(`ไม่พบสินค้า (${barcode})`);
    return product;
  }

  async update(barcode: string, dto: ProductCreateDto | Partial<ProductCreateDto>): Promise<Product> {
    const product = await this.productGetEntityOrFail(barcode);
    await this.productRepo.update(barcode, dto);
    return product;
  }

  async remove(barcode: string): Promise<Product> {
    const product = await this.productGetEntityOrFail(barcode);
    await this.productRepo.remove(product);
    return product;
  }

  async bulkUpdate(bulkUpdateDto: BulkUpdateProductDto): Promise<Product[]> {
    const barcodes = bulkUpdateDto.products.map((p) => p.barcode);

    // Validate existence in one query instead of one per row.
    const existing = await this.productRepo.find({ where: { barcode: In(barcodes) }, select: { barcode: true } });
    const existingSet = new Set(existing.map((p) => p.barcode));
    const missing = barcodes.filter((b) => !existingSet.has(b));
    if (missing.length) {
      throw badRequest(`อัปเดตสินค้าไม่สำเร็จ: ${missing.map((b) => `ไม่พบสินค้า "${b}"`).join(', ')}`);
    }

    // Rows carrying different patches still need their own UPDATE, but they must
    // land together: a mid-batch failure used to leave half the batch applied.
    // Rows sharing an identical patch collapse into one UPDATE ... barcode IN (...).
    const groups = this.groupIdenticalPatches(bulkUpdateDto.products);
    await this.dataSource.transaction(async (manager) => {
      for (const group of groups) {
        await manager.update(Product, { barcode: In(group.barcodes) }, group.data);
      }
    });

    const updated = await this.productRepo.find({
      where: { barcode: In(barcodes) },
      relations: ['brand', 'category'],
    });
    const byBarcode = new Map(updated.map((p) => [p.barcode, p]));
    return barcodes.map((b) => byBarcode.get(b)).filter((p): p is Product => p !== undefined);
  }

  /**
   * Collapse rows whose patch is identical into a single UPDATE.
   *
   * The signature sorts keys so property order can't split a group, and tags
   * `undefined` apart from `null` because TypeORM skips the former and writes
   * NULL for the latter — merging them would change what is written.
   *
   * Grouping is skipped when a barcode is repeated in the batch: it reorders the
   * UPDATEs, and with two patches for the same barcode that would change which
   * one wins. Then each row keeps its own UPDATE, in the order it was sent.
   */
  private groupIdenticalPatches(
    items: BulkUpdateProductItemDto[],
  ): { barcodes: string[]; data: ProductUpdateDto }[] {
    const barcodes = items.map((i) => i.barcode);
    if (new Set(barcodes).size !== barcodes.length) {
      return items.map((item) => ({ barcodes: [item.barcode], data: item.data }));
    }

    const groups = new Map<string, { barcodes: string[]; data: ProductUpdateDto }>();
    for (const item of items) {
      const signature = JSON.stringify(
        Object.entries(item.data ?? {})
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([key, value]) => [key, value === undefined ? 0 : 1, value ?? null]),
      );
      const group = groups.get(signature);
      if (group) group.barcodes.push(item.barcode);
      else groups.set(signature, { barcodes: [item.barcode], data: item.data });
    }
    return [...groups.values()];
  }

  /**
   * Cursor-paginated options for `ProductSearchSelect`.
   *
   * Matching stays smart (multi-token + pg_trgm typo tolerance), but the result
   * is ordered by name, not by relevance: a keyset cursor can only resume from a
   * sort it can encode, and the relevance CASE/similarity expression is not one.
   * Barcode-exact hits therefore appear in the list, just not pinned to the top —
   * scanning a barcode goes through `ScanInput` → `/product/:barcode/ref`, which
   * is the flow that actually depends on exact-match priority.
   */
  async dropdownSearch(dto: ProductDropdownSearchDto): Promise<DropdownResponseDto<ProductDropdownItemDto>> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .select(['p.barcode', 'p.name', 'p.remaining', 'p.sellPrice', 'p.costPrice']);

    applySmartMatch(qb, ['p.barcode', 'p.name'], dto.search, { fuzzy: this.trigramEnabled });

    return cursorPaginateQuery<Product, ProductDropdownItemDto>(qb, {
      limit: dto.limit ?? DROPDOWN_DEFAULT_LIMIT,
      cursor: dto.cursor,
      sortColumn: 'p.name',
      idColumn: 'p.barcode',
      map: ({ barcode, name, remaining, sellPrice, costPrice }) => ({
        barcode,
        name,
        remaining,
        sellPrice,
        costPrice,
      }),
    });
  }

  async checkExist(dto: CheckExistProductDto): Promise<{ existing: string[]; missing: string[] }> {
    if (!dto.barcodes.length) return { existing: [], missing: [] };

    const found = await this.productRepo.find({ where: { barcode: In(dto.barcodes) }, select: { barcode: true } });
    const existing = found.map((p) => p.barcode);
    const existingSet = new Set(existing);
    const missing = dto.barcodes.filter((b) => !existingSet.has(b));

    return { existing, missing };
  }

  async bulkDelete(bulkDeleteDto: BulkDeleteProductDto): Promise<{ deleted: Product[]; errors: string[] }> {
    const { barcodes } = bulkDeleteDto;
    if (!barcodes.length) return { deleted: [], errors: [] };

    // One lookup for the whole batch (was a findOne per barcode). Full rows, not
    // just the barcode, because they are echoed back as `deleted`.
    const found = await this.productRepo.find({ where: { barcode: In(barcodes) } });
    const byBarcode = new Map(found.map((p) => [p.barcode, p]));

    const errors = barcodes.filter((b) => !byBarcode.has(b)).map((b) => `ไม่พบสินค้า "${b}"`);
    if (errors.length) return { deleted: [], errors };

    // Single DELETE — one failure (e.g. an order still references the product)
    // now rolls back the whole batch instead of leaving it half deleted.
    try {
      await this.productRepo.delete({ barcode: In(barcodes) });
    } catch (error) {
      return {
        deleted: [],
        errors: [`ลบสินค้าไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`],
      };
    }

    const deleted = barcodes.map((b) => byBarcode.get(b)).filter((p): p is Product => p !== undefined);
    return { deleted, errors };
  }

  async getShopPrices(barcode: string): Promise<ProductShopPrice[]> {
    await this.productGetEntityOrFail(barcode);
    return this.shopPriceRepo.find({ where: { productBarcode: barcode } });
  }

  async createShopPrice(barcode: string, dto: CreateShopPriceDto): Promise<ProductShopPrice> {
    await this.productGetEntityOrFail(barcode);
    const existing = await this.shopPriceRepo.findOne({
      where: { productBarcode: barcode, shopId: dto.shopId },
    });
    if (existing) throw conflict(`มีราคาร้านค้านี้อยู่แล้ว`);
    const entry = this.shopPriceRepo.create({
      productBarcode: barcode,
      shopId: dto.shopId,
      sellPrice: dto.sellPrice,
      costPrice: dto.costPrice,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
    });
    return this.shopPriceRepo.save(entry);
  }

  async updateShopPrice(barcode: string, shopId: string, dto: UpdateShopPriceDto): Promise<ProductShopPrice> {
    const entry = await this.shopPriceRepo.findOne({ where: { productBarcode: barcode, shopId } });
    if (!entry) throw notFound(`ไม่พบราคาร้านค้าที่ระบุ`);
    if (dto.sellPrice !== undefined) entry.sellPrice = dto.sellPrice;
    if (dto.costPrice !== undefined) entry.costPrice = dto.costPrice;
    if (dto.effectiveFrom !== undefined) entry.effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : null;
    if (dto.effectiveTo !== undefined) entry.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    return this.shopPriceRepo.save(entry);
  }

  async deleteShopPrice(barcode: string, shopId: string): Promise<ProductShopPrice> {
    const entry = await this.shopPriceRepo.findOne({ where: { productBarcode: barcode, shopId } });
    if (!entry) throw notFound(`ไม่พบราคาร้านค้าที่ระบุ`);
    const snapshot = { ...entry } as ProductShopPrice;
    await this.shopPriceRepo.remove(entry);
    snapshot.productBarcode = barcode;
    snapshot.shopId = shopId;
    return snapshot;
  }

  async exportAll(query: Omit<ProductGetDto, 'page' | 'limit'>): Promise<StreamableFile> {
    const { search, brandId, categoryId, isActive } = query;
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.brand', 'brand')
      .leftJoinAndSelect('p.category', 'category')
      .orderBy('p.barcode', 'ASC');

    applyKeywordSearch(qb, ['p.name', 'p.barcode'], search);
    if (brandId) qb.andWhere('p.brandId = :brandId', { brandId });
    if (categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId });
    if (isActive !== undefined) qb.andWhere('p.isActive = :isActive', { isActive });

    // Every filter is optional, so a bare request would otherwise select the whole
    // table. Counting first keeps the refusal a normal JSON error.
    assertExportRowLimit(await qb.getCount());

    const columns: ExcelColumn<Product>[] = [
      { header: 'Barcode', key: 'barcode', width: 18, getValue: (r) => r.barcode },
      { header: 'ชื่อสินค้า', key: 'name', width: 30, getValue: (r) => r.name },
      { header: 'แบรนด์', key: 'brand', width: 18, getValue: (r) => r.brand?.name ?? '' },
      { header: 'หมวดหมู่', key: 'category', width: 18, getValue: (r) => r.category?.name ?? '' },
      { header: 'ราคาทุน (แพ็ค)', key: 'costPack', width: 16, getValue: (r) => r.costPrice?.pack ?? 0 },
      { header: 'ราคาทุน (ลัง)', key: 'costCarton', width: 16, getValue: (r) => r.costPrice?.carton ?? 0 },
      { header: 'ราคาขาย (แพ็ค)', key: 'sellPack', width: 16, getValue: (r) => r.sellPrice?.pack ?? 0 },
      { header: 'ราคาขาย (ลัง)', key: 'sellCarton', width: 16, getValue: (r) => r.sellPrice?.carton ?? 0 },
      { header: 'สต็อกคงเหลือ', key: 'remaining', width: 14, getValue: (r) => r.remaining ?? 0 },
      { header: 'สต็อกขั้นต่ำ', key: 'minStock', width: 14, getValue: (r) => r.minStock ?? 0 },
      { header: 'ชิ้น/แพ็ค', key: 'piecesPerPack', width: 12, getValue: (r) => r.piecesPerPack ?? '' },
      { header: 'แพ็ค/ลัง', key: 'packPerCarton', width: 12, getValue: (r) => r.packPerCarton ?? '' },
      { header: 'สถานะ', key: 'isActive', width: 10, getValue: (r) => (r.isActive ? 'ใช้งาน' : 'ปิดใช้งาน') },
    ];

    return streamExcel({
      sheetName: PRODUCT_EXPORT_NAME,
      filename: PRODUCT_EXPORT_NAME,
      columns,
      rows: iterateQueryInBatches(qb),
    });
  }
}
