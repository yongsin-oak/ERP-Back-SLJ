import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { Order } from '../order/entities/order.entity';
import { OrderDetail } from '../order-detail/entities/orderDetail.entity';
import { Product } from '../product/entities/product.entity';
import { Employee } from '../employee/entities/employee.entity';
import {
  DailyRevenueDto,
  DashboardStatsDto,
  LowStockDto,
  RecentOrderDto,
} from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(OrderDetail)
    private readonly detailRepo: Repository<OrderDetail>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  private calcRevenue(details: OrderDetail[]): { revenue: number; cost: number } {
    return details.reduce(
      (acc, d) => {
        const pack = d.quantityPack ?? 0;
        const carton = d.quantityCarton ?? 0;
        acc.revenue += pack * (d.product?.sellPrice?.pack ?? 0) + carton * (d.product?.sellPrice?.carton ?? 0);
        acc.cost += pack * (d.product?.costPrice?.pack ?? 0) + carton * (d.product?.costPrice?.carton ?? 0);
        return acc;
      },
      { revenue: 0, cost: 0 },
    );
  }

  async getStats(): Promise<DashboardStatsDto> {
    const todayStart = DateTime.now().setZone('Asia/Bangkok').startOf('day').toJSDate();
    const todayEnd = DateTime.now().setZone('Asia/Bangkok').endOf('day').toJSDate();

    const [totalOrders, totalProducts, totalEmployees] = await Promise.all([
      this.orderRepo.count(),
      this.productRepo.count(),
      this.employeeRepo.count(),
    ]);

    const allDetails = await this.detailRepo.find({ relations: ['product'] });
    const { revenue: totalRevenue, cost: totalCost } = this.calcRevenue(allDetails);

    const todayOrders = await this.orderRepo.count({
      where: { createdAt: Between(todayStart, todayEnd) },
    });

    const todayDetails = await this.detailRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.product', 'p')
      .innerJoin('d.order', 'o')
      .where('o.createdAt BETWEEN :start AND :end', { start: todayStart, end: todayEnd })
      .getMany();

    const { revenue: todayRevenue, cost: todayCost } = this.calcRevenue(todayDetails);

    const lowStockCount = await this.productRepo
      .createQueryBuilder('p')
      .where('p.remaining <= COALESCE(p.minStock, 5)')
      .getCount();

    return { totalOrders, totalRevenue, totalCost, totalProducts, totalEmployees, todayOrders, todayRevenue, todayCost, lowStockCount };
  }

  async getDailyRevenue(days = 7): Promise<DailyRevenueDto[]> {
    const tz = 'Asia/Bangkok';
    const results: DailyRevenueDto[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const day = DateTime.now().setZone(tz).minus({ days: i });
      const start = day.startOf('day').toJSDate();
      const end = day.endOf('day').toJSDate();

      const details = await this.detailRepo
        .createQueryBuilder('d')
        .leftJoinAndSelect('d.product', 'p')
        .innerJoin('d.order', 'o')
        .where('o.createdAt BETWEEN :start AND :end', { start, end })
        .getMany();

      const { revenue, cost } = this.calcRevenue(details);
      results.push({ date: day.toFormat('yyyy-MM-dd'), revenue, cost });
    }

    return results;
  }

  async getRecentOrders(limit = 5): Promise<RecentOrderDto[]> {
    const orders = await this.orderRepo.find({
      relations: ['shop', 'orderDetails', 'orderDetails.product'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return orders.map((o) => {
      const { revenue } = this.calcRevenue(o.orderDetails ?? []);
      return {
        id: o.id,
        shopName: o.shop?.name ?? '',
        platform: o.shop?.platform ?? '',
        totalPrice: revenue,
        createdAt: o.createdAt,
      };
    });
  }

  async getLowStock(threshold = 5): Promise<LowStockDto[]> {
    const products = await this.productRepo
      .createQueryBuilder('p')
      .where('p.remaining <= :threshold', { threshold })
      .orderBy('p.remaining', 'ASC')
      .getMany();

    return products.map((p) => ({
      barcode: p.barcode,
      name: p.name,
      remaining: p.remaining,
      minStock: p.minStock ?? 0,
    }));
  }
}
