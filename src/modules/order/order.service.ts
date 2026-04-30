import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../employee/entities/employee.entity';
import { OrderDetail } from '../order-detail/entities/orderDetail.entity';
import { Product } from '../product/entities/product.entity';
import { Shop } from '../shop/entities/shop.entity';
import { OrderCreateDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/response-order.dto';
import { OrderUpdateDto } from './dto/update-order.dto';
import { Order } from './entities/order.entity';
import { getEntityOrNotFound } from '@app/common/helpers/entity.helper';
import { PaginatedGetAllDto, PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { badRequest, paginatedResponse } from '@app/common/helpers/response';
import { generateIdWithPrefix } from '@app/common/helpers/generateIdWithPrefix.helper';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,

    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  private readonly orderRelations = {
    relations: ['employee', 'shop', 'orderDetails', 'orderDetails.product'],
    select: {
      employee: { id: true, firstName: true, lastName: true, nickname: true },
      shop: { id: true, name: true, platform: true },
    },
  };

  async findAll(query: PaginatedGetAllDto): Promise<PaginatedResponseDto<OrderResponseDto>> {
    const { page, limit } = query;
    const [orders, total] = await this.orderRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      ...this.orderRelations,
    });
    return paginatedResponse(orders, page, limit, total);
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    return getEntityOrNotFound(
      this.orderRepo,
      { where: { id }, ...this.orderRelations },
      `Order ${id}`,
    );
  }

  async create(dto: OrderCreateDto): Promise<OrderResponseDto> {
    const shop = await getEntityOrNotFound(this.shopRepo, { where: { id: dto.shopId } }, `Shop ${dto.shopId}`);
    const employee = await getEntityOrNotFound(this.employeeRepo, { where: { id: dto.createdBy } }, `Employee ${dto.createdBy}`);

    const order = this.orderRepo.create({
      id: generateIdWithPrefix({ prefix: 'ORD', withDateTime: true }),
      shop,
      employee,
    });

    if (dto.details?.length) {
      order.orderDetails = await Promise.all(
        dto.details.map(async (d) => {
          if (!d.quantityPack && !d.quantityCarton) {
            throw badRequest(`Detail for ${d.productBarcode}: quantityPack or quantityCarton is required`);
          }
          const product = await getEntityOrNotFound(
            this.productRepo,
            { where: { barcode: d.productBarcode } },
            `Product ${d.productBarcode}`,
          );
          const detail = new OrderDetail();
          detail.product = product;
          detail.quantityPack = d.quantityPack ?? 0;
          detail.quantityCarton = d.quantityCarton ?? 0;
          return detail;
        }),
      );
    }

    const saved = await this.orderRepo.save(order);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: OrderUpdateDto): Promise<OrderResponseDto> {
    const order = await getEntityOrNotFound(this.orderRepo, { where: { id } }, `Order ${id}`);

    if (dto.shopId) {
      order.shop = await getEntityOrNotFound(this.shopRepo, { where: { id: dto.shopId } }, `Shop ${dto.shopId}`);
    }
    if (dto.createdBy) {
      order.employee = await getEntityOrNotFound(this.employeeRepo, { where: { id: dto.createdBy } }, `Employee ${dto.createdBy}`);
    }
    if (dto.details?.length) {
      order.orderDetails = await Promise.all(
        dto.details.map(async (d) => {
          const product = await getEntityOrNotFound(
            this.productRepo,
            { where: { barcode: d.productBarcode } },
            `Product ${d.productBarcode}`,
          );
          const detail = new OrderDetail();
          detail.product = product;
          detail.quantityPack = d.quantityPack ?? 0;
          detail.quantityCarton = d.quantityCarton ?? 0;
          return detail;
        }),
      );
    }

    const saved = await this.orderRepo.save(order);
    return this.findOne(saved.id);
  }

  async remove(id: string): Promise<OrderResponseDto> {
    const order = await getEntityOrNotFound(
      this.orderRepo,
      { where: { id }, ...this.orderRelations },
      `Order ${id}`,
    );
    await this.orderRepo.remove(order);
    return { ...order, id };
  }
}
