import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { Role } from '@app/auth/role/role.enum';
import { Roles } from '@app/auth/role/roles.decorator';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { NoCache } from '@app/common/decorator/cache-control.decorator';
import { ApiOkResponsePaginated } from '@app/common/decorator/paginated.decorator';
import { PaginatedGetAllDto, PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { ok } from '@app/common/helpers/response';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { BrandService } from './brand.service';
import { BrandCreateDto } from './dto/create-brand.dto';
import { BrandUpdateDto } from './dto/update-brand.dto';
import { Brand } from './entities/brand.entity';

@Controller({ path: 'brand', version: '1' })
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  @Roles('*')
  @ApiOkResponsePaginated(Brand)
  async getAllBrands(@Query() query: PaginatedGetAllDto): Promise<PaginatedResponseDto<Brand>> {
    return ok(await this.brandService.findAll(query));
  }

  @Get(':id')
  @Roles('*')
  @ApiOkResponse({ description: 'Get brand by ID', type: Brand })
  async getBrandById(@Param('id') id: string) {
    return ok(await this.brandService.findOne(id));
  }

  @Post()
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: 'Create a new brand', type: Brand })
  async createBrand(@Body() body: BrandCreateDto) {
    return ok(await this.brandService.create(body.name, body.description));
  }

  @Post('bulk')
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: 'Create multiple brands', type: Brand, isArray: true })
  @ApiBody({ type: BrandCreateDto, isArray: true })
  async createManyBrands(@Body() body: BrandCreateDto[]) {
    return ok(await this.brandService.createMultiple(body));
  }

  @Patch(':id')
  @Roles(Role.SuperAdmin)
  @ApiOkResponse({ description: 'Update a brand', type: Brand })
  async updateBrand(@Param('id') id: string, @Body() body: BrandUpdateDto) {
    return ok(await this.brandService.update(id, body.name, body.description));
  }

  @Delete(':id')
  @Roles(Role.SuperAdmin)
  @ApiOkResponse({ description: 'Delete a brand', type: Brand })
  async deleteBrand(@Param('id') id: string) {
    return ok(await this.brandService.remove(id));
  }
}
