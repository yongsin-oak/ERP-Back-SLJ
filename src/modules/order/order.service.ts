import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm';
import {
  getEntityOrNotFound,
  throwIfEntityExists,
} from 'src/common/helpers/entity.helper';
import { OrderResponseDto } from './dto/response-order.dto';
import { OrderCreateDto } from './dto/create-order.dto';
import { OrderDetail } from '../order-detail/entities/orderDetail.entity';
import { Product } from '../product/entities/product.entity';
import { generateId } from 'src/common/helpers/generateIdWithPrefix';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from 'src/common/dto/paginated.dto';
import { OrderUpdateDto } from './dto/update-order.dto';
import { isNotEmpty } from 'class-validator';
import { Shop } from '../shop/entities/shop.entity';
import { Employee } from '../employee/entities/employee.entity';

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

  async orderThrowExists(id: string): Promise<void> {
    await throwIfEntityExists(
      this.orderRepo,
      {
        where: { id },
      },
      `Order ${id}`,
    );
  }

  async orderGetEntityOrNotFound(id: string): Promise<Order> {
    return await getEntityOrNotFound(
      this.orderRepo,
      { where: { id } },
      `Order ${id}`,
    );
  }

  async findAll(
    query: PaginatedGetAllDto,
  ): Promise<PaginatedResponseDto<OrderResponseDto>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const take = limit;
    const [order, total] = await this.orderRepo.findAndCount({
      skip,
      take,
      relations: ['employee', 'shop'],
      select: {
        employee: {
          id: true,
          firstName: true,
          lastName: true,
          nickname: true,
        },
        shop: {
          id: true,
          name: true,
          platform: true,
        },
      },
    });
    return {
      data: order,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    const order = await getEntityOrNotFound(
      this.orderRepo,
      {
        where: { id },
        relations: ['orderDetails', 'employee', 'shop'],
        select: {
          employee: {
            id: true,
            firstName: true,
            lastName: true,
            nickname: true,
          },
          shop: {
            id: true,
            name: true,
            platform: true,
          },
        },
      },
      `Order ${id}`,
    );
    return order;
  }

  async create(orderData: OrderCreateDto): Promise<OrderResponseDto> {
    if (!orderData.id) {
      throw new BadRequestException(
        'Order ID is required. Please provide a unique order ID.',
      );
    }
    const orderId = orderData.id;

    const shop = await getEntityOrNotFound(
      this.shopRepo,
      { where: { id: orderData.shopId } },
      `Shop ${orderData.shopId}`,
    );

    const employee = await getEntityOrNotFound(
      this.employeeRepo,
      { where: { id: orderData.employeeId } },
      `Employee ${orderData.employeeId}`,
    );

    const products = await Promise.all(
      orderData.orderDetails.map((detail) =>
        this.productRepo.findOne({
          where: { barcode: detail.productBarcode },
        }),
      ),
    );

    // สร้าง order entity
    const order = this.orderRepo.create({
      id: orderId,
      shop,
      employee,
    });

    // สร้าง orderDetails พร้อมตั้งค่าความสัมพันธ์ order แบบชัดเจน
    order.orderDetails = orderData.orderDetails.map((detail) => {
      const product = products.find(
        (p) => p?.barcode === detail.productBarcode,
      );
      if (!product) {
        throw new Error(
          `Product with barcode ${detail.productBarcode} not found`,
        );
      }

      const orderDetail = new OrderDetail();
      orderDetail.id = generateId({ prefix: 'ORD-DETAIL', withDateTime: true });
      orderDetail.quantity = detail.quantity;
      orderDetail.product = product;
      // ไม่ต้องตั้ง orderDetail.orderId ด้วยตัวเอง เพราะ TypeORM จะจัดการให้
      return orderDetail;
    });

    // คำนวณ total
    order.totalCostPrice = orderData.orderDetails.reduce((total, detail) => {
      const product = products.find(
        (p) => p?.barcode === detail.productBarcode,
      );
      return total + (product?.costPrice || 0) * detail.quantity;
    }, 0);

    order.totalCurrentPrice = orderData.orderDetails.reduce((total, detail) => {
      const product = products.find(
        (p) => p?.barcode === detail.productBarcode,
      );
      return total + (product?.currentPrice || 0) * detail.quantity;
    }, 0);

    order.totalQuantity = orderData.orderDetails.reduce(
      (total, detail) => total + detail.quantity,
      0,
    );

    // บันทึก order พร้อม cascade orderDetails
    const savedOrder = await this.orderRepo.save(order);

    const completeOrder = await this.orderRepo.findOne({
      where: { id: savedOrder.id },
      relations: ['orderDetails'],
      loadEagerRelations: true,
    });
    return completeOrder;
  }

  async update(
    id: string,
    orderData: OrderUpdateDto,
  ): Promise<OrderResponseDto> {
    const order = await this.orderGetEntityOrNotFound(id);

    if (orderData.shopId) {
      const shop = await getEntityOrNotFound(
        this.shopRepo,
        { where: { id: orderData.shopId } },
        `Shop ${orderData.shopId}`,
      );
      order.shop = shop;
    }

    if (orderData.employeeId) {
      const employee = await getEntityOrNotFound(
        this.employeeRepo,
        { where: { id: orderData.employeeId } },
        `Employee ${orderData.employeeId}`,
      );
      order.employee = employee;
    }

    if (isNotEmpty(orderData.orderDetails)) {
      const products = await Promise.all(
        orderData?.orderDetails.map((detail) =>
          this.productRepo.findOne({
            where: { barcode: detail.productBarcode },
          }),
        ),
      );
      // อัปเดต orderDetails
      order.orderDetails = orderData?.orderDetails.map((detail) => {
        const product = products.find(
          (p) => p?.barcode === detail.productBarcode,
        );
        if (!product) {
          throw new Error(
            `Product with barcode ${detail.productBarcode} not found`,
          );
        }

        const orderDetail = new OrderDetail();
        orderDetail.quantity = detail.quantity;
        orderDetail.product = product;
        // ไม่ต้องตั้ง orderDetail.orderId ด้วยตัวเอง เพราะ TypeORM จะจัดการให้
        return orderDetail;
      });

      order.totalCostPrice = orderData?.orderDetails.reduce((total, detail) => {
        const product = products.find(
          (p) => p?.barcode === detail.productBarcode,
        );
        return total + (product?.costPrice || 0) * detail.quantity;
      }, 0);

      order.totalCurrentPrice = orderData?.orderDetails.reduce(
        (total, detail) => {
          const product = products.find(
            (p) => p?.barcode === detail.productBarcode,
          );
          return total + (product?.currentPrice || 0) * detail.quantity;
        },
        0,
      );
      order.totalQuantity = orderData?.orderDetails.reduce(
        (total, detail) => total + detail.quantity,
        0,
      );
    }
    // บันทึกการอัปเดต
    const updatedOrder = await this.orderRepo.save(order);

    const completeOrder = await this.orderRepo.findOne({
      where: { id: updatedOrder.id },
      relations: ['orderDetails'],
      loadEagerRelations: true,
    });
    return completeOrder;
  }
}
