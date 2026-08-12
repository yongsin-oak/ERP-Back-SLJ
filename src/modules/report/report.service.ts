import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { badRequest } from '@app/common/helpers/response';
import { buildExcelBuffer, ExcelColumn } from '@app/common/helpers/excel.helper';
import { Order, OrderStatus } from '../order/entities/order.entity';
import { OrderDetail } from '../order-detail/entities/orderDetail.entity';
import {
  MAX_REPORT_RANGE_DAYS,
  ManHourItemDto,
  ManHourQueryDto,
  ReportGroupBy,
  SalesByProductItemDto,
  SalesByProductQueryDto,
  SalesByShopItemDto,
  SalesByShopQueryDto,
  SalesSummaryItemDto,
  SalesSummaryQueryDto,
} from './dto/report.dto';

const REPORT_TZ = 'Asia/Bangkok';

// `startRecordAt` is a `timestamp` (no zone): the pg driver writes and reads it
// using the Node process zone, so the stored value is process-local wall clock.
// SQL therefore has to re-interpret it in that zone before shifting it to
// REPORT_TZ — that is exactly what the previous in-memory
// `DateTime.fromJSDate(...).setZone(REPORT_TZ)` did. Containers run UTC while the
// business day is Bangkok, so skipping this would move every bucket by 7 hours.
const PROCESS_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Prices are jsonb `{ pack, carton }`. Each operand is COALESCEd because a
// missing product row, a NULL price blob or a missing key would otherwise turn
// the whole SUM into NULL (the JS version used `?? 0` per operand).
const REVENUE_SUM = `SUM(
  COALESCE(d.quantityPack, 0) * COALESCE((p.sellPrice ->> 'pack')::numeric, 0)
  + COALESCE(d.quantityCarton, 0) * COALESCE((p.sellPrice ->> 'carton')::numeric, 0)
)`;

const COST_SUM = `SUM(
  COALESCE(d.quantityPack, 0) * COALESCE((p.costPrice ->> 'pack')::numeric, 0)
  + COALESCE(d.quantityCarton, 0) * COALESCE((p.costPrice ->> 'carton')::numeric, 0)
)`;

// Joining details multiplies the order row, so orders must be de-duplicated.
const ORDER_COUNT = 'COUNT(DISTINCT o.id)';

