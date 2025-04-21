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
import { ApiOkResponse } from '@nestjs/swagger';
import { BrandResponseAllDto } from './dto/response-brand.dto';
import { Brand } from './entities/brand.entity';
import { BrandGetAllDto } from './dto/get-brand.dto';
import { BrandCreateDto } from './dto/create-beand.dto';

@Controller('brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  @ApiOkResponse({
    description: 'Get all brands',
    type: [BrandResponseAllDto],
  })
  async getAllBrands(@Query() query: BrandGetAllDto) {
    return this.brandService.getAllBrands(query);
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Get brand by ID',
    type: Brand,
  })
  async getBrandById(@Param('id') id: number) {
    return this.brandService.getBrandById(id);
  }

  @Post()
  @ApiOkResponse({
    description: 'Create a new brand',
    type: Brand,
  })
  async createBrand(@Body() body: BrandCreateDto) {
    return this.brandService.createBrand(body.name, body.description);
  }

  @Post('bulk')
  @ApiOkResponse({
    description: 'Create multiple brands',
    type: [Brand],
  })
  async createManyBrands(@Body() body: BrandCreateDto[]) {
    return this.brandService.createMultipleBrand(body);
  }

  @Patch(':id')
  @ApiOkResponse({
    description: 'Update a brand',
    type: Brand,
  })
  async updateBrand(@Param('id') id: number, @Body() body: BrandCreateDto) {
    return this.brandService.updateBrand(id, body.name, body.description);
  }

  @Delete(':id')
  @ApiOkResponse({
    description: 'Delete a brand',
    type: Brand,
  })
  async deleteBrand(@Param('id') id: number) {
    return this.brandService.deleteBrand(id);
  }
}
