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
import { CreateProductDto } from './dto/create-product.dto';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  GetProductQueryDto,
  PaginatedProductResponseDto,
} from './dto/get-product.dto';
import { Product } from './entities/product.entity';
import { ResponseEditProduct } from './dto/response.dto';
import { Roles } from 'src/auth/role/roles.decorator';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { RolesGuard } from 'src/auth/role/roles.guard';
import { Role } from 'src/auth/role/role.enum';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin, Role.Operator)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOkResponse({
    description: 'Create a new product',
    type: ResponseEditProduct,
  })
  create(@Body() dto: CreateProductDto) {
    return this.productService.insertProduct(dto);
  }

  @Post('bulk')
  @ApiOkResponse({
    description: 'Create multiple products',
    type: [ResponseEditProduct],
  })
  @ApiBody({
    type: CreateProductDto,
    isArray: true,
  })
  createMany(@Body() dtos: CreateProductDto[]) {
    return this.productService.insertMultipleProducts(dtos);
  }

  @Get()
  @ApiOkResponse({
    description: 'Get all products',
    type: PaginatedProductResponseDto,
  })
  findAll(@Query() query: GetProductQueryDto) {
    return this.productService.findProducts(query.page, query.limit);
  }

  @Get(':barcode')
  @ApiOkResponse({
    description: 'Get product by barcode',
    type: Product,
  })
  findOne(@Param('barcode') barcode: string) {
    return this.productService.findProductByBarcode(barcode);
  }

  @Patch(':barcode')
  @ApiOkResponse({
    description: 'Update product by barcode',
    type: ResponseEditProduct,
  })
  update(@Param('barcode') barcode: string, @Body() dto: CreateProductDto) {
    return this.productService.updateProduct(barcode, dto);
  }

  @Delete(':barcode')
  @ApiOkResponse({
    description: 'Delete product by barcode',
    type: ResponseEditProduct,
  })
  remove(@Param('barcode') barcode: string) {
    return this.productService.removeProduct(barcode);
  }
}
