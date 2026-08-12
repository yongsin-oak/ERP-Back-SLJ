import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { Order, OrderStatus } from '../order/entities/order.entity';
import { OrderDetail } from '../order-detail/entities/orderDetail.entity';
import { Product } from '../product/entities/product.entity';
import { Employee } from '../employee/entities/employee.entity';
import {
  DAILY_REVENUE_DEFAULT_DAYS,
  DEFAULT_MIN_STOCK,
  DailyRevenueDto,
  DailyRevenueQueryDto,
  DashboardFilterQueryDto,
  DashboardStatsDto,
  LOW_STOCK_DEFAULT_LIMIT,
  LowStockDto,
  LowStockQueryDto,
  RECENT_ORDERS_DEFAULT_LIMIT,
  RecentOrderDto,
  RecentOrdersQueryDto,
} from './dto/dashboard.dto';

const TZ = 'Asia/Bangkok';

/**
 * Bangkok calendar day of an order. `order.createdAt` is `timestamp without
 * time zone`, i.e. wall clock in the DB session zone — casting to timestamptz
 * pins the real instant with that zone, then AT TIME ZONE renders it in Thai
 * local time. Doing it in one step would silently return the DB zone's day.
 */
const ORDER_DAY_EXPR = `to_char(o."createdAt"::timestamptz AT TIME ZONE '${TZ}', 'YYYY-MM-DD')`;

/**
 * SUM of a jsonb price column ({ pack, carton }) times the ordered quantities.
 * Every operand is COALESCEd because a missing price key or quantity would turn
 * the whole SUM into NULL; the outer COALESCE covers "no matching rows at all".
 * `optionalFilter` is an aggregate FILTER clause, so one scan can produce both
 * the all-time and the period totals.
 *
 * Callers must join order_detail as `d` and product as `p`.
 */
