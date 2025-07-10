import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BrandService } from './brand.service';
import { ApiBearerAuth, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { Brand } from './entities/brand.entity';
import { BrandCreateDto } from './dto/create-brand.dto';
import { BrandUpdateDto } from './dto/update-brand.dto';
import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { Roles } from '@app/auth/role/roles.decorator';
import { ApiOkResponsePaginated } from '@app/common/decorator/paginated.decorator';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from '@app/common/dto/paginated.dto';
import { Role } from '@app/auth/role/role.enum';
import {
  CacheForMinutes,
  CacheForHours,
  NoCache,
} from '@app/common/decorator/cache-control.decorator';

@Controller('brand')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  @Roles('*')
  @CacheForMinutes(10) // Cache รายการ brands เป็นเวลา 10 นาที
  @ApiOkResponsePaginated(Brand)
  async getAllBrands(
    @Query() query: PaginatedGetAllDto,
  ): Promise<PaginatedResponseDto<Brand>> {
    return this.brandService.findAll(query);
  }

  @Get(':id')
  @Roles('*')
  @CacheForHours(1) // Cache ข้อมูล brand เฉพาะเป็นเวลา 1 ชั่วโมง
  @ApiOkResponse({
    description: 'Get brand by ID',
    type: Brand,
  })
  async getBrandById(@Param('id') id: string): Promise<Brand> {
    return this.brandService.findOne(id);
  }

  @Post()
  @Roles(Role.SuperAdmin)
  @NoCache() // ไม่ cache การสร้าง brand
  @ApiOkResponse({
    description: 'Create a new brand',
    type: Brand,
  })
  async createBrand(@Body() body: BrandCreateDto): Promise<Brand> {
    return this.brandService.create(body.name, body.description);
  }

  @Post('bulk')
  @Roles(Role.SuperAdmin)
  @NoCache() // ไม่ cache การสร้างแบบ bulk
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
    return this.brandService.createMultiple(body);
  }

  @Patch(':id')
  @Roles(Role.SuperAdmin)
  @NoCache() // ไม่ cache การอัปเดต brand
  @ApiOkResponse({
    description: 'Update a brand',
    type: Brand,
  })
  async updateBrand(
    @Param('id') id: string,
    @Body() body: BrandUpdateDto,
  ): Promise<Brand> {
    return this.brandService.update(id, body.name, body.description);
  }

  @Delete(':id')
  @Roles(Role.SuperAdmin)
  @NoCache() // ไม่ cache การลบ brand
  @ApiOkResponse({
    description: 'Delete a brand',
    type: Brand,
  })
  async deleteBrand(@Param('id') id: string): Promise<Brand> {
    return this.brandService.remove(id);
  }
}
