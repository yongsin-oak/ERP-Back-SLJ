import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopCreateDto } from './dto/create-shop.dto';
import { ShopResponseDto } from './dto/response.dto';
import { ShopUpdateDto } from './dto/update-product.dto';
import { Platform } from './entities/platform.enum';
import { Shop } from './entities/shop.entity';
import { getEntityOrNotFound, throwIfEntityExists } from '@app/common/helpers/entity.helper';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { ShopGetDto } from './dto/get-shop.dto';
import { applyKeywordSearch, paginateQuery } from '@app/common/helpers/query.helper';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
  ) {}

  private async shopGetEntityOrFail(id: string): Promise<Shop> {
    return getEntityOrNotFound(this.shopRepo, { where: { id } }, `ร้านค้า`);
  }

  private async shopThrowIfExists(name: string, platform: Platform): Promise<void> {
    await throwIfEntityExists(
      this.shopRepo,
      { where: { name, platform } },
      `ร้านค้า "${name}" บน ${platform}`,
    );
  }

  async findAll(query: ShopGetDto): Promise<PaginatedResponseDto<Shop>> {
    const { page, limit, platform, search } = query;
    const qb = this.shopRepo.createQueryBuilder('s').orderBy('s.name', 'ASC');
    if (platform) qb.andWhere('s.platform = :platform', { platform });
    applyKeywordSearch(qb, ['s.name'], search);
    return paginateQuery(qb, page, limit);
  }

  async findOne(id: string): Promise<Shop> {
    return this.shopGetEntityOrFail(id);
  }

  async create(data: ShopCreateDto): Promise<ShopResponseDto> {
    await this.shopThrowIfExists(data.name, data.platform);
    const shop = this.shopRepo.create(data);
    return this.shopRepo.save(shop);
  }

  async update(id: string, data: Partial<ShopUpdateDto>): Promise<ShopResponseDto> {
    const existing = await this.shopGetEntityOrFail(id);
    const newName = data.name ?? existing.name;
    const newPlatform = data.platform ?? existing.platform;
    if (newName !== existing.name || newPlatform !== existing.platform) {
      await this.shopThrowIfExists(newName, newPlatform);
    }
    await this.shopRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<ShopResponseDto> {
    const shop = await this.shopGetEntityOrFail(id);
    await this.shopRepo.delete(id);
    return shop;
  }
}
