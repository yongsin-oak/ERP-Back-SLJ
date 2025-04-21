import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brand } from './entities/brand.entity';
import { Repository } from 'typeorm';
import { BrandGetAllDto } from './dto/get-brand.dto';
import { BrandCreateDto } from './dto/create-beand.dto';
import {
  getEntityOrFail,
  throwIfEntityExists,
} from 'src/helpers/entity.helper';

@Injectable()
export class BrandService {
  constructor(
    @InjectRepository(Brand) private readonly brandRepo: Repository<Brand>,
  ) {}

  async getAllBrands(query: BrandGetAllDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const take = limit;
    const [brands, total] = await this.brandRepo.findAndCount({
      skip,
      take,
    });
    return {
      brands,
      total,
      page,
      limit,
    };
  }

  async getBrandById(id: number) {
    const brand = await getEntityOrFail(
      this.brandRepo,
      { where: { id } },
      'Brand',
    );
    return brand;
  }

  async createBrand(name: string, description?: string) {
    await throwIfEntityExists(
      this.brandRepo,
      {
        where: { name },
      },
      'Brand',
    );
    const brand = this.brandRepo.create({ name, description });
    return this.brandRepo.save(brand);
  }

  async createMultipleBrand(dtos: BrandCreateDto[]) {
    const brands: Brand[] = [];

    for (const dto of dtos) {
      await throwIfEntityExists(
        this.brandRepo,
        {
          where: { name: dto.name },
        },
        'Brand',
      );

      brands.push(this.brandRepo.create(dto));
    }

    return this.brandRepo.save(brands);
  }

  async updateBrand(id: number, name: string, description?: string) {
    await getEntityOrFail(this.brandRepo, { where: { id } }, 'Brand');
    await this.brandRepo.update(id, { name, description });
    return this.getBrandById(id);
  }

  async deleteBrand(id: number) {
    const brand = await this.getBrandById(id);
    await this.brandRepo.delete(id);
    return brand;
  }
}
