import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductCreateDto } from './dto/create-product.dto';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductResponseDto } from './dto/response.dto';
import {
  getEntityOrNotFound,
  throwIfEntityExists,
} from 'src/common/helpers/entity.helper';
import { PaginatedResponseDto } from 'src/common/dto/paginated.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
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

  async createProduct(data: ProductCreateDto): Promise<Product> {
    await this.productThrowIfEntityExists(data.barcode);
    const newProduct = this.productRepo.create(data);
    return this.productRepo.save(newProduct);
  }

  async createMultipleProducts(dtos: ProductCreateDto[]) {
    const products: Product[] = [];

    for (const dto of dtos) {
      await this.productThrowIfEntityExists(dto.barcode);
      products.push(this.productRepo.create(dto));
    }

    return this.productRepo.save(products);
  }

  async findProducts(
    page: number,
    limit: number,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
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
    const product = await getEntityOrNotFound(
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
    dto: ProductCreateDto | Partial<ProductCreateDto>,
  ): Promise<Product> {
    const product = await this.productGetEntityOrFail(barcode);
    await this.productRepo.update(barcode, dto);
    return product;
  }

  async removeProduct(barcode: string): Promise<Product> {
    const product = await this.productGetEntityOrFail(barcode);
    await this.productRepo.remove(product);
    return product;
  }
}
