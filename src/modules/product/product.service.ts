import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCreateDto } from './dto/create-product.dto';
import { ProductResponseDto } from './dto/response.dto';
import { Product } from './entities/product.entity';
import { getEntityOrNotFound, throwIfEntityExists } from '@app/common/helpers/entity.helper';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { BulkUpdateProductDto } from './dto/bulk-update-product.dto';
import { BulkDeleteProductDto } from './dto/bulk-delete-product.dto';
import { Brand } from '../brand/entities/brand.entity';
import { Category } from '../category/entities/category.entity';
import { badRequest, paginatedResponse } from '@app/common/helpers/response';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,

    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
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
}
