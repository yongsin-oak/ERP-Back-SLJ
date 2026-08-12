import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { Role } from '@app/auth/role/role.enum';
import { Roles } from '@app/auth/role/roles.decorator';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { NoCache } from '@app/common/decorator/cache-control.decorator';
import { ApiOkResponseDropdown, ApiOkResponsePaginated } from '@app/common/decorator/paginated.decorator';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { DropdownItemDto } from '@app/common/dto/dropdown-item.dto';
import { DropdownQueryDto } from '@app/common/dto/dropdown-query.dto';
import { DropdownResponseDto } from '@app/common/dto/dropdown-response.dto';
import { BrandGetDto } from './dto/get-brand.dto';
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
  async getAllBrands(@Query() query: BrandGetDto): Promise<PaginatedResponseDto<Brand>> {
    return ok(await this.brandService.findAll(query));
  }

  // Must stay above `@Get(':id')` — Nest matches routes in declaration order, so a
  // param route declared first swallows /brand/dropdown-search as id="dropdown-search".
  @Get('dropdown-search')
  @Roles('*')
  @ApiOkResponseDropdown(DropdownItemDto)
  async dropdownSearch(@Query() query: DropdownQueryDto): Promise<DropdownResponseDto<DropdownItemDto>> {
    return ok(await this.brandService.dropdownSearch(query));
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
