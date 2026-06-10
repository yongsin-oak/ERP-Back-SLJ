import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { BrandCreateDto } from './dto/create-brand.dto';
import { getEntityOrNotFound, throwIfEntityExists } from '@app/common/helpers/entity.helper';
import { PaginatedGetAllDto, PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { paginatedResponse } from '@app/common/helpers/response';

@Injectable()
export class BrandService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
  ) {}

  private async brandGetEntityOrFail(id: string): Promise<Brand> {
    return getEntityOrNotFound(this.brandRepo, { where: { id } }, `แบรนด์`);
  }

  private async brandThrowIfExists(name: string): Promise<void> {
    await throwIfEntityExists(this.brandRepo, { where: { name } }, `แบรนด์ "${name}"`);
  }

  async findAll(query: PaginatedGetAllDto): Promise<PaginatedResponseDto<Brand>> {
    const { page, limit } = query;
    const [brands, total] = await this.brandRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginatedResponse(brands, page, limit, total);
  }

  async findOne(id: string): Promise<Brand> {
    return this.brandGetEntityOrFail(id);
  }

  async create(name: string, description?: string): Promise<Brand> {
    await this.brandThrowIfExists(name);
    const brand = this.brandRepo.create({ name, description });
    return this.brandRepo.save(brand);
  }

  async createMultiple(dtos: BrandCreateDto[]): Promise<Brand[]> {
    const brands: Brand[] = [];
    for (const dto of dtos) {
      await this.brandThrowIfExists(dto.name);
      brands.push(this.brandRepo.create(dto));
    }
    return this.brandRepo.save(brands);
  }

  async update(id: string, name: string, description?: string): Promise<Brand> {
    const existing = await this.brandGetEntityOrFail(id);
    if (name !== existing.name) {
      await this.brandThrowIfExists(name);
    }
    await this.brandRepo.update(id, { name, description });
    return this.findOne(id);
  }

  async remove(id: string): Promise<Brand> {
    const brand = await this.brandGetEntityOrFail(id);
    await this.brandRepo.delete(id);
    return brand;
  }
}
