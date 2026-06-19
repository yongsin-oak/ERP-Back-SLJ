import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CheckExistProductDto } from './dto/check-exist-product.dto';
import { ProductCreateDto } from './dto/create-product.dto';
import { ProductDropdownItemDto, ProductDropdownSearchDto } from './dto/dropdown-search-product.dto';
import { ProductResponseDto } from './dto/response.dto';
import { CreateShopPriceDto, UpdateShopPriceDto } from './dto/shop-price.dto';
import { ProductShopPrice } from './entities/product-shop-price.entity';
import { Product } from './entities/product.entity';
import { getEntityOrNotFound, throwIfEntityExists } from '@app/common/helpers/entity.helper';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { BulkUpdateProductDto } from './dto/bulk-update-product.dto';
import { BulkDeleteProductDto } from './dto/bulk-delete-product.dto';
import { Brand } from '../brand/entities/brand.entity';
import { Category } from '../category/entities/category.entity';
import { badRequest, conflict, notFound } from '@app/common/helpers/response';
import { applyKeywordSearch, applySmartSearch, paginateQuery } from '@app/common/helpers/query.helper';
import { buildExcelBuffer, ExcelColumn } from '@app/common/helpers/excel.helper';
import { ProductGetDto } from './dto/get-product.dto';

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

  async createMultiple(dtos: ProductCreateDto[]): Promise<Product[]> {
    if (!dtos.length) return [];

    // Validate uniqueness + FK references in bulk — one query each, not per row.
    const barcodes = dtos.map((d) => d.barcode);
    const existing = await this.productRepo.find({ where: { barcode: In(barcodes) }, select: { barcode: true } });
    if (existing.length) {
      throw conflict(`บาร์โค้ด "${existing.map((p) => p.barcode).join('", "')}" มีอยู่ในระบบแล้ว`);
    }

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

    return this.productRepo.save(dtos.map((dto) => this.productRepo.create(dto)));
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

    // Each row carries its own patch, so the UPDATEs can't be collapsed — but the
    // refetch is a single In(...) query, then re-ordered to match the input.
    for (const item of bulkUpdateDto.products) {
      await this.productRepo.update({ barcode: item.barcode }, item.data);
    }

    const updated = await this.productRepo.find({
      where: { barcode: In(barcodes) },
      relations: ['brand', 'category'],
    });
    const byBarcode = new Map(updated.map((p) => [p.barcode, p]));
    return barcodes.map((b) => byBarcode.get(b)).filter((p): p is Product => p !== undefined);
  }

  async dropdownSearch(dto: ProductDropdownSearchDto): Promise<PaginatedResponseDto<ProductDropdownItemDto>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .select(['p.barcode', 'p.name', 'p.remaining', 'p.sellPrice', 'p.costPrice'])
      .orderBy('p.name', 'ASC');

    // Relevance-ranked (barcode-exact first) + typo-tolerant when pg_trgm is available.
    applySmartSearch(qb, ['p.barcode', 'p.name'], dto.search, { fuzzy: this.trigramEnabled });

    return paginateQuery<Product, ProductDropdownItemDto>(qb, page, limit);
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
    const productsToDelete: Product[] = [];
    const errors: string[] = [];

    for (const barcode of bulkDeleteDto.barcodes) {
      try {
        productsToDelete.push(await this.productGetEntityOrFail(barcode));
      } catch {
        errors.push(`ไม่พบสินค้า "${barcode}"`);
      }
    }

    if (errors.length) return { deleted: [], errors };

    const deleted: Product[] = [];
    for (const product of productsToDelete) {
      try {
        await this.productRepo.remove(product);
        deleted.push(product);
      } catch (error) {
        errors.push(`ลบสินค้าไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

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

  async exportAll(query: Omit<ProductGetDto, 'page' | 'limit'>): Promise<Buffer> {
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

    const products = await qb.getMany();

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

    return buildExcelBuffer('สินค้า', columns, products);
  }
}
