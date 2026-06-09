import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { Role } from '@app/auth/role/role.enum';
import { Roles } from '@app/auth/role/roles.decorator';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { NoCache } from '@app/common/decorator/cache-control.decorator';
import { ApiOkResponsePaginated } from '@app/common/decorator/paginated.decorator';
import { PaginatedGetAllDto, PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { ok } from '@app/common/helpers/response';
import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Param, Patch, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { toStreamableFile } from '@app/common/helpers/excel.helper';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { Supplier } from './entities/supplier.entity';
import { SupplierService, UpdateSupplierDto } from './supplier.service';

@Controller({ path: 'supplier', version: '1' })
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get('export')
  @Roles('*')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportAll(@Query('search') search?: string): Promise<StreamableFile> {
    const buffer = await this.supplierService.exportAll(search);
    return toStreamableFile(buffer, 'ซัพพลายเออร์');
  }

  @Get()
  @Roles('*')
  @ApiOkResponsePaginated(Supplier)
  async getAllSuppliers(@Query() query: PaginatedGetAllDto): Promise<PaginatedResponseDto<Supplier>> {
    return ok(await this.supplierService.findAll(query));
  }

  @Get(':id')
  @Roles('*')
  @ApiOkResponse({ type: Supplier })
  async getSupplierById(@Param('id') id: string) {
    return ok(await this.supplierService.findOne(id));
  }

  @Post()
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ type: Supplier })
  async createSupplier(@Body() body: CreateSupplierDto) {
    return ok(await this.supplierService.create(body));
  }

  @Patch(':id')
  @Roles(Role.SuperAdmin)
  @ApiOkResponse({ type: Supplier })
  async updateSupplier(@Param('id') id: string, @Body() body: UpdateSupplierDto) {
    return ok(await this.supplierService.update(id, body));
  }

  @Delete(':id')
  @Roles(Role.SuperAdmin)
  @ApiOkResponse({ type: Supplier })
  async deleteSupplier(@Param('id') id: string) {
    return ok(await this.supplierService.remove(id));
  }
}
