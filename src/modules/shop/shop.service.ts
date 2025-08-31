import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopCreateDto } from './dto/create-shop.dto';
import { ShopResponseDto } from './dto/response.dto';
import { ShopUpdateDto } from './dto/update-product.dto';
import { Platform } from './entities/platform.enum';
import { Shop } from './entities/shop.entity';
import { getEntityOrNotFound, throwIfEntityExists } from '@app/common/helpers/entity.helper';
import { PaginatedGetAllDto, PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { ShopGetDto } from './dto/get-shop.dto';

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
    query: ShopGetDto,
  ): Promise<PaginatedResponseDto<Shop>> {
    const { page, limit, platform } = query;
    const skip = (page - 1) * limit;
    const take = limit;
    const [shops, total] = await this.shopRepo.findAndCount({
      skip,
      take,
      where: {
        ...(platform && { platform }),
      },
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
    const shop = this.shopRepo.create(data);
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
