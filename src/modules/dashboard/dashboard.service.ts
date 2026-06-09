import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { Order } from '../order/entities/order.entity';
import { OrderDetail } from '../order-detail/entities/orderDetail.entity';
import { Product } from '../product/entities/product.entity';
import { Employee } from '../employee/entities/employee.entity';
import {
  DailyRevenueDto,
  DailyRevenueQueryDto,
  DashboardFilterQueryDto,
  DashboardStatsDto,
  LowStockDto,
  RecentOrderDto,
  RecentOrdersQueryDto,
} from './dto/dashboard.dto';

const TZ = 'Asia/Bangkok';

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

  private resolveDateRange(dateFrom?: string, dateTo?: string): { start: Date; end: Date } {
    const now = DateTime.now().setZone(TZ);
    const start = dateFrom
      ? DateTime.fromISO(dateFrom, { zone: TZ }).startOf('day').toJSDate()
      : now.startOf('day').toJSDate();
    const end = dateTo
      ? DateTime.fromISO(dateTo, { zone: TZ }).endOf('day').toJSDate()
      : now.endOf('day').toJSDate();
    return { start, end };
  }

  async getStats(query: DashboardFilterQueryDto = {}): Promise<DashboardStatsDto> {
    const { shopId, dateFrom, dateTo } = query;
    const { start, end } = this.resolveDateRange(dateFrom, dateTo);

    const [totalProducts, totalEmployees] = await Promise.all([
      this.productRepo.count(),
      this.employeeRepo.count(),
    ]);

    const totalOrdersQb = this.orderRepo.createQueryBuilder('o').select('COUNT(o.id)', 'cnt');
    if (shopId) totalOrdersQb.where('o.shopId = :shopId', { shopId });
    const totalOrders = Number((await totalOrdersQb.getRawOne<{ cnt: string }>())?.cnt ?? 0);

    const allDetailsQb = this.detailRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.product', 'p')
      .innerJoin('d.order', 'o');
    if (shopId) allDetailsQb.where('o.shopId = :shopId', { shopId });
    const { revenue: totalRevenue, cost: totalCost } = this.calcRevenue(await allDetailsQb.getMany());

    const periodOrdersQb = this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(o.id)', 'cnt')
      .where('o.createdAt BETWEEN :start AND :end', { start, end });
    if (shopId) periodOrdersQb.andWhere('o.shopId = :shopId', { shopId });
    const periodOrders = Number((await periodOrdersQb.getRawOne<{ cnt: string }>())?.cnt ?? 0);

    const periodDetailsQb = this.detailRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.product', 'p')
      .innerJoin('d.order', 'o')
      .where('o.createdAt BETWEEN :start AND :end', { start, end });
    if (shopId) periodDetailsQb.andWhere('o.shopId = :shopId', { shopId });
    const { revenue: todayRevenue, cost: todayCost } = this.calcRevenue(await periodDetailsQb.getMany());

    const lowStockCount = await this.productRepo
      .createQueryBuilder('p')
      .where('p.remaining <= COALESCE(p.minStock, 5)')
      .getCount();

    return {
      totalOrders,
      totalRevenue,
      totalCost,
      totalProducts,
      totalEmployees,
      todayOrders: periodOrders,
      todayRevenue,
      todayCost,
      lowStockCount,
    };
  }

  async getDailyRevenue(query: DailyRevenueQueryDto = {}): Promise<DailyRevenueDto[]> {
    const days = query.days ? Number(query.days) : 7;
    const { shopId } = query;
    const results: DailyRevenueDto[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const day = DateTime.now().setZone(TZ).minus({ days: i });
      const start = day.startOf('day').toJSDate();
      const end = day.endOf('day').toJSDate();

      const qb = this.detailRepo
        .createQueryBuilder('d')
        .leftJoinAndSelect('d.product', 'p')
        .innerJoin('d.order', 'o')
        .where('o.createdAt BETWEEN :start AND :end', { start, end });
      if (shopId) qb.andWhere('o.shopId = :shopId', { shopId });

      const { revenue, cost } = this.calcRevenue(await qb.getMany());
      results.push({ date: day.toFormat('yyyy-MM-dd'), revenue, cost });
    }

    return results;
  }

  async getRecentOrders(query: RecentOrdersQueryDto = {}): Promise<RecentOrderDto[]> {
    const limit = query.limit ? Number(query.limit) : 5;
    const { shopId } = query;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.shop', 'shop')
      .leftJoinAndSelect('o.orderDetails', 'od')
      .leftJoinAndSelect('od.product', 'p')
      .orderBy('o.createdAt', 'DESC')
      .take(limit);
    if (shopId) qb.where('o.shopId = :shopId', { shopId });

    const orders = await qb.getMany();

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
