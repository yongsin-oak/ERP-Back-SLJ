import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderDetail } from './entities/orderDetail.entity';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { GetOrderDetailDto } from './dto/get-order-detail.dto';
import { notFound, paginatedResponse } from '@app/common/helpers/response';

@Injectable()
export class OrderDetailService {
  constructor(
    @InjectRepository(OrderDetail)
    private readonly orderDetailRepo: Repository<OrderDetail>,
  ) {}

  async findAll(query: GetOrderDetailDto): Promise<PaginatedResponseDto<OrderDetail>> {
    const { page, limit, orderId, productBarcode, dateFrom, dateTo } = query;

    const qb = this.orderDetailRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.product', 'product')
      .orderBy('d.createdAt', 'DESC');

    if (orderId) {
      qb.andWhere('d.orderId = :orderId', { orderId });
    }
    if (productBarcode) {
      qb.andWhere('d.productBarcode = :productBarcode', { productBarcode });
    }
    if (dateFrom) {
      qb.andWhere('d.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }
    if (dateTo) {
      qb.andWhere('d.createdAt <= :dateTo', { dateTo: new Date(dateTo) });
    }

    const [orderDetails, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

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
      throw notFound(`ไม่พบรายละเอียดออเดอร์`);
    }

    return details;
  }
}
