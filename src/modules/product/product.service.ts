import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
import { badRequest, conflict, notFound, paginatedResponse } from '@app/common/helpers/response';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,

    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,

    @InjectRepository(ProductShopPrice)
    private readonly shopPriceRepo: Repository<ProductShopPrice>,
  ) {}

  private async productGetEntityOrFail(barcode: string): Promise<Product> {
    return getEntityOrNotFound(this.productRepo, { where: { barcode } }, `Product ${barcode}`);
  }

  private async productThrowIfExists(barcode: string): Promise<void> {
    await throwIfEntityExists(this.productRepo, { where: { barcode } }, `barcode ${barcode}`);
  }

  async create(data: ProductCreateDto): Promise<Product> {
    await this.productThrowIfExists(data.barcode);
    const newProduct = this.productRepo.create(data);
    return this.productRepo.save(newProduct);
  }

  async createMultiple(dtos: ProductCreateDto[]): Promise<Product[]> {
    if (!dtos.length) return [];

    const products: Product[] = [];
    for (const dto of dtos) {
      await this.productThrowIfExists(dto.barcode);

      if (dto.brandId) {
        const brand = await this.brandRepo.findOne({ where: { id: dto.brandId } });
        if (!brand) throw badRequest(`Brand ${dto.brandId} does not exist`);
      }
      if (dto.categoryId) {
        const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
        if (!category) throw badRequest(`Category ${dto.categoryId} does not exist`);
      }

      products.push(this.productRepo.create(dto));
    }

    return this.productRepo.save(products);
  }

  async findAll(
    page: number,
    limit: number,
    search?: string,
    brandId?: string,
    categoryId?: string,
    isActive?: boolean,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.brand', 'brand')
      .leftJoinAndSelect('p.category', 'category')
      .orderBy('p.barcode', 'ASC');

    if (search) {
      qb.andWhere('(p.name ILIKE :q OR p.barcode ILIKE :q)', { q: `%${search}%` });
    }
    if (brandId) {
      qb.andWhere('p.brandId = :brandId', { brandId });
    }
    if (categoryId) {
      qb.andWhere('p.categoryId = :categoryId', { categoryId });
    }
    if (isActive !== undefined) {
      qb.andWhere('p.isActive = :isActive', { isActive });
    }

    const [products, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return paginatedResponse(products, page, limit, total);
  }

  async findOne(barcode: string): Promise<Product> {
    return getEntityOrNotFound(
      this.productRepo,
      { where: { barcode }, relations: ['brand', 'category'] },
      `Product ${barcode}`,
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
    const errors: string[] = [];

    for (const item of bulkUpdateDto.products) {
      try {
        await this.productGetEntityOrFail(item.barcode);
      } catch {
        errors.push(`Product ${item.barcode} not found`);
      }
    }

    if (errors.length) {
      throw badRequest(`Bulk update failed: ${errors.join(', ')}`);
    }

    const updatedProducts: Product[] = [];
    for (const item of bulkUpdateDto.products) {
      await this.productRepo.update({ barcode: item.barcode }, item.data);
      const updated = await this.productRepo.findOne({
        where: { barcode: item.barcode },
        relations: ['brand', 'category'],
      });
      if (updated) updatedProducts.push(updated);
    }

    return updatedProducts;
  }

  async dropdownSearch(dto: ProductDropdownSearchDto): Promise<ProductDropdownItemDto[]> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .select(['p.barcode', 'p.name', 'p.remaining', 'p.sellPrice'])
      .orderBy('p.name', 'ASC')
      .limit(50);

    if (dto.search) {
      qb.where('(p.name ILIKE :q OR p.barcode ILIKE :q)', { q: `%${dto.search}%` });
    }

    return qb.getMany() as unknown as ProductDropdownItemDto[];
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
        errors.push(`Product ${barcode} not found`);
      }
    }

    if (errors.length) return { deleted: [], errors };

    const deleted: Product[] = [];
    for (const product of productsToDelete) {
      try {
        await this.productRepo.remove(product);
        deleted.push(product);
      } catch (error) {
        errors.push(`Failed to delete ${product.barcode}: ${error instanceof Error ? error.message : String(error)}`);
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
    if (existing) throw conflict(`Shop price for barcode ${barcode} shop ${dto.shopId} already exists`);
    const entry = this.shopPriceRepo.create({
      productBarcode: barcode,
      shopId: dto.shopId,
      sellPrice: dto.sellPrice,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
    });
    return this.shopPriceRepo.save(entry);
  }

  async updateShopPrice(barcode: string, shopId: string, dto: UpdateShopPriceDto): Promise<ProductShopPrice> {
    const entry = await this.shopPriceRepo.findOne({ where: { productBarcode: barcode, shopId } });
    if (!entry) throw notFound(`Shop price for barcode ${barcode} shop ${shopId} not found`);
    if (dto.sellPrice !== undefined) entry.sellPrice = dto.sellPrice;
    if (dto.effectiveFrom !== undefined) entry.effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : null;
    if (dto.effectiveTo !== undefined) entry.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    return this.shopPriceRepo.save(entry);
  }

  async deleteShopPrice(barcode: string, shopId: string): Promise<ProductShopPrice> {
    const entry = await this.shopPriceRepo.findOne({ where: { productBarcode: barcode, shopId } });
    if (!entry) throw notFound(`Shop price for barcode ${barcode} shop ${shopId} not found`);
    const snapshot = { ...entry } as ProductShopPrice;
    await this.shopPriceRepo.remove(entry);
    snapshot.productBarcode = barcode;
    snapshot.shopId = shopId;
    return snapshot;
  }
}
