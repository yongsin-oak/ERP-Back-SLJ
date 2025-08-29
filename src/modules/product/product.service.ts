import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCreateDto } from './dto/create-product.dto';
import { ProductResponseDto } from './dto/response.dto';
import { Product } from './entities/product.entity';
import {
  getEntityOrNotFound,
  throwIfEntityExists,
} from '@app/common/helpers/entity.helper';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { BulkUpdateProductDto } from './dto/bulk-update-product.dto';
import { BulkDeleteProductDto } from './dto/bulk-delete-product.dto';
import { Brand } from '../brand/entities/brand.entity';
import { Category } from '../category/entities/category.entity';
import { ApiBadRequestResponse } from '@nestjs/swagger';

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

  async productGetEntityOrFail(barcode: string): Promise<Product> {
    return await getEntityOrNotFound(
      this.productRepo,
      { where: { barcode } },
      `barcode ${barcode}`,
    );
  }

  async productThrowIfEntityExists(barcode: string): Promise<void> {
    await throwIfEntityExists(
      this.productRepo,
      {
        where: {
          barcode,
        },
      },
      `barcode ${barcode}`,
    );
  }

  async create(data: ProductCreateDto): Promise<Product> {
    await this.productThrowIfEntityExists(data.barcode);
    const newProduct = this.productRepo.create(data);
    return this.productRepo.save(newProduct);
  }

  async createMultiple(dtos: ProductCreateDto[]) {
    if (dtos.length === 0) {
      return [];
    }
    const products: Product[] = [];
    for (const dto of dtos) {
      await this.productThrowIfEntityExists(dto.barcode);
      const { brandId, categoryId } = dto;

      if (brandId) {
        const brand = await this.brandRepo.findOne({ where: { id: brandId } });
        if (!brand) {
          return new BadRequestException(`Brand with ID ${brandId} does not exist`);
        }
      }
      if (categoryId) {
        const category = await this.categoryRepo.findOne({
          where: { id: categoryId },
        });
        if (!category) {
          return new BadRequestException(`Category with ID ${categoryId} does not exist`);
        }
      }

      await this.productThrowIfEntityExists(dto.barcode);
      products.push(this.productRepo.create(dto));
    }

    return this.productRepo.save(products);
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    const skip = (page - 1) * limit;
    const take = limit;
    const [products, total] = await this.productRepo.findAndCount({
      skip,
      take,
      relations: ['brand', 'category'],
      order: {
        barcode: 'ASC',
      },
      select: {
        barcode: true,
        name: true,
        brand: {
          id: true,
          name: true,
        },
        category: {
          id: true,
          name: true,
        },
        costPrice: true,
        sellPrice: true,
        remaining: true,
        minStock: true,
        createdAt: true,
        updatedAt: true,
        packPerCarton: true,
        piecesPerPack: true,
        productDimensions: true,
        cartonDimensions: true,
      },
    });
    return {
      data: products,
      total,
      page,
      limit,
    };
  }

  async findOne(barcode: string): Promise<Product> {
    const product = await getEntityOrNotFound(
      this.productRepo,
      { where: { barcode }, relations: ['brand', 'category'] },
      'Product',
    );
    return product;
  }

  async update(
    barcode: string,
    dto: ProductCreateDto | Partial<ProductCreateDto>,
  ): Promise<Product> {
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
    const updatedProducts: Product[] = [];
    const errors: string[] = [];

    // เช็คว่าทุก barcode มีอยู่จริงก่อนทำการอัปเดต
    for (const item of bulkUpdateDto.products) {
      try {
        await this.productGetEntityOrFail(item.barcode);
      } catch (error) {
        errors.push(`Product with barcode ${item.barcode} not found`);
      }
    }

    // หากมีข้อผิดพลาดใดๆ ให้ throw error ทันที
    if (errors.length > 0) {
      throw new Error(`Bulk update failed: ${errors.join(', ')}`);
    }

    // ทำการอัปเดตทุกรายการ
    for (const item of bulkUpdateDto.products) {
      try {
        const product = await this.productGetEntityOrFail(item.barcode);

        // อัปเดตข้อมูล
        await this.productRepo.update({ barcode: item.barcode }, item.data);

        // ดึงข้อมูลที่อัปเดตแล้วพร้อม relations
        const updatedProduct = await this.productRepo.findOne({
          where: { barcode: item.barcode },
          relations: ['brand', 'category'],
        });

        if (updatedProduct) {
          updatedProducts.push(updatedProduct);
        }
      } catch (error) {
        errors.push(
          `Failed to update product ${item.barcode}: ${error.message}`,
        );
      }
    }

    // หากมีข้อผิดพลาดในการอัปเดต
    if (errors.length > 0) {
      throw new Error(`Some products failed to update: ${errors.join(', ')}`);
    }

    return updatedProducts;
  }

  async bulkDelete(
    bulkDeleteDto: BulkDeleteProductDto,
  ): Promise<{ deleted: Product[]; errors: string[] }> {
    const deletedProducts: Product[] = [];
    const errors: string[] = [];
    const productsToDelete: Product[] = [];

    // เช็คว่าทุก barcode มีอยู่จริงและเก็บ products ที่จะลบ
    for (const barcode of bulkDeleteDto.barcodes) {
      try {
        const product = await this.productGetEntityOrFail(barcode);
        productsToDelete.push(product);
      } catch (error) {
        errors.push(`Product with barcode ${barcode} not found`);
      }
    }

    // หากมีข้อผิดพลาดในการหา products ให้รายงาน
    if (errors.length > 0) {
      return {
        deleted: [],
        errors: errors,
      };
    }

    // ทำการลบทีละรายการ
    for (const product of productsToDelete) {
      try {
        await this.productRepo.remove(product);
        deletedProducts.push(product);
      } catch (error) {
        errors.push(
          `Failed to delete product ${product.barcode}: ${error.message}`,
        );
      }
    }

    return {
      deleted: deletedProducts,
      errors: errors,
    };
  }
}
