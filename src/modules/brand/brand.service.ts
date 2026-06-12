import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { BrandCreateDto } from './dto/create-brand.dto';
import { getEntityOrNotFound, throwIfEntityExists } from '@app/common/helpers/entity.helper';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { BrandGetDto } from './dto/get-brand.dto';
import { applyKeywordSearch, paginateQuery } from '@app/common/helpers/query.helper';
import { conflict } from '@app/common/helpers/response';

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

  async findAll(query: BrandGetDto): Promise<PaginatedResponseDto<Brand>> {
    const { page, limit, search } = query;
    const qb = this.brandRepo.createQueryBuilder('b').orderBy('b.name', 'ASC');
    applyKeywordSearch(qb, ['b.name'], search);
    return paginateQuery(qb, page, limit);
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
    if (!dtos.length) return [];

    const names = dtos.map((d) => d.name);
    const existing = await this.brandRepo.find({ where: { name: In(names) }, select: { name: true } });
    if (existing.length) {
      throw conflict(`แบรนด์ "${existing.map((b) => b.name).join('", "')}" มีอยู่ในระบบแล้ว`);
    }

    return this.brandRepo.save(dtos.map((dto) => this.brandRepo.create(dto)));
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
