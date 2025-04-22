import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BrandService } from './brand.service';
import { ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { Brand } from './entities/brand.entity';
import { BrandCreateDto } from './dto/create-brand.dto';
import { BrandUpdateDto } from './dto/update-brand.dto';
import { ApiOkResponsePaginated } from 'src/common/decorator/paginated.decorator';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from 'src/common/dto/paginated.dto';

@Controller('brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  @ApiOkResponsePaginated(Brand)
  async getAllBrands(
    @Query() query: PaginatedGetAllDto,
  ): Promise<PaginatedResponseDto<Brand>> {
    return this.brandService.getAllBrands(query);
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Get brand by ID',
    type: Brand,
  })
  async getBrandById(@Param('id') id: number): Promise<Brand> {
    return this.brandService.getBrandById(id);
  }

  @Post()
  @ApiOkResponse({
    description: 'Create a new brand',
    type: Brand,
  })
  async createBrand(@Body() body: BrandCreateDto): Promise<Brand> {
    return this.brandService.createBrand(body.name, body.description);
  }

  @Post('bulk')
  @ApiOkResponse({
    description: 'Create multiple brands',
    type: Brand,
    isArray: true,
  })
  @ApiBody({
    type: BrandCreateDto,
    isArray: true,
  })
  async createManyBrands(@Body() body: BrandCreateDto[]): Promise<Brand[]> {
    return this.brandService.createMultipleBrand(body);
  }

  @Patch(':id')
  @ApiOkResponse({
    description: 'Update a brand',
    type: Brand,
  })
  async updateBrand(
    @Param('id') id: number,
    @Body() body: BrandUpdateDto,
  ): Promise<Brand> {
    return this.brandService.updateBrand(id, body.name, body.description);
  }

  @Delete(':id')
  @ApiOkResponse({
    description: 'Delete a brand',
    type: Brand,
  })
  async deleteBrand(@Param('id') id: number): Promise<Brand> {
    return this.brandService.deleteBrand(id);
  }
}
