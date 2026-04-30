import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderDetail } from './entities/orderDetail.entity';
import { getEntityOrNotFound } from '@app/common/helpers/entity.helper';
import { PaginatedGetAllDto, PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { notFound, paginatedResponse } from '@app/common/helpers/response';

@Injectable()
export class OrderDetailService {
  constructor(
    @InjectRepository(OrderDetail)
    private readonly orderDetailRepo: Repository<OrderDetail>,
  ) {}

  async findAll(query: PaginatedGetAllDto): Promise<PaginatedResponseDto<OrderDetail>> {
    const { page, limit } = query;
    const [orderDetails, total] = await this.orderDetailRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginatedResponse(orderDetails, page, limit, total);
  }

  async findByOrderId(orderId: string): Promise<OrderDetail[]> {
    const details = await this.orderDetailRepo.find({
      where: { orderId },
      relations: ['product'],
      order: { updatedAt: 'DESC' },
      select: {
        id: true,
        orderId: true,
        quantityPack: true,
        quantityCarton: true,
        createdAt: true,
        updatedAt: true,
        product: { barcode: true, name: true },
      },
    });

    if (!details.length) {
      throw notFound(`No order details found for order ${orderId}`);
    }

    return details;
  }
}
