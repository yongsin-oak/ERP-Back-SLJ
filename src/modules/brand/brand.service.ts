import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brand } from './entities/brand.entity';
import { Repository } from 'typeorm';
import { BrandCreateDto } from './dto/create-brand.dto';
import {
  getEntityOrNotFound,
  throwIfEntityExists,
} from 'src/common/helpers/entity.helper';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from 'src/common/dto/paginated.dto';

@Injectable()
export class BrandService {
  constructor(
    @InjectRepository(Brand) private readonly brandRepo: Repository<Brand>,
  ) {}

  async getAllBrands(
    query: PaginatedGetAllDto,
  ): Promise<PaginatedResponseDto<Brand>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const take = limit;
    const [brands, total] = await this.brandRepo.findAndCount({
      skip,
      take,
    });
    return {
      data: brands,
      total,
      page,
      limit,
    };
  }

  async brandThrowExists(name: string): Promise<void> {
    await throwIfEntityExists(
      this.brandRepo,
      {
        where: { name },
      },
      `Brand ${name}`,
    );
  }

  async brandGetEntityOrNotFound(id: number): Promise<Brand> {
    return await getEntityOrNotFound(
      this.brandRepo,
      { where: { id } },
      `Brand ${id}`,
    );
  }

  async getBrandById(id: number): Promise<Brand> {
    const brand = await this.brandGetEntityOrNotFound(id);
    return brand;
  }

  async createBrand(name: string, description?: string): Promise<Brand> {
    await this.brandThrowExists(name);
    const brand = this.brandRepo.create({ name, description });
    return this.brandRepo.save(brand);
  }

  async createMultipleBrand(dtos: BrandCreateDto[]) {
    const brands: Brand[] = [];

    for (const dto of dtos) {
      await this.brandThrowExists(dto.name);

      brands.push(this.brandRepo.create(dto));
    }

    return this.brandRepo.save(brands);
  }

  async updateBrand(
    id: number,
    name: string,
    description?: string,
  ): Promise<Brand> {
    await getEntityOrNotFound(this.brandRepo, { where: { id } }, 'Brand');
    await this.brandRepo.update(id, { name, description });
    return this.getBrandById(id);
  }

  async deleteBrand(id: number): Promise<Brand> {
    const brand = await this.getBrandById(id);
    await this.brandRepo.delete(id);
    return brand;
  }
}
