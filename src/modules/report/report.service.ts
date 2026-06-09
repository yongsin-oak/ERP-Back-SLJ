import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DateTime } from 'luxon';
import { buildExcelBuffer, ExcelColumn } from '@app/common/helpers/excel.helper';
import { Order } from '../order/entities/order.entity';
import { OrderDetail } from '../order-detail/entities/orderDetail.entity';
import {
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

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(OrderDetail)
    private readonly detailRepo: Repository<OrderDetail>,
  ) {}

  private calcDetail(detail: OrderDetail): { revenue: number; cost: number } {
    const pack = detail.quantityPack ?? 0;
    const carton = detail.quantityCarton ?? 0;
    const revenue =
      pack * (detail.product?.sellPrice?.pack ?? 0) +
      carton * (detail.product?.sellPrice?.carton ?? 0);
    const cost =
      pack * (detail.product?.costPrice?.pack ?? 0) +
      carton * (detail.product?.costPrice?.carton ?? 0);
    return { revenue, cost };
  }

  async getSalesSummary(query: SalesSummaryQueryDto): Promise<SalesSummaryItemDto[]> {
    const { dateFrom, dateTo, shopId, groupBy = ReportGroupBy.Day } = query;
    const tz = 'Asia/Bangkok';
    const start = DateTime.fromISO(dateFrom, { zone: tz }).startOf('day');
    const end = DateTime.fromISO(dateTo, { zone: tz }).endOf('day');

    const qb = this.detailRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.product', 'p')
      .innerJoin('d.order', 'o')
      .addSelect(['o.startRecordAt', 'o.shopId'])
      .where('o.startRecordAt BETWEEN :start AND :end', {
        start: start.toJSDate(),
        end: end.toJSDate(),
      });

    if (shopId) {
      qb.andWhere('o.shopId = :shopId', { shopId });
    }

    const details = await qb.getMany();
    const orders = await this.orderRepo
      .createQueryBuilder('o')
      .select(['o.id', 'o.startRecordAt', 'o.shopId'])
      .where('o.startRecordAt BETWEEN :start AND :end', { start: start.toJSDate(), end: end.toJSDate() })
      .andWhere(shopId ? 'o.shopId = :shopId' : '1=1', shopId ? { shopId } : {})
      .getMany();

    const buckets = new Map<string, { revenue: number; cost: number; orderIds: Set<string> }>();

    const getKey = (dt: DateTime): string => {
      switch (groupBy) {
        case ReportGroupBy.Month:
          return dt.toFormat('yyyy-MM');
        case ReportGroupBy.Week:
          return `${dt.weekYear}-W${String(dt.weekNumber).padStart(2, '0')}`;
        default:
          return dt.toFormat('yyyy-MM-dd');
      }
    };

    for (const order of orders) {
      if (!order.startRecordAt) continue;
      const key = getKey(DateTime.fromJSDate(order.startRecordAt).setZone(tz));
      if (!buckets.has(key)) buckets.set(key, { revenue: 0, cost: 0, orderIds: new Set() });
      buckets.get(key)!.orderIds.add(order.id);
    }

    // associate details — use order join data
    const detailsWithOrder = await this.detailRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.product', 'p')
      .innerJoinAndSelect('d.order', 'o')
      .where('o.startRecordAt BETWEEN :start AND :end', { start: start.toJSDate(), end: end.toJSDate() })
      .andWhere(shopId ? 'o.shopId = :shopId' : '1=1', shopId ? { shopId } : {})
      .getMany();

    for (const d of detailsWithOrder) {
      const order = d.order as Order;
      if (!order?.startRecordAt) continue;
      const key = getKey(DateTime.fromJSDate(order.startRecordAt).setZone(tz));
      if (!buckets.has(key)) buckets.set(key, { revenue: 0, cost: 0, orderIds: new Set() });
      const { revenue, cost } = this.calcDetail(d);
      buckets.get(key)!.revenue += revenue;
      buckets.get(key)!.cost += cost;
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { revenue, cost, orderIds }]) => ({
        date,
        revenue,
        cost,
        profit: revenue - cost,
        orderCount: orderIds.size,
      }));
  }

  async getSalesByShop(query: SalesByShopQueryDto): Promise<SalesByShopItemDto[]> {
    const { dateFrom, dateTo } = query;
    const tz = 'Asia/Bangkok';
    const start = DateTime.fromISO(dateFrom, { zone: tz }).startOf('day').toJSDate();
    const end = DateTime.fromISO(dateTo, { zone: tz }).endOf('day').toJSDate();

    const detailsWithOrder = await this.detailRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.product', 'p')
      .innerJoinAndSelect('d.order', 'o')
      .innerJoinAndSelect('o.shop', 'shop')
      .where('o.startRecordAt BETWEEN :start AND :end', { start, end })
      .getMany();

    const map = new Map<
      string,
      { shopName: string; platform: string; revenue: number; cost: number; orderIds: Set<string> }
    >();

    for (const d of detailsWithOrder) {
      const order = d.order as Order;
      const shop = (order as unknown as { shop: { id: string; name: string; platform: string } }).shop;
      if (!shop) continue;
      if (!map.has(shop.id)) {
        map.set(shop.id, { shopName: shop.name, platform: shop.platform, revenue: 0, cost: 0, orderIds: new Set() });
      }
      const { revenue, cost } = this.calcDetail(d);
      map.get(shop.id)!.revenue += revenue;
      map.get(shop.id)!.cost += cost;
      map.get(shop.id)!.orderIds.add(order.id);
    }

    return Array.from(map.entries()).map(([shopId, { shopName, platform, revenue, cost, orderIds }]) => ({
      shopId,
      shopName,
      platform,
      revenue,
      cost,
      orderCount: orderIds.size,
    }));
  }

  async getSalesByProduct(query: SalesByProductQueryDto): Promise<SalesByProductItemDto[]> {
    const { dateFrom, dateTo, shopId, categoryId, brandId } = query;
    const tz = 'Asia/Bangkok';
    const start = DateTime.fromISO(dateFrom, { zone: tz }).startOf('day').toJSDate();
    const end = DateTime.fromISO(dateTo, { zone: tz }).endOf('day').toJSDate();

    const qb = this.detailRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.product', 'p')
      .innerJoin('d.order', 'o')
      .addSelect(['o.shopId'])
      .where('o.startRecordAt BETWEEN :start AND :end', { start, end });

    if (shopId) qb.andWhere('o.shopId = :shopId', { shopId });
    if (categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId });
    if (brandId) qb.andWhere('p.brandId = :brandId', { brandId });

    const details = await qb.getMany();

    const map = new Map<
      string,
      { name: string; quantityPack: number; quantityCarton: number; revenue: number; cost: number }
    >();

    for (const d of details) {
      const barcode = d.product?.barcode ?? 'unknown';
      if (!map.has(barcode)) {
        map.set(barcode, { name: d.product?.name ?? '', quantityPack: 0, quantityCarton: 0, revenue: 0, cost: 0 });
      }
      const { revenue, cost } = this.calcDetail(d);
      const row = map.get(barcode)!;
      row.quantityPack += d.quantityPack ?? 0;
      row.quantityCarton += d.quantityCarton ?? 0;
      row.revenue += revenue;
      row.cost += cost;
    }

    return Array.from(map.entries()).map(([barcode, row]) => ({
      barcode,
      name: row.name,
      quantityPack: row.quantityPack,
      quantityCarton: row.quantityCarton,
      revenue: row.revenue,
      cost: row.cost,
      profit: row.revenue - row.cost,
    }));
  }

  async getManHour(query: ManHourQueryDto): Promise<ManHourItemDto[]> {
    const { dateFrom, dateTo, employeeId } = query;
    const tz = 'Asia/Bangkok';
    const start = DateTime.fromISO(dateFrom, { zone: tz }).startOf('day').toJSDate();
    const end = DateTime.fromISO(dateTo, { zone: tz }).endOf('day').toJSDate();

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.recordBy', 'emp')
      .where('o.startRecordAt BETWEEN :start AND :end', { start, end })
      .andWhere('o.startRecordAt IS NOT NULL')
      .andWhere('o.completedRecordAt IS NOT NULL');

    if (employeeId) qb.andWhere('o.recordByEmployeeId = :employeeId', { employeeId });

    const orders = await qb.getMany();

    const map = new Map<
      string,
      { name: string; orderCount: number; totalMinutes: number }
    >();

    for (const order of orders) {
      const emp = order.recordBy;
      if (!emp) continue;
      if (!map.has(emp.id)) {
        map.set(emp.id, {
          name: `${emp.firstName} ${emp.lastName}`.trim(),
          orderCount: 0,
          totalMinutes: 0,
        });
      }
      const minutes =
        (new Date(order.completedRecordAt).getTime() - new Date(order.startRecordAt).getTime()) / 60000;
      const row = map.get(emp.id)!;
      row.orderCount += 1;
      row.totalMinutes += minutes;
    }

    return Array.from(map.entries()).map(([empId, { name, orderCount, totalMinutes }]) => ({
      employeeId: empId,
      name,
      orderCount,
      totalMinutes: Math.round(totalMinutes),
      avgMinutesPerOrder: orderCount > 0 ? Math.round(totalMinutes / orderCount) : 0,
    }));
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
