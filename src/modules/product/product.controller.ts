import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductCreateDto } from './dto/create-product.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Product } from './entities/product.entity';
import { ProductResponseDto } from './dto/response.dto';
import { ProductUpdateDto } from './dto/update-product.dto';
import { BulkUpdateProductDto } from './dto/bulk-update-product.dto';
import { BulkDeleteProductDto } from './dto/bulk-delete-product.dto';
import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { Roles } from '@app/auth/role/roles.decorator';
import { Role } from '@app/auth/role/role.enum';
import { ApiOkResponsePaginated } from '@app/common/decorator/paginated.decorator';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from '@app/common/dto/paginated.dto';
import {
  CacheForMinutes,
  CacheForHours,
  NoCache,
} from '@app/common/decorator/cache-control.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Roles(Role.SuperAdmin)
  @Post()
  @NoCache() // ไม่ cache สำหรับการสร้างข้อมูล
  @ApiOkResponse({
    description: 'Create a new product',
    type: Product,
  })
  create(@Body() dto: ProductCreateDto) {
    return this.productService.create(dto);
  }

  @Roles(Role.SuperAdmin)
  @Post('bulk')
  @NoCache() // ไม่ cache สำหรับการสร้างข้อมูลแบบ bulk
  @ApiOkResponse({
    description: 'Create multiple products',
    type: [Product],
  })
  @ApiBody({
    type: ProductCreateDto,
    isArray: true,
  })
  createMany(@Body() dtos: ProductCreateDto[]) {
    return this.productService.createMultiple(dtos);
  }

  @Roles('*')
  @Get()
  @CacheForMinutes(5) // Cache รายการ products เป็นเวลา 5 นาที
  @ApiOkResponsePaginated(ProductResponseDto)
  findAll(
    @Query() query: PaginatedGetAllDto,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    return this.productService.findAll(query.page, query.limit);
  }

  @Roles('*')
  @Get(':barcode')
  @CacheForHours(1) // Cache ข้อมูล product เฉพาะเป็นเวลา 1 ชั่วโมง
  @ApiOkResponse({
    description: 'Get product by barcode',
    type: Product,
  })
  findOne(@Param('barcode') barcode: string) {
    return this.productService.findOne(barcode);
  }

  @Roles(Role.SuperAdmin)
  @Patch(':barcode')
  @NoCache() // ไม่ cache สำหรับการอัปเดตข้อมูล
  @ApiOkResponse({
    description: 'Update product by barcode',
    type: Product,
  })
  update(@Param('barcode') barcode: string, @Body() dto: ProductUpdateDto) {
    return this.productService.update(barcode, dto);
  }

  @Roles(Role.SuperAdmin)
  @Delete(':barcode')
  @NoCache() // ไม่ cache สำหรับการลบข้อมูล
  @ApiOkResponse({
    description: 'Delete product by barcode',
    type: Product,
  })
  remove(@Param('barcode') barcode: string) {
    return this.productService.remove(barcode);
  }

  @Roles(Role.SuperAdmin)
  @Patch('bulk')
  @NoCache() // ไม่ cache สำหรับการอัปเดตแบบ bulk
  @ApiOkResponse({
    description: 'Update multiple products',
    type: [Product],
  })
  @ApiBody({
    type: BulkUpdateProductDto,
  })
  updateMany(@Body() dto: BulkUpdateProductDto) {
    return this.productService.bulkUpdate(dto);
  }

  @Roles(Role.SuperAdmin)
  @Delete('bulk')
  @NoCache() // ไม่ cache สำหรับการลบแบบ bulk
  @ApiOkResponse({
    description: 'Delete multiple products',
    schema: {
      type: 'object',
      properties: {
        deleted: {
          type: 'array',
          items: { $ref: '#/components/schemas/Product' },
        },
        errors: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiBody({
    type: BulkDeleteProductDto,
  })
  removeMany(@Body() dto: BulkDeleteProductDto) {
    return this.productService.bulkDelete(dto);
  }
}
