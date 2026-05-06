import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { PartialType } from '@nestjs/swagger';
import { getEntityOrNotFound, throwIfEntityExists } from '@app/common/helpers/entity.helper';
import { PaginatedGetAllDto, PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { paginatedResponse } from '@app/common/helpers/response';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
  ) {}

  async findAll(query: PaginatedGetAllDto): Promise<PaginatedResponseDto<Supplier>> {
    const { page, limit } = query;
    const [suppliers, total] = await this.supplierRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { name: 'ASC' },
    });
    return paginatedResponse(suppliers, page, limit, total);
  }

  async findOne(id: string): Promise<Supplier> {
    return getEntityOrNotFound(this.supplierRepo, { where: { id } }, `Supplier ${id}`);
  }

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    await throwIfEntityExists(this.supplierRepo, { where: { name: dto.name } }, `Supplier "${dto.name}"`);
    return this.supplierRepo.save(this.supplierRepo.create(dto));
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await getEntityOrNotFound(this.supplierRepo, { where: { id } }, `Supplier ${id}`);
    if (dto.name && dto.name !== supplier.name) {
      await throwIfEntityExists(this.supplierRepo, { where: { name: dto.name } }, `Supplier "${dto.name}"`);
    }
    Object.assign(supplier, dto);
    return this.supplierRepo.save(supplier);
  }

  async remove(id: string): Promise<Supplier> {
    const supplier = await getEntityOrNotFound(this.supplierRepo, { where: { id } }, `Supplier ${id}`);
    await this.supplierRepo.delete(id);
    return supplier;
  }
}
