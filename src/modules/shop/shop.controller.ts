import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { RolesGuard } from '@app/auth/role/roles.guard';
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
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ShopService } from './shop.service';
import { Roles } from '@app/auth/role/roles.decorator';
import { Role } from '@app/auth/role/role.enum';
import { ShopResponseDto } from './dto/response.dto';
import { ShopCreateDto } from './dto/create-shop.dto';
import { Shop } from './entities/shop.entity';
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

@Controller('shop')
@ApiTags('Shops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Roles(Role.SuperAdmin)
  @Post()
  @NoCache() // ไม่ cache การสร้าง shop
  @ApiOkResponse({
    type: ShopResponseDto,
    description: 'Create a new shop',
  })
  async createShop(@Body() body: ShopCreateDto): Promise<ShopResponseDto> {
    return this.shopService.create(body);
  }

  @Roles('*')
  @Get()
  @CacheForMinutes(10) // Cache รายการ shops เป็นเวลา 10 นาที
  @ApiOkResponsePaginated(Shop)
  async findAllShop(
    @Query() query: PaginatedGetAllDto,
  ): Promise<PaginatedResponseDto<Shop>> {
    return this.shopService.findAll(query);
  }

  @Roles('*')
  @Get(':id')
  @CacheForHours(1) // Cache ข้อมูล shop เฉพาะเป็นเวลา 1 ชั่วโมง
  @ApiOkResponse({
    type: ShopResponseDto,
    description: 'Get shop by ID',
  })
  async findOneShop(@Query('id') id: string): Promise<Shop> {
    return this.shopService.findOne(id);
  }

  @Roles(Role.SuperAdmin)
  @ApiOkResponse({
    type: ShopResponseDto,
    description: 'Update shop by ID',
  })
  @Patch(':id')
  @NoCache() // ไม่ cache การอัปเดต shop
  async updateShop(
    @Query('id') id: string,
    @Body() body: ShopCreateDto,
  ): Promise<ShopResponseDto> {
    return this.shopService.update(id, body);
  }

  @Roles(Role.SuperAdmin)
  @ApiOkResponse({
    type: ShopResponseDto,
    description: 'Delete shop by ID',
  })
  @Delete(':id')
  @NoCache() // ไม่ cache การลบ shop
  async deleteShop(@Param('id') id: string): Promise<ShopResponseDto> {
    return this.shopService.remove(id);
  }
}
