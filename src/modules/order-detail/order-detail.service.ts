import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderDetail } from './entities/orderDetail.entity';
import { getEntityOrNotFound } from '@app/common/helpers/entity.helper';
import { PaginatedGetAllDto, PaginatedResponseDto } from '@app/common/dto/paginated.dto';

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

  async findByOrderId(orderId: string): Promise<OrderDetail[]> {
    console.log(orderId);
    if (!orderId) {
      throw new NotFoundException('Order ID is required');
    }
    const orderDetail = await this.orderDetailRepo.find({
      where: { orderId },
      relations: ['product'],
      order: { updatedAt: 'DESC' },
      select: {
        id: true,
        quantityPack: true,
        product: {
          barcode: true,
          name: true,
          costPrice: true,
          sellPrice: true,
          packPerCarton: true,
        },
      },
    });
    if (!orderDetail || orderDetail.length === 0) {
      throw new NotFoundException(
        `Order details not found for order ID: ${orderId}`,
      );
    }
    return orderDetail;
  }
}
