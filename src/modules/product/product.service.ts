import {
  Injectable
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCreateDto } from './dto/create-product.dto';
import { ProductResponseDto } from './dto/response.dto';
import { Product } from './entities/product.entity';
import { getEntityOrNotFound, throwIfEntityExists } from '@app/common/helpers/entity.helper';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';

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

  async creat(data: ProductCreateDto): Promise<Product> {
    await this.productThrowIfEntityExists(data.barcode);
    const newProduct = this.productRepo.create(data);
    return this.productRepo.save(newProduct);
  }

  async createMultiple(dtos: ProductCreateDto[]) {
    const products: Product[] = [];
    console.log(products);
    for (const dto of dtos) {
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
}
