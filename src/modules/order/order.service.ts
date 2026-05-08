import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
        'product.barcode', 'product.name',
        'orderDetails.id', 'orderDetails.orderId', 'orderDetails.quantityPack', 'orderDetails.quantityCarton',
      ])
      .orderBy('o.createdAt', 'DESC');

    if (search) {
      qb.andWhere('o.note ILIKE :search', { search: `%${search}%` });
    }
    if (status) {
      qb.andWhere('o.status = :status', { status });
    }
    if (shopId) {
      qb.andWhere('o.shopId = :shopId', { shopId });
    }
    if (employeeId) {
      qb.andWhere('o.recordByEmployeeId = :employeeId', { employeeId });
    }
    if (terminalId) {
      qb.andWhere('o.terminalId = :terminalId', { terminalId });
    }
    if (dateFrom) {
      qb.andWhere('o.startRecordAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }
    if (dateTo) {
      qb.andWhere('o.startRecordAt <= :dateTo', { dateTo: new Date(dateTo) });
    }

    const [orders, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

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
    const recordBy = await getEntityOrNotFound(this.employeeRepo, { where: { id: dto.recordBy } }, `Employee ${dto.recordBy}`);

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
      order.terminal = await getEntityOrNotFound(this.terminalRepo, { where: { id: dto.terminalId } }, `Terminal ${dto.terminalId}`);
      order.terminalId = dto.terminalId;
    }

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
    if (dto.recordBy) {
      order.recordBy = await getEntityOrNotFound(this.employeeRepo, { where: { id: dto.recordBy } }, `Employee ${dto.recordBy}`);
    }
    if (dto.terminalId !== undefined) {
      if (dto.terminalId) {
        order.terminal = await getEntityOrNotFound(this.terminalRepo, { where: { id: dto.terminalId } }, `Terminal ${dto.terminalId}`);
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

  async checkExist(dto: CheckExistOrderDto): Promise<{ existing: string[]; missing: string[] }> {
    if (!dto.ids.length) return { existing: [], missing: [] };

    const found = await this.orderRepo.find({ where: { id: In(dto.ids) }, select: { id: true } });
    const existing = found.map((o) => o.id);
    const existingSet = new Set(existing);
    const missing = dto.ids.filter((id) => !existingSet.has(id));

    return { existing, missing };
  }

  async bulkDelete(dto: BulkDeleteOrderDto): Promise<{ deleted: OrderResponseDto[]; errors: string[] }> {
    const ordersToDelete: Order[] = [];
    const errors: string[] = [];

    for (const id of dto.ids) {
      try {
        ordersToDelete.push(
          await getEntityOrNotFound(this.orderRepo, { where: { id }, ...this.orderRelations }, `Order ${id}`),
        );
      } catch {
        errors.push(`Order ${id} not found`);
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
        errors.push(`Failed to delete ${order.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { deleted, errors };
  }
}
