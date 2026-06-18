import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { buildExcelBuffer, ExcelColumn } from '@app/common/helpers/excel.helper';
import { Employee } from '../employee/entities/employee.entity';
import { Terminal } from '../terminal/terminal.entity';
import { OrderDetail } from '../order-detail/entities/orderDetail.entity';
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
import { badRequest } from '@app/common/helpers/response';
import { applyDateRange, applyKeywordSearch, paginateQuery } from '@app/common/helpers/query.helper';
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

  async findAll(query: GetOrderDto): Promise<PaginatedResponseDto<OrderResponseDto>> {
    const { page, limit, search, status, shopId, employeeId, terminalId, dateFrom, dateTo } = query;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.recordBy', 'recordBy')
      .leftJoinAndSelect('o.terminal', 'terminal')
      .leftJoinAndSelect('o.shop', 'shop')
      .leftJoinAndSelect('o.orderDetails', 'orderDetails')
      .leftJoinAndSelect('orderDetails.product', 'product')
      .select([
        'o', 'orderDetails',
        'recordBy.id', 'recordBy.firstName', 'recordBy.lastName', 'recordBy.nickname',
        'terminal.id', 'terminal.terminalCode', 'terminal.name', 'terminal.role', 'terminal.location', 'terminal.isActive',
        'shop.id', 'shop.name', 'shop.platform',
        'product.barcode', 'product.name', 'product.sellPrice',
        'orderDetails.id', 'orderDetails.orderId', 'orderDetails.quantityPack', 'orderDetails.quantityCarton',
      ])
      .orderBy('o.createdAt', 'DESC');

    applyKeywordSearch(qb, ['o.note'], search);
    if (status) qb.andWhere('o.status = :status', { status });
    if (shopId) qb.andWhere('o.shopId = :shopId', { shopId });
    if (employeeId) qb.andWhere('o.recordByEmployeeId = :employeeId', { employeeId });
    if (terminalId) qb.andWhere('o.terminalId = :terminalId', { terminalId });
    applyDateRange(qb, 'o.startRecordAt', dateFrom, dateTo);

    return paginateQuery(qb, page, limit);
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    return getEntityOrNotFound(
      this.orderRepo,
      { where: { id }, ...this.orderRelations },
      `ออเดอร์`,
    );
  }

  async create(dto: OrderCreateDto): Promise<OrderResponseDto> {
    const shop = await getEntityOrNotFound(this.shopRepo, { where: { id: dto.shopId } }, `ร้านค้า`);
    const recordBy = await getEntityOrNotFound(this.employeeRepo, { where: { id: dto.recordBy } }, `พนักงาน`);

    const order = this.orderRepo.create({
      id: generateIdWithPrefix({ prefix: 'ORD', withDateTime: true }),
      shop,
      recordBy,
      status: dto.status,
      startRecordAt: dto.startRecordAt ? new Date(dto.startRecordAt) : undefined,
      completedRecordAt: dto.completedRecordAt ? new Date(dto.completedRecordAt) : undefined,
      note: dto.note,
    });

    if (dto.terminalId) {
      order.terminal = await getEntityOrNotFound(this.terminalRepo, { where: { id: dto.terminalId } }, `Terminal`);
      order.terminalId = dto.terminalId;
    }

    if (dto.details?.length) {
      order.orderDetails = await Promise.all(
        dto.details.map(async (d) => {
          if (!d.quantityPack && !d.quantityCarton) {
            throw badRequest(`สินค้า "${d.productBarcode}": กรุณาระบุจำนวนแพ็คหรือลัง`);
          }
          const product = await getEntityOrNotFound(
            this.productRepo,
            { where: { barcode: d.productBarcode } },
            `สินค้า "${d.productBarcode}"`,
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
    const order = await getEntityOrNotFound(this.orderRepo, { where: { id } }, `ออเดอร์`);

    if (dto.shopId) {
      order.shop = await getEntityOrNotFound(this.shopRepo, { where: { id: dto.shopId } }, `ร้านค้า`);
    }
    if (dto.recordBy) {
      order.recordBy = await getEntityOrNotFound(this.employeeRepo, { where: { id: dto.recordBy } }, `พนักงาน`);
    }
    if (dto.terminalId !== undefined) {
      if (dto.terminalId) {
        order.terminal = await getEntityOrNotFound(this.terminalRepo, { where: { id: dto.terminalId } }, `Terminal`);
      }
      order.terminalId = dto.terminalId ?? null;
    }
    if (dto.status !== undefined) order.status = dto.status;
    if (dto.startRecordAt !== undefined) order.startRecordAt = dto.startRecordAt ? new Date(dto.startRecordAt) : null;
    if (dto.completedRecordAt !== undefined) order.completedRecordAt = dto.completedRecordAt ? new Date(dto.completedRecordAt) : null;
    if (dto.note !== undefined) order.note = dto.note;

    if (dto.details?.length) {
      order.orderDetails = await Promise.all(
        dto.details.map(async (d) => {
          const product = await getEntityOrNotFound(
            this.productRepo,
            { where: { barcode: d.productBarcode } },
            `สินค้า "${d.productBarcode}"`,
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

  async exportAll(query: Omit<GetOrderDto, 'page' | 'limit'>): Promise<Buffer> {
    const { search, status, shopId, employeeId, terminalId, dateFrom, dateTo } = query;

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

    applyKeywordSearch(qb, ['o.note'], search);
    if (status) qb.andWhere('o.status = :status', { status });
    if (shopId) qb.andWhere('o.shopId = :shopId', { shopId });
    if (employeeId) qb.andWhere('o.recordByEmployeeId = :employeeId', { employeeId });
    if (terminalId) qb.andWhere('o.terminalId = :terminalId', { terminalId });
    applyDateRange(qb, 'o.startRecordAt', dateFrom, dateTo);

    const orders = await qb.getMany();

    const columns: ExcelColumn<Order>[] = [
      { header: 'เลขออเดอร์', key: 'id', width: 22, getValue: (r) => r.id },
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
    const ordersToDelete: Order[] = [];
    const errors: string[] = [];

    for (const id of dto.ids) {
      try {
        ordersToDelete.push(
          await getEntityOrNotFound(this.orderRepo, { where: { id }, ...this.orderRelations }, `ออเดอร์`),
        );
      } catch {
        errors.push(`ไม่พบออเดอร์ "${id}"`);
      }
    }

    if (errors.length) return { deleted: [], errors };

    const deleted: OrderResponseDto[] = [];
    for (const order of ordersToDelete) {
      try {
        const id = order.id;
        await this.orderRepo.remove(order);
        deleted.push({ ...order, id });
      } catch (error) {
        errors.push(`ลบออเดอร์ไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { deleted, errors };
  }
}
