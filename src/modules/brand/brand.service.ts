import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brand } from './entities/brand.entity';
import { Repository } from 'typeorm';
import { BrandCreateDto } from './dto/create-brand.dto';
import { getEntityOrNotFound, throwIfEntityExists } from '@app/common/helpers/entity.helper';
import { PaginatedGetAllDto, PaginatedResponseDto } from '@app/common/dto/paginated.dto';

@Injectable()
export class BrandService {
  constructor(
    @InjectRepository(Brand) private readonly brandRepo: Repository<Brand>,
  ) {}

  async brandThrowExists(name: string): Promise<void> {
    await throwIfEntityExists(
      this.brandRepo,
      {
        where: { name },
      },
      `Brand ${name}`,
    );
  }

  async brandGetEntityOrNotFound(id: string): Promise<Brand> {
    return await getEntityOrNotFound(
      this.brandRepo,
      { where: { id } },
      `Brand ${id}`,
    );
  }

  async findAll(
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

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandGetEntityOrNotFound(id);
    return brand;
  }

  async create(name: string, description?: string): Promise<Brand> {
    await this.brandThrowExists(name);
    const brand = this.brandRepo.create({ name, description });
    return this.brandRepo.save(brand);
  }

  async createMultiple(dtos: BrandCreateDto[]) {
    const brands: Brand[] = [];

    for (const dto of dtos) {
      await this.brandThrowExists(dto.name);

      brands.push(this.brandRepo.create(dto));
    }

    return this.brandRepo.save(brands);
  }

  async update(id: string, name: string, description?: string): Promise<Brand> {
    await this.brandGetEntityOrNotFound(id);
    await this.brandRepo.update(id, { name, description });
    return this.findOne(id);
  }

  async remove(id: string): Promise<Brand> {
    const brand = await this.findOne(id);
    await this.brandRepo.delete(id);
    return brand;
  }
}