// to_char patterns that reproduce the luxon bucket keys the frontend already
// receives: 'yyyy-MM-dd', ISO week `${weekYear}-W${weekNumber}`, and 'yyyy-MM'.
const DATE_BUCKET_FORMAT: Record<ReportGroupBy, string> = {
  [ReportGroupBy.Day]: 'YYYY-MM-DD',
  [ReportGroupBy.Week]: 'IYYY-"W"IW',
  [ReportGroupBy.Month]: 'YYYY-MM',
};

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(OrderDetail)
    private readonly detailRepo: Repository<OrderDetail>,
  ) {}

  /** Postgres returns numeric/bigint aggregates as strings. */
  private num(value: string | number | null | undefined): number {
    return Number(value ?? 0);
  }

  private resolveDateRange(dateFrom: string, dateTo: string): { start: Date; end: Date } {
    const start = DateTime.fromISO(dateFrom, { zone: REPORT_TZ }).startOf('day');
    const end = DateTime.fromISO(dateTo, { zone: REPORT_TZ }).endOf('day');

    if (!start.isValid || !end.isValid) {
      throw badRequest('รูปแบบวันที่ไม่ถูกต้อง');
    }

    // Reports aggregate every order in the range; without an upper bound a single
    // request (e.g. dateFrom=2000-01-01) scans the whole table.
    if (end.diff(start, 'days').days > MAX_REPORT_RANGE_DAYS) {
      throw badRequest(`ช่วงวันที่กว้างเกินไป กรุณาเลือกไม่เกิน ${MAX_REPORT_RANGE_DAYS} วัน`);
    }

    return { start: start.toJSDate(), end: end.toJSDate() };
  }

  private dateBucket(groupBy: ReportGroupBy): string {
    return `to_char((o.startRecordAt AT TIME ZONE CAST(:processTz AS text)) AT TIME ZONE CAST(:reportTz AS text), '${DATE_BUCKET_FORMAT[groupBy]}')`;
  }

  async getSalesSummary(query: SalesSummaryQueryDto): Promise<SalesSummaryItemDto[]> {
    const { dateFrom, dateTo, shopId, groupBy = ReportGroupBy.Day } = query;
    const { start, end } = this.resolveDateRange(dateFrom, dateTo);
    const bucket = this.dateBucket(groupBy);

    // Driven from `order` with LEFT JOINs so an order without details still
    // counts in its bucket (revenue 0), like the previous two-pass reduction.
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoin('o.orderDetails', 'd')
      .leftJoin('d.product', 'p')
      .select(bucket, 'date')
      .addSelect(REVENUE_SUM, 'revenue')
      .addSelect(COST_SUM, 'cost')
      .addSelect(ORDER_COUNT, 'orderCount')
      .where('o.startRecordAt BETWEEN :start AND :end', { start, end })
      .andWhere('o.status = :status', { status: OrderStatus.Completed })
      .setParameters({ processTz: PROCESS_TZ, reportTz: REPORT_TZ })
      .groupBy(bucket)
      .orderBy(bucket, 'ASC');

    if (shopId) {
      qb.andWhere('o.shopId = :shopId', { shopId });
    }

    const rows = await qb.getRawMany<{
      date: string;
      revenue: string;
      cost: string;
      orderCount: string;
    }>();

    return rows.map((row) => {
      const revenue = this.num(row.revenue);
      const cost = this.num(row.cost);
      return {
        date: row.date,
        revenue,
        cost,
        profit: revenue - cost,
        orderCount: this.num(row.orderCount),
      };
    });
  }

  async getSalesByShop(query: SalesByShopQueryDto): Promise<SalesByShopItemDto[]> {
    const { dateFrom, dateTo } = query;
    const { start, end } = this.resolveDateRange(dateFrom, dateTo);

    const rows = await this.detailRepo
      .createQueryBuilder('d')
      .innerJoin('d.order', 'o')
      .innerJoin('o.shop', 'shop')
      .leftJoin('d.product', 'p')
      .select('shop.id', 'shopId')
      .addSelect('shop.name', 'shopName')
      .addSelect('shop.platform', 'platform')
      .addSelect(REVENUE_SUM, 'revenue')
      .addSelect(COST_SUM, 'cost')
      .addSelect(ORDER_COUNT, 'orderCount')
      .where('o.startRecordAt BETWEEN :start AND :end', { start, end })
      .andWhere('o.status = :status', { status: OrderStatus.Completed })
      .groupBy('shop.id')
      .addGroupBy('shop.name')
      .addGroupBy('shop.platform')
      .orderBy('"revenue"', 'DESC')
      .getRawMany<{
        shopId: string;
        shopName: string;
        platform: string;
        revenue: string;
        cost: string;
        orderCount: string;
      }>();

    return rows.map((row) => ({
      shopId: row.shopId,
      shopName: row.shopName,
      platform: row.platform,
      revenue: this.num(row.revenue),
      cost: this.num(row.cost),
      orderCount: this.num(row.orderCount),
    }));
  }

  async getSalesByProduct(query: SalesByProductQueryDto): Promise<SalesByProductItemDto[]> {
    const { dateFrom, dateTo, shopId, categoryId, brandId } = query;
    const { start, end } = this.resolveDateRange(dateFrom, dateTo);

    const qb = this.detailRepo
      .createQueryBuilder('d')
      .innerJoin('d.order', 'o')
      .innerJoin('d.product', 'p')
      .select('p.barcode', 'barcode')
      .addSelect('p.name', 'name')
      .addSelect('SUM(COALESCE(d.quantityPack, 0))', 'quantityPack')
      .addSelect('SUM(COALESCE(d.quantityCarton, 0))', 'quantityCarton')
      .addSelect(REVENUE_SUM, 'revenue')
      .addSelect(COST_SUM, 'cost')
      .where('o.startRecordAt BETWEEN :start AND :end', { start, end })
      .andWhere('o.status = :status', { status: OrderStatus.Completed })
      .groupBy('p.barcode')
      .addGroupBy('p.name')
      .orderBy('"revenue"', 'DESC');

    if (shopId) qb.andWhere('o.shopId = :shopId', { shopId });
    if (categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId });
    if (brandId) qb.andWhere('p.brandId = :brandId', { brandId });

    const rows = await qb.getRawMany<{
      barcode: string;
      name: string;
      quantityPack: string;
      quantityCarton: string;
      revenue: string;
      cost: string;
    }>();

    return rows.map((row) => {
      const revenue = this.num(row.revenue);
      const cost = this.num(row.cost);
      return {
        barcode: row.barcode,
        name: row.name,
        quantityPack: this.num(row.quantityPack),
        quantityCarton: this.num(row.quantityCarton),
        revenue,
        cost,
        profit: revenue - cost,
      };
    });
  }

  async getManHour(query: ManHourQueryDto): Promise<ManHourItemDto[]> {
    const { dateFrom, dateTo, employeeId } = query;
    const { start, end } = this.resolveDateRange(dateFrom, dateTo);

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.recordBy', 'emp')
      .select('emp.id', 'employeeId')
      .addSelect('emp.firstName', 'firstName')
      .addSelect('emp.lastName', 'lastName')
      .addSelect('COUNT(o.id)', 'orderCount')
      .addSelect('SUM(EXTRACT(EPOCH FROM (o.completedRecordAt - o.startRecordAt)) / 60)', 'totalMinutes')
      .where('o.startRecordAt BETWEEN :start AND :end', { start, end })
      .andWhere('o.startRecordAt IS NOT NULL')
      .andWhere('o.completedRecordAt IS NOT NULL')
      .andWhere('o.status = :status', { status: OrderStatus.Completed })
      .groupBy('emp.id')
      .addGroupBy('emp.firstName')
      .addGroupBy('emp.lastName')
      .orderBy('"totalMinutes"', 'DESC');

    if (employeeId) qb.andWhere('o.recordByEmployeeId = :employeeId', { employeeId });

    const rows = await qb.getRawMany<{
      employeeId: string;
      firstName: string;
      lastName: string;
      orderCount: string;
      totalMinutes: string;
    }>();

    return rows.map((row) => {
      const orderCount = this.num(row.orderCount);
      // Round only on the way out — the average is derived from the unrounded total.
      const totalMinutes = this.num(row.totalMinutes);
      return {
        employeeId: row.employeeId,
        name: `${row.firstName} ${row.lastName}`.trim(),
        orderCount,
        totalMinutes: Math.round(totalMinutes),
        avgMinutesPerOrder: orderCount > 0 ? Math.round(totalMinutes / orderCount) : 0,
      };
    });
  }

  async exportSalesSummary(query: SalesSummaryQueryDto): Promise<Buffer> {
    const rows = await this.getSalesSummary(query);
    const columns: ExcelColumn<(typeof rows)[0]>[] = [
      { header: 'วันที่', key: 'date', width: 16, getValue: (r) => r.date },
      { header: 'ยอดขาย (฿)', key: 'revenue', width: 16, getValue: (r) => r.revenue },
      { header: 'ต้นทุน (฿)', key: 'cost', width: 16, getValue: (r) => r.cost },
      { header: 'กำไร (฿)', key: 'profit', width: 16, getValue: (r) => r.profit },
      { header: 'จำนวนออเดอร์', key: 'orderCount', width: 14, getValue: (r) => r.orderCount },
    ];
    return buildExcelBuffer('ยอดขายรวม', columns, rows);
  }

  async exportSalesByShop(query: SalesByShopQueryDto): Promise<Buffer> {
    const rows = await this.getSalesByShop(query);
    const columns: ExcelColumn<(typeof rows)[0]>[] = [
      { header: 'ร้านค้า', key: 'shopName', width: 20, getValue: (r) => r.shopName },
      { header: 'แพลตฟอร์ม', key: 'platform', width: 14, getValue: (r) => r.platform },
      { header: 'ยอดขาย (฿)', key: 'revenue', width: 16, getValue: (r) => r.revenue },
      { header: 'ต้นทุน (฿)', key: 'cost', width: 16, getValue: (r) => r.cost },
      { header: 'จำนวนออเดอร์', key: 'orderCount', width: 14, getValue: (r) => r.orderCount },
    ];
    return buildExcelBuffer('ยอดขายตามร้าน', columns, rows);
  }

  async exportSalesByProduct(query: SalesByProductQueryDto): Promise<Buffer> {
    const rows = await this.getSalesByProduct(query);
    const columns: ExcelColumn<(typeof rows)[0]>[] = [
      { header: 'Barcode', key: 'barcode', width: 18, getValue: (r) => r.barcode },
      { header: 'ชื่อสินค้า', key: 'name', width: 28, getValue: (r) => r.name },
      { header: 'จำนวน (แพ็ค)', key: 'quantityPack', width: 14, getValue: (r) => r.quantityPack },
      { header: 'จำนวน (ลัง)', key: 'quantityCarton', width: 14, getValue: (r) => r.quantityCarton },
      { header: 'ยอดขาย (฿)', key: 'revenue', width: 16, getValue: (r) => r.revenue },
      { header: 'ต้นทุน (฿)', key: 'cost', width: 16, getValue: (r) => r.cost },
      { header: 'กำไร (฿)', key: 'profit', width: 16, getValue: (r) => r.profit },
    ];
    return buildExcelBuffer('ยอดขายตามสินค้า', columns, rows);
  }

  async exportManHour(query: ManHourQueryDto): Promise<Buffer> {
    const rows = await this.getManHour(query);
    const columns: ExcelColumn<(typeof rows)[0]>[] = [
      { header: 'พนักงาน', key: 'name', width: 22, getValue: (r) => r.name },
      { header: 'จำนวนออเดอร์', key: 'orderCount', width: 14, getValue: (r) => r.orderCount },
      { header: 'รวม (นาที)', key: 'totalMinutes', width: 14, getValue: (r) => r.totalMinutes },
      { header: 'เฉลี่ย (นาที/ออเดอร์)', key: 'avgMinutesPerOrder', width: 20, getValue: (r) => r.avgMinutesPerOrder },
    ];
    return buildExcelBuffer('ชั่วโมงทำงาน', columns, rows);
  }
}
