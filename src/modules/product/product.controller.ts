import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { Role } from '@app/auth/role/role.enum';
import { Roles } from '@app/auth/role/roles.decorator';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { NoCache } from '@app/common/decorator/cache-control.decorator';
import { ApiOkResponsePaginated } from '@app/common/decorator/paginated.decorator';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { ok } from '@app/common/helpers/response';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { toStreamableFile } from '@app/common/helpers/excel.helper';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BulkDeleteProductDto } from './dto/bulk-delete-product.dto';
import { BulkUpdateProductDto } from './dto/bulk-update-product.dto';
import { CheckExistProductDto } from './dto/check-exist-product.dto';
import { ProductCreateDto } from './dto/create-product.dto';
import { ProductDropdownItemDto, ProductDropdownSearchDto } from './dto/dropdown-search-product.dto';
import { ProductGetDto } from './dto/get-product.dto';
import { ProductResponseDto } from './dto/response.dto';
import { CreateShopPriceDto, UpdateShopPriceDto } from './dto/shop-price.dto';
import { ProductUpdateDto } from './dto/update-product.dto';
import { ProductShopPrice } from './entities/product-shop-price.entity';
import { Product } from './entities/product.entity';
import { ProductService } from './product.service';

@ApiTags('Product')
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'product', version: '1' })
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Roles(Role.SuperAdmin)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: 'Create a new product', type: Product })
  async create(@Body() dto: ProductCreateDto) {
    return ok(await this.productService.create(dto));
  }

  @Roles(Role.SuperAdmin)
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: 'Create multiple products', type: Product, isArray: true })
  @ApiBody({ type: ProductCreateDto, isArray: true })
  async createMany(@Body() dtos: ProductCreateDto[]) {
    return ok(await this.productService.createMultiple(dtos));
  }

  @Roles('*')
  @Get('export')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportAll(@Query() query: ProductGetDto): Promise<StreamableFile> {
    const buffer = await this.productService.exportAll(query);
    return toStreamableFile(buffer, 'สินค้า');
  }

  @Roles('*')
  @Get()
  @ApiOkResponsePaginated(ProductResponseDto)
  async findAll(@Query() query: ProductGetDto): Promise<PaginatedResponseDto<ProductResponseDto>> {
    return ok(await this.productService.findAll(query));
  }

  @Roles('*')
  @Get('dropdown-search')
  @ApiOkResponsePaginated(ProductDropdownItemDto)
  async dropdownSearch(@Query() query: ProductDropdownSearchDto) {
    return ok(await this.productService.dropdownSearch(query));
  }

  @Roles('*')
  @Post('check-exist')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Check which product barcodes exist',
    schema: {
      type: 'object',
      properties: {
        existing: { type: 'array', items: { type: 'string' } },
        missing: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiBody({ type: CheckExistProductDto })
  async checkExistProducts(@Body() dto: CheckExistProductDto) {
    return ok(await this.productService.checkExist(dto));
  }

  @Roles(Role.SuperAdmin)
  @Patch('bulk')
  @ApiOkResponse({ description: 'Update multiple products', type: Product, isArray: true })
  @ApiBody({ type: BulkUpdateProductDto })
  async updateMany(@Body() dto: BulkUpdateProductDto) {
    return ok(await this.productService.bulkUpdate(dto));
  }

  @Roles(Role.SuperAdmin)
  @Delete('bulk')
  @ApiOkResponse({
    description: 'Delete multiple products',
    schema: {
      type: 'object',
      properties: {
        deleted: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiBody({ type: BulkDeleteProductDto })
  async removeMany(@Body() dto: BulkDeleteProductDto) {
    return ok(await this.productService.bulkDelete(dto));
  }

  @Roles('*')
  @Get(':barcode')
  @ApiOkResponse({ description: 'Get product by barcode', type: Product })
  async findOne(@Param('barcode') barcode: string) {
    return ok(await this.productService.findOne(barcode));
  }

  @Roles(Role.SuperAdmin)
  @Patch(':barcode')
  @ApiOkResponse({ description: 'Update product by barcode', type: Product })
  async update(@Param('barcode') barcode: string, @Body() dto: ProductUpdateDto) {
    return ok(await this.productService.update(barcode, dto));
  }

  @Roles(Role.SuperAdmin)
  @Delete(':barcode')
  @ApiOkResponse({ description: 'Delete product by barcode', type: Product })
  async remove(@Param('barcode') barcode: string) {
    return ok(await this.productService.remove(barcode));
  }

  @Roles('*')
  @Get(':barcode/shop-price')
  @ApiOkResponse({ description: 'Get all shop prices for a product', type: ProductShopPrice, isArray: true })
  async getShopPrices(@Param('barcode') barcode: string) {
    return ok(await this.productService.getShopPrices(barcode));
  }

  @Roles(Role.SuperAdmin)
  @Post(':barcode/shop-price')
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: 'Set shop-specific price', type: ProductShopPrice })
  async createShopPrice(@Param('barcode') barcode: string, @Body() dto: CreateShopPriceDto) {
    return ok(await this.productService.createShopPrice(barcode, dto));
  }

  @Roles(Role.SuperAdmin)
  @Patch(':barcode/shop-price/:shopId')
  @ApiOkResponse({ description: 'Update shop-specific price', type: ProductShopPrice })
  async updateShopPrice(
    @Param('barcode') barcode: string,
    @Param('shopId') shopId: string,
    @Body() dto: UpdateShopPriceDto,
  ) {
    return ok(await this.productService.updateShopPrice(barcode, shopId, dto));
  }

  @Roles(Role.SuperAdmin)
  @Delete(':barcode/shop-price/:shopId')
  @ApiOkResponse({ description: 'Delete shop-specific price', type: ProductShopPrice })
  async deleteShopPrice(@Param('barcode') barcode: string, @Param('shopId') shopId: string) {
    return ok(await this.productService.deleteShopPrice(barcode, shopId));
  }
}
