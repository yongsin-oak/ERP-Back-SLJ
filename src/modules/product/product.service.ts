import { ConflictException, Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResponseEditProduct } from './dto/response.dto';
import { PaginatedProductResponseDto } from './dto/get-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}
  async insertProduct(data: CreateProductDto): Promise<Product> {
    const existingProduct = await this.productRepo.findOne({
      where: { barcode: data.barcode },
    });
    if (existingProduct) {
      throw new ConflictException(
        `Product with barcode ${data.barcode} already exists`,
      );
    }
    const newProduct = this.productRepo.create(data);
    return this.productRepo.save(newProduct);
  }

  async insertMultipleProducts(dtos: CreateProductDto[]) {
    const products: Product[] = [];

    for (const dto of dtos) {
      const existing = await this.productRepo.findOne({
        where: { barcode: dto.barcode },
      });

      if (existing) {
        throw new ConflictException(
          `Product with barcode ${dto.barcode} already exists`,
        );
      }

      products.push(this.productRepo.create(dto));
    }

    return this.productRepo.save(products);
  }

  async findProducts(
    page: number,
    limit: number,
  ): Promise<PaginatedProductResponseDto> {
    const skip = (page - 1) * limit;
    const take = limit;
    const products = await this.productRepo.find({
      skip,
      take,
    });
    const total = await this.productRepo.count();
    return {
      data: products,
      total,
      page,
      limit,
    };
  }

  async findProductByBarcode(barcode: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { barcode } });
    if (!product) {
      throw new ConflictException(`Product ${barcode} not found`);
    }
    return product;
  }

  async updateProduct(
    barcode: string,
    dto: CreateProductDto | Partial<CreateProductDto>,
  ): Promise<ResponseEditProduct> {
    const product = await this.productRepo.findOne({ where: { barcode } });
    if (!product) {
      throw new ConflictException(`Product ${barcode} not found`);
    }
    Object.assign(product, dto);
    await this.productRepo.save(product);
    return {
      message: `Product ${product.barcode} updated successfully`,
      product,
    };
  }

  async removeProduct(barcode: string): Promise<ResponseEditProduct> {
    const product = await this.productRepo.findOne({ where: { barcode } });
    if (!product) {
      throw new ConflictException(`Product ${barcode} not found`);
    }
    await this.productRepo.remove(product);
    return {
      message: `Product ${product.barcode} deleted successfully`,
      product,
    };
  }
}
