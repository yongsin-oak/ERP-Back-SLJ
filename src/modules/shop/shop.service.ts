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

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
  ) {}

  async shopThrowExists(id: number): Promise<void> {
    await throwIfEntityExists(
      this.shopRepo,
      {
        where: { id },
      },
      `Shop ${id}`,
    );
  }

  async shopGetEntityOrNotFound(id: number): Promise<Shop> {
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

  async findOne(id: number): Promise<Shop> {
    return this.shopGetEntityOrNotFound(id);
  }

  async create(data: ShopCreateDto): Promise<ShopResponseDto> {
    await throwIfEntityExists(
      this.shopRepo,
      { where: { name: data.name } },
      `Shop with name ${data.name}`,
    );
    const shop = this.shopRepo.create(data);
    return this.shopRepo.save(shop);
  }

  async update(
    id: number,
    data: Partial<ShopUpdateDto>,
  ): Promise<ShopResponseDto> {
    await this.shopGetEntityOrNotFound(id);
    await this.shopRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<ShopResponseDto> {
    const shop = await this.shopGetEntityOrNotFound(id);
    await this.shopRepo.delete(id);
    return shop;
  }
}
