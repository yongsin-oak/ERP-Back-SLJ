import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from 'src/common/dto/paginated.dto';
import { getEntityOrNotFound } from 'src/common/helpers/entity.helper';
import { Repository } from 'typeorm';
import { OrderDetail } from './entities/orderDetail.entity';

@Injectable()
export class OrderDetailService {
  constructor(
    @InjectRepository(OrderDetail)
    private readonly orderDetailRepo: Repository<OrderDetail>,
  ) {}

  async orderGetEntityOrNotFound(id: string): Promise<OrderDetail> {
    return await getEntityOrNotFound(
      this.orderDetailRepo,
      { where: { id } },
      `Order ${id}`,
    );
  }

  async findAll(
    query: PaginatedGetAllDto,
  ): Promise<PaginatedResponseDto<OrderDetail>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const take = limit;
    const [orderDetail, total] = await this.orderDetailRepo.findAndCount({
      skip,
      take,
    });
    return {
      data: orderDetail,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<OrderDetail> {
    return this.orderGetEntityOrNotFound(id);
  }
}
