import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Shop } from './entities/shop.entity';
import { Repository } from 'typeorm';
import { ShopCreateDto } from './dto/create-shop.dto';
import { ShopResponseDto } from './dto/response.dto';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from 'src/common/dto/paginated.dto';
import {
  getEntityOrNotFound,
  throwIfEntityExists,
} from 'src/common/helpers/entity.helper';
import { ShopUpdateDto } from './dto/update-product.dto';
import { Platform } from './entities/platform.enum';
import { generateId } from 'src/common/helpers/generateIdWithPrefix';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
  ) {}

  async shopThrowExists({
    data,
  }: {
    data: { name: string; platform: Platform };
  }): Promise<void> {
    await throwIfEntityExists(
      this.shopRepo,
      { where: { name: data.name, platform: data.platform } },
      `Shop with name "${data.name}" and platform "${data.platform}" already exists`,
    );
  }

  async shopGetEntityOrNotFound(id: string): Promise<Shop> {
    return await getEntityOrNotFound(
      this.shopRepo,
      { where: { id } },
      `Shop ${id}`,
    );
  }

  async findAll(
    query: PaginatedGetAllDto,
  ): Promise<PaginatedResponseDto<Shop>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const take = limit;
    const [shops, total] = await this.shopRepo.findAndCount({
      skip,
      take,
    });
    return {
      data: shops,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Shop> {
    return this.shopGetEntityOrNotFound(id);
  }

  async create(data: ShopCreateDto): Promise<ShopResponseDto> {
    await this.shopThrowExists({
      data: { name: data.name, platform: data.platform },
    });
    const id = generateId({
      prefix: 'SHOP',
      withDateTime: false,
      length: 10,
    });
    const shop = this.shopRepo.create({
      ...data,
      id,
    });
    return this.shopRepo.save(shop);
  }

  async update(
    id: string,
    data: Partial<ShopUpdateDto>,
  ): Promise<ShopResponseDto> {
    await this.shopGetEntityOrNotFound(id);
    await this.shopThrowExists({
      data: { name: data.name, platform: data.platform },
    });
    await this.shopRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<ShopResponseDto> {
    if (!id) {
      
    }
    await this.shopGetEntityOrNotFound(id);
    const shop = await this.shopGetEntityOrNotFound(id);
    await this.shopRepo.delete(id);
    return shop;
  }
}
