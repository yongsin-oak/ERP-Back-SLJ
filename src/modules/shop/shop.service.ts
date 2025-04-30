import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Shop } from './entities/shop.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
  ) {}

  async findAll(): Promise<Shop[]> {
    return this.shopRepo.find();
  }

  async findOne(id: number): Promise<Shop> {
    return this.shopRepo.findOneOrFail({ where: { id } });
  }

  async create(data: Partial<Shop>): Promise<Shop> {
    const newShop = this.shopRepo.create(data);
    return this.shopRepo.save(newShop);
  }

  async update(id: number, data: Partial<Shop>): Promise<Shop> {
    await this.shopRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.shopRepo.delete(id);
  }
  
}
