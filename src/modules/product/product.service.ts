import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductResponseAllDto, ProductResponseDto } from './dto/response.dto';
import {
  getEntityOrFail,
  throwIfEntityExists,
} from 'src/helpers/entity.helper';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}
  async createProduct(data: CreateProductDto): Promise<Product> {
    await throwIfEntityExists(
      this.productRepo,
      {
        where: {
          barcode: data.barcode,
        },
      },
      'Product',
    );
    const newProduct = this.productRepo.create(data);
    return this.productRepo.save(newProduct);
  }

  async createMultipleProducts(dtos: CreateProductDto[]) {
    const products: Product[] = [];

    for (const dto of dtos) {
      await throwIfEntityExists(
        this.productRepo,
        {
          where: {
            barcode: dto.barcode,
          },
        },
        'Product',
      );

      products.push(this.productRepo.create(dto));
    }

    return this.productRepo.save(products);
  }

  async findProducts(
    page: number,
    limit: number,
  ): Promise<ProductResponseAllDto> {
    const skip = (page - 1) * limit;
    const take = limit;
    const products = await this.productRepo.find({
      skip,
      take,
      relations: ['brand'],
    });
    const total = await this.productRepo.count();
    return {
      data: products.map((product) => {
        return {
          ...product,
          brand: product.brand.name,
        };
      }),
      total,
      page,
      limit,
    };
  }

  async findProductByBarcode(barcode: string): Promise<ProductResponseDto> {
    const product = await getEntityOrFail(
      this.productRepo,
      { where: { barcode }, relations: ['brand'] },
      'Product',
    );
    return {
      ...product,
      brand: product.brand.name,
    };
  }

  async updateProduct(
    barcode: string,
    dto: CreateProductDto | Partial<CreateProductDto>,
  ): Promise<Product> {
    const product = await getEntityOrFail(
      this.productRepo,
      { where: { barcode } },
      'Product',
    );
    await this.productRepo.update(barcode, dto);
    return product;
  }

  async removeProduct(barcode: string): Promise<Product> {
    const product = await getEntityOrFail(
      this.productRepo,
      { where: { barcode } },
      'Product',
    );
    await this.productRepo.remove(product);
    return product;
  }
}