const priceSum = (priceColumn: 'sellPrice' | 'costPrice', optionalFilter = ''): string =>
  `COALESCE(SUM(
      COALESCE(d."quantityPack", 0) * COALESCE((p."${priceColumn}"->>'pack')::numeric, 0)
    + COALESCE(d."quantityCarton", 0) * COALESCE((p."${priceColumn}"->>'carton')::numeric, 0)
    )${optionalFilter}, 0)`;

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

    // The period totals are the same aggregate narrowed to the date range, so
    // FILTER them out of the same scan instead of running a second query.
    const periodFilter = ' FILTER (WHERE o."createdAt" BETWEEN :start AND :end)';

    // A cancelled order must never reach the money/count metrics.
    const ordersQb = this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(o.id)', 'total')
      .addSelect(`COUNT(o.id)${periodFilter}`, 'period')
      .where('o.status = :status', { status: OrderStatus.Completed })
      .setParameters({ start, end });
    if (shopId) ordersQb.andWhere('o.shopId = :shopId', { shopId });

    const moneyQb = this.detailRepo
      .createQueryBuilder('d')
      .innerJoin('d.order', 'o')
      .leftJoin('d.product', 'p')
      .select(priceSum('sellPrice'), 'totalRevenue')
      .addSelect(priceSum('costPrice'), 'totalCost')
      .addSelect(priceSum('sellPrice', periodFilter), 'periodRevenue')
      .addSelect(priceSum('costPrice', periodFilter), 'periodCost')
      .where('o.status = :status', { status: OrderStatus.Completed })
      .setParameters({ start, end });
    if (shopId) moneyQb.andWhere('o.shopId = :shopId', { shopId });

    const [totalProducts, totalEmployees, orderCounts, money, lowStockCount] = await Promise.all([
      this.productRepo.count(),
      this.employeeRepo.count(),
      ordersQb.getRawOne<{ total: string; period: string }>(),
      moneyQb.getRawOne<{
        totalRevenue: string;
        totalCost: string;
        periodRevenue: string;
        periodCost: string;
      }>(),
      this.productRepo
        .createQueryBuilder('p')
        .where('p.remaining <= COALESCE(p.minStock, :defaultMinStock)', {
          defaultMinStock: DEFAULT_MIN_STOCK,
        })
        .getCount(),
    ]);

    return {
      totalOrders: Number(orderCounts?.total ?? 0),
      totalRevenue: Number(money?.totalRevenue ?? 0),
      totalCost: Number(money?.totalCost ?? 0),
      totalProducts,
      totalEmployees,
      todayOrders: Number(orderCounts?.period ?? 0),
      todayRevenue: Number(money?.periodRevenue ?? 0),
      todayCost: Number(money?.periodCost ?? 0),
      lowStockCount,
    };
  }

  async getDailyRevenue(query: DailyRevenueQueryDto = {}): Promise<DailyRevenueDto[]> {
    const days = query.days ? Number(query.days) : DAILY_REVENUE_DEFAULT_DAYS;
    const { shopId } = query;

    const today = DateTime.now().setZone(TZ);
    const start = today
      .minus({ days: days - 1 })
      .startOf('day')
      .toJSDate();
    const end = today.endOf('day').toJSDate();

    const qb = this.detailRepo
      .createQueryBuilder('d')
      .innerJoin('d.order', 'o')
      .leftJoin('d.product', 'p')
      .select(ORDER_DAY_EXPR, 'date')
      .addSelect(priceSum('sellPrice'), 'revenue')
      .addSelect(priceSum('costPrice'), 'cost')
      .where('o.status = :status', { status: OrderStatus.Completed })
      .andWhere('o.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy(ORDER_DAY_EXPR);
    if (shopId) qb.andWhere('o.shopId = :shopId', { shopId });

    const rows = await qb.getRawMany<{ date: string; revenue: string; cost: string }>();
    const byDate = new Map(rows.map((row) => [row.date, row]));

    // A day with no orders still has to appear on the chart, so the axis is built
    // from the requested range and filled from the single grouped result.
    return Array.from({ length: days }, (_, index) => {
      const date = today.minus({ days: days - 1 - index }).toFormat('yyyy-MM-dd');
      const row = byDate.get(date);
      return { date, revenue: Number(row?.revenue ?? 0), cost: Number(row?.cost ?? 0) };
    });
  }

  async getRecentOrders(query: RecentOrdersQueryDto = {}): Promise<RecentOrderDto[]> {
    const limit = query.limit ? Number(query.limit) : RECENT_ORDERS_DEFAULT_LIMIT;
    const { shopId } = query;

    // Grouping on the two primary keys lets Postgres return the order total per
    // row — hydrating the details and their products just to sum them is waste.
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoin('o.shop', 'shop')
      .leftJoin('o.orderDetails', 'd')
      .leftJoin('d.product', 'p')
      .select('o.id', 'id')
      .addSelect('shop.name', 'shopName')
      .addSelect('shop.platform', 'platform')
      .addSelect('o.createdAt', 'createdAt')
      .addSelect(priceSum('sellPrice'), 'totalPrice')
      .groupBy('o.id')
      .addGroupBy('shop.id')
      .orderBy('o.createdAt', 'DESC')
      .limit(limit);
    if (shopId) qb.where('o.shopId = :shopId', { shopId });

    const rows = await qb.getRawMany<{
      id: string;
      shopName: string | null;
      platform: string | null;
      createdAt: Date;
      totalPrice: string;
    }>();

    return rows.map((row) => ({
      id: row.id,
      shopName: row.shopName ?? '',
      platform: row.platform ?? '',
      totalPrice: Number(row.totalPrice ?? 0),
      createdAt: row.createdAt,
    }));
  }

  async getLowStock(query: LowStockQueryDto = {}): Promise<LowStockDto[]> {
    const threshold = query.threshold ?? DEFAULT_MIN_STOCK;
    const limit = query.limit ?? LOW_STOCK_DEFAULT_LIMIT;

    const products = await this.productRepo
      .createQueryBuilder('p')
      .select(['p.barcode', 'p.name', 'p.remaining', 'p.minStock'])
      .where('p.remaining <= :threshold', { threshold })
      .orderBy('p.remaining', 'ASC')
      .take(limit)
      .getMany();

    return products.map((p) => ({
      barcode: p.barcode,
      name: p.name,
      remaining: p.remaining,
      minStock: p.minStock ?? 0,
    }));
  }
}
