import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { buildExcelBuffer, ExcelColumn } from '@app/common/helpers/excel.helper';
import { Employee } from '../employee/entities/employee.entity';
import { Terminal } from '../terminal/terminal.entity';
import { OrderDetail } from '../order-detail/entities/orderDetail.entity';
import { OrderDetailCreateDto } from '../order-detail/dto/create-order-detail.dto';
import { Product } from '../product/entities/product.entity';
import { Shop } from '../shop/entities/shop.entity';
import { BulkDeleteOrderDto } from './dto/bulk-delete-order.dto';
import { CheckExistOrderDto } from './dto/check-exist-order.dto';
import { OrderCreateDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/response-order.dto';
import { OrderUpdateDto } from './dto/update-order.dto';
import { GetOrderDto } from './dto/get-order.dto';
import { Order } from './entities/order.entity';
import { getEntityOrNotFound } from '@app/common/helpers/entity.helper';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { badRequest, notFound, unauthorized } from '@app/common/helpers/response';
import { applyDateRange, applyKeywordSearch, paginateQuery } from '@app/common/helpers/query.helper';
import { generateIdWithPrefix } from '@app/common/helpers/generateIdWithPrefix.helper';
import { ActorContext } from '@app/auth/jwt/actor.decorator';

/**
 * Hard ceiling for one export request. Every filter on /order/export is optional,
 * so without this a bare call would load every order (plus its details and
 * products) and build the whole workbook in memory.
 */
const ORDER_EXPORT_MAX_ROWS = 5_000;

/** Filters shared by the list and the export — the export just drops paging. */
type OrderFilters = Omit<GetOrderDto, 'page' | 'limit'>;

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(OrderDetail)
    private readonly orderDetailRepo: Repository<OrderDetail>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,

    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,

    @InjectRepository(Terminal)
    private readonly terminalRepo: Repository<Terminal>,
  ) {}

  private readonly orderRelations = {
    relations: ['recordBy', 'terminal', 'shop', 'orderDetails', 'orderDetails.product'],
    select: {
      recordBy: { id: true, firstName: true, lastName: true, nickname: true },
      terminal: { id: true, terminalCode: true, name: true, role: true, location: true, isActive: true },
      shop: { id: true, name: true, platform: true },
    },
  };

  /** One definition of the order filter block, shared by the list and the export. */
  private applyOrderFilters(qb: SelectQueryBuilder<Order>, filters: OrderFilters): void {
    const { search, status, shopId, employeeId, terminalId, dateFrom, dateTo } = filters;

    applyKeywordSearch(qb, ['o.note', 'o.orderNumber'], search);
    if (status) qb.andWhere('o.status = :status', { status });
    if (shopId) qb.andWhere('o.shopId = :shopId', { shopId });
    if (employeeId) qb.andWhere('o.recordByEmployeeId = :employeeId', { employeeId });
    if (terminalId) qb.andWhere('o.terminalId = :terminalId', { terminalId });
    applyDateRange(qb, 'o.startRecordAt', dateFrom, dateTo);
  }

  /**
   * Load the line items of the orders on the current page in one query.
   * They are fetched after pagination instead of joined into the list query
   * because a to-many join makes `getManyAndCount`'s COUNT re-join the whole
   * filtered order⋈order_detail⋈product set on every page request.
   */
  private async attachOrderDetails(orders: OrderResponseDto[]): Promise<void> {
    if (!orders.length) return;

    const details = await this.orderDetailRepo.find({
      where: { orderId: In(orders.map((o) => o.id)) },
      relations: ['product'],
      select: {
        id: true,
        orderId: true,
        quantityPack: true,
        quantityCarton: true,
        createdAt: true,
        updatedAt: true,
        product: { barcode: true, name: true, sellPrice: true },
      },
      // No ORDER BY on purpose: order_detail has no sequence column, and the
      // ids share one timestamp per order, so sorting would scramble the line
      // order the operator entered. The join this replaced returned the same
      // physical order.
    });

    const byOrderId = new Map<string, OrderDetail[]>();
    for (const detail of details) {
      const bucket = byOrderId.get(detail.orderId);
      if (bucket) bucket.push(detail);
      else byOrderId.set(detail.orderId, [detail]);
    }

    for (const order of orders) {
      order.orderDetails = byOrderId.get(order.id) ?? [];
    }
  }

  async findAll(query: GetOrderDto): Promise<PaginatedResponseDto<OrderResponseDto>> {
    const { page, limit } = query;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.recordBy', 'recordBy')
      .leftJoinAndSelect('o.terminal', 'terminal')
      .leftJoinAndSelect('o.shop', 'shop')
      .select([
        'o',
        'recordBy.id', 'recordBy.firstName', 'recordBy.lastName', 'recordBy.nickname',
        'terminal.id', 'terminal.terminalCode', 'terminal.name', 'terminal.role', 'terminal.location', 'terminal.isActive',
        'shop.id', 'shop.name', 'shop.platform',
      ])
      .orderBy('o.createdAt', 'DESC');

    this.applyOrderFilters(qb, query);

    const result = await paginateQuery<Order, OrderResponseDto>(qb, page, limit);
    await this.attachOrderDetails(result.data);

    return result;
  }

  /**
   * Resolve every line item's product in ONE lookup. This is the POS write hot
   * path, which used to issue a SELECT per line and hydrate a full Product
   * (four jsonb columns) each time; only the primary key is needed to write the
   * relation, so nothing else is selected.
   */
  private async buildOrderDetails(items: OrderDetailCreateDto[]): Promise<OrderDetail[]> {
    const barcodes = [...new Set(items.map((d) => d.productBarcode))];
    const products = await this.productRepo.find({
      where: { barcode: In(barcodes) },
      select: { barcode: true },
    });
    const productByBarcode = new Map(products.map((p) => [p.barcode, p]));

    const details: OrderDetail[] = [];
    const missing = new Set<string>();

    for (const item of items) {
      const product = productByBarcode.get(item.productBarcode);
      if (!product) {
        missing.add(item.productBarcode);
        continue;
      }
      const detail = new OrderDetail();
      detail.product = product;
      detail.quantityPack = item.quantityPack ?? 0;
      detail.quantityCarton = item.quantityCarton ?? 0;
      details.push(detail);
    }

    // Report every unknown barcode at once — the operator can fix the whole order
    // in one pass instead of resubmitting to discover the next bad line.
    if (missing.size) {
      throw notFound(`ไม่พบ ${[...missing].map((b) => `สินค้า "${b}"`).join(', ')}`);
    }

    return details;
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    return getEntityOrNotFound(
      this.orderRepo,
      { where: { id }, ...this.orderRelations },
      `ออเดอร์`,
    );
  }

  async create(dto: OrderCreateDto, actor: ActorContext): Promise<OrderResponseDto> {
    const shop = await getEntityOrNotFound(this.shopRepo, { where: { id: dto.shopId } }, `ร้านค้า`);
    // ผู้บันทึก (recordBy) มาจาก actor ที่ยืนยัน PIN เท่านั้น — ไม่เชื่อค่าจาก client
    // id มาจาก token ไม่ใช่ body: หาไม่เจอ = credential ใช้ไม่ได้ (401) ไม่ใช่ 404
    const recordBy = await this.employeeRepo.findOne({ where: { id: actor.employeeId } });
    if (!recordBy) {
      throw unauthorized(`ไม่พบพนักงานของ PIN นี้ในระบบ กรุณายืนยัน PIN ใหม่อีกครั้ง`);
    }

    const order = this.orderRepo.create({
      id: generateIdWithPrefix({ prefix: 'ORD', withDateTime: true }),
      shop,
      recordBy,
      orderNumber: dto.orderNumber,
      status: dto.status,
      startRecordAt: dto.startRecordAt ? new Date(dto.startRecordAt) : undefined,
      completedRecordAt: dto.completedRecordAt ? new Date(dto.completedRecordAt) : undefined,
      note: dto.note,
    });

    // terminal มาจาก actor token (เครื่องที่ยืนยัน PIN) — ไม่เชื่อค่าจาก client
    if (actor.terminalId) {
      const terminal = await this.terminalRepo.findOne({ where: { id: actor.terminalId } });
      if (!terminal) {
        throw unauthorized(`ไม่พบเครื่องที่ยืนยัน PIN นี้ในระบบ กรุณายืนยัน PIN ใหม่อีกครั้ง`);
      }
      order.terminal = terminal;
      order.terminalId = actor.terminalId;
    }

    if (dto.details?.length) {
      // Quantity is rejected before any product lookup, as it was before.
      for (const d of dto.details) {
        if (!d.quantityPack && !d.quantityCarton) {
          throw badRequest(`สินค้า "${d.productBarcode}": กรุณาระบุจำนวนแพ็คหรือลัง`);
        }
      }
      order.orderDetails = await this.buildOrderDetails(dto.details);
    }

    const saved = await this.orderRepo.save(order);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: OrderUpdateDto): Promise<OrderResponseDto> {
    const order = await getEntityOrNotFound(this.orderRepo, { where: { id } }, `ออเดอร์`);

    if (dto.shopId) {
      order.shop = await getEntityOrNotFound(this.shopRepo, { where: { id: dto.shopId } }, `ร้านค้า`);
    }
    // recordBy + terminal ถูกกำหนดตอนสร้างจาก actor token เท่านั้น — แก้ไขภายหลังไม่ได้
    if (dto.orderNumber !== undefined) order.orderNumber = dto.orderNumber;
    if (dto.status !== undefined) order.status = dto.status;
    if (dto.startRecordAt !== undefined) order.startRecordAt = dto.startRecordAt ? new Date(dto.startRecordAt) : null;
    if (dto.completedRecordAt !== undefined) order.completedRecordAt = dto.completedRecordAt ? new Date(dto.completedRecordAt) : null;
    if (dto.note !== undefined) order.note = dto.note;

    // NOTE: assigning the whole set makes the cascading save delete and reinsert
    // every child row. It stays that way because OrderDetailCreateDto carries no
    // detail id, so there is no stable key to diff an incoming line against an
    // existing row (a barcode is editable and may repeat within one order).
    if (dto.details?.length) {
      order.orderDetails = await this.buildOrderDetails(dto.details);
    }

    const saved = await this.orderRepo.save(order);
    return this.findOne(saved.id);
  }

  async remove(id: string): Promise<OrderResponseDto> {
    const order = await getEntityOrNotFound(
      this.orderRepo,
      { where: { id }, ...this.orderRelations },
      `ออเดอร์`,
    );
    await this.orderRepo.remove(order);
    return { ...order, id };
  }

  async checkExist(dto: CheckExistOrderDto): Promise<{ existing: string[]; missing: string[] }> {
    if (!dto.ids.length) return { existing: [], missing: [] };

    const found = await this.orderRepo.find({ where: { id: In(dto.ids) }, select: { id: true } });
    const existing = found.map((o) => o.id);
    const existingSet = new Set(existing);
    const missing = dto.ids.filter((id) => !existingSet.has(id));

    return { existing, missing };
  }

  async exportAll(query: OrderFilters): Promise<Buffer> {
    // Count first on a join-free builder: refuse an oversized export before
    // loading any row, instead of dying halfway through building the workbook.
    const countQb = this.orderRepo.createQueryBuilder('o');
    this.applyOrderFilters(countQb, query);
    const total = await countQb.getCount();

    if (total > ORDER_EXPORT_MAX_ROWS) {
      throw badRequest(
        `ข้อมูลที่เลือกมี ${total} ออเดอร์ เกินขีดจำกัดการส่งออก ${ORDER_EXPORT_MAX_ROWS} ออเดอร์ต่อครั้ง กรุณาระบุช่วงวันที่ให้แคบลงแล้วลองใหม่อีกครั้ง`,
      );
    }

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.recordBy', 'recordBy')
      .leftJoinAndSelect('o.shop', 'shop')
      .leftJoinAndSelect('o.orderDetails', 'orderDetails')
      .leftJoinAndSelect('orderDetails.product', 'product')
      .select([
        'o',
        'orderDetails',
        'recordBy.id', 'recordBy.firstName', 'recordBy.lastName', 'recordBy.nickname',
        'shop.id', 'shop.name', 'shop.platform',
        'product.barcode', 'product.name', 'product.sellPrice',
        'orderDetails.id', 'orderDetails.quantityPack', 'orderDetails.quantityCarton',
      ])
      .orderBy('o.createdAt', 'DESC');

    this.applyOrderFilters(qb, query);

    const orders = await qb.getMany();

    const columns: ExcelColumn<Order>[] = [
      { header: 'เลขออเดอร์', key: 'id', width: 22, getValue: (r) => r.id },
      { header: 'เลขคำสั่งซื้อ', key: 'orderNumber', width: 18, getValue: (r) => r.orderNumber ?? '' },
      { header: 'ร้านค้า', key: 'shop', width: 18, getValue: (r) => r.shop?.name ?? '' },
      { header: 'แพลตฟอร์ม', key: 'platform', width: 14, getValue: (r) => r.shop?.platform ?? '' },
      { header: 'พนักงาน', key: 'employee', width: 18, getValue: (r) => r.recordBy ? `${r.recordBy.firstName} ${r.recordBy.lastName}` : '' },
      { header: 'สถานะ', key: 'status', width: 12, getValue: (r) => r.status },
      {
        header: 'ยอดรวม (฿)', key: 'total', width: 14,
        getValue: (r) => (r.orderDetails ?? []).reduce((sum, d) => {
          return sum
            + (d.quantityPack ?? 0) * (d.product?.sellPrice?.pack ?? 0)
            + (d.quantityCarton ?? 0) * (d.product?.sellPrice?.carton ?? 0);
        }, 0),
      },
      { header: 'จำนวนรายการ', key: 'itemCount', width: 14, getValue: (r) => r.orderDetails?.length ?? 0 },
      { header: 'หมายเหตุ', key: 'note', width: 24, getValue: (r) => r.note ?? '' },
      { header: 'วันที่บันทึก', key: 'startRecordAt', width: 20, getValue: (r) => r.startRecordAt ? new Date(r.startRecordAt).toLocaleString('th-TH') : '' },
    ];

    return buildExcelBuffer('ออเดอร์', columns, orders);
  }

  async bulkDelete(dto: BulkDeleteOrderDto): Promise<{ deleted: OrderResponseDto[]; errors: string[] }> {
    if (!dto.ids.length) return { deleted: [], errors: [] };

    // One lookup for the whole batch instead of a findOne per id.
    const orders = await this.orderRepo.find({ where: { id: In(dto.ids) }, ...this.orderRelations });
    const orderById = new Map(orders.map((o) => [o.id, o]));

    const errors = dto.ids.filter((id) => !orderById.has(id)).map((id) => `ไม่พบออเดอร์ "${id}"`);
    if (errors.length) return { deleted: [], errors };

    try {
      // order_detail.orderId is ON DELETE CASCADE (see OrderDetail.order), so one
      // statement removes the children with their parents.
      await this.orderRepo.delete({ id: In(dto.ids) });
    } catch (error) {
      // A single DELETE is atomic — nothing was removed, so `deleted` stays empty.
      return {
        deleted: [],
        errors: [`ลบออเดอร์ไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`],
      };
    }

    // Keep the caller's id order, as the per-id loop did.
    const deleted = dto.ids
      .map((id) => orderById.get(id))
      .filter((order): order is Order => order !== undefined)
      .map((order) => ({ ...order }));

    return { deleted, errors };
  }
}
