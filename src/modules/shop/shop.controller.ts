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
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ShopCreateDto } from './dto/create-shop.dto';
import { ShopGetDto } from './dto/get-shop.dto';
import { ShopResponseDto } from './dto/response.dto';
import { Shop } from './entities/shop.entity';
import { ShopService } from './shop.service';

@Controller({ path: 'shop', version: '1' })
@ApiTags('Shops')
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Roles(Role.SuperAdmin)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ type: ShopResponseDto, description: 'Create a new shop' })
  async createShop(@Body() body: ShopCreateDto) {
    return ok(await this.shopService.create(body));
  }

  @Roles('*')
  @Get()
  @ApiOkResponsePaginated(Shop)
  async findAllShop(@Query() query: ShopGetDto): Promise<PaginatedResponseDto<Shop>> {
    return ok(await this.shopService.findAll(query));
  }

  @Roles('*')
  @Get(':id')
  @ApiOkResponse({ type: ShopResponseDto, description: 'Get shop by ID' })
  async findOneShop(@Param('id') id: string) {
    return ok(await this.shopService.findOne(id));
  }

  @Roles(Role.SuperAdmin)
  @Patch(':id')
  @ApiOkResponse({ type: ShopResponseDto, description: 'Update shop by ID' })
  async updateShop(@Param('id') id: string, @Body() body: ShopCreateDto) {
    return ok(await this.shopService.update(id, body));
  }

  @Roles(Role.SuperAdmin)
  @Delete(':id')
  @ApiOkResponse({ type: ShopResponseDto, description: 'Delete shop by ID' })
  async deleteShop(@Param('id') id: string) {
    return ok(await this.shopService.remove(id));
  }
}
