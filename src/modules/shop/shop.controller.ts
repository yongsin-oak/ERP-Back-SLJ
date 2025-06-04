import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { RolesGuard } from 'src/auth/role/roles.guard';
import { ShopService } from './shop.service';
import { Role } from 'src/auth/role/role.enum';
import { Roles } from 'src/auth/role/roles.decorator';
import { ShopCreateDto } from './dto/create-shop.dto';
import { ShopResponseDto } from './dto/response.dto';
import { ApiOkResponsePaginated } from 'src/common/decorator/paginated.decorator';
import { Shop } from './entities/shop.entity';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from 'src/common/dto/paginated.dto';

@Controller('shop')
@ApiTags('Shops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Roles(Role.SuperAdmin)
  @Post()
  @ApiOkResponse({
    type: ShopResponseDto,
    description: 'Create a new shop',
  })
  async createShop(@Body() body: ShopCreateDto): Promise<ShopResponseDto> {
    return this.shopService.create(body);
  }

  @Roles('*')
  @Get()
  @ApiOkResponsePaginated(Shop)
  async findAllShop(
    @Query() query: PaginatedGetAllDto,
  ): Promise<PaginatedResponseDto<Shop>> {
    return this.shopService.findAll(query);
  }

  @Roles('*')
  @Get(':id')
  @ApiOkResponse({
    type: ShopResponseDto,
    description: 'Get shop by ID',
  })
  async findOneShop(@Query('id') id: number): Promise<Shop> {
    return this.shopService.findOne(id);
  }

  @Roles(Role.SuperAdmin)
  @ApiOkResponse({
    type: ShopResponseDto,
    description: 'Update shop by ID',
  })
  @Patch(':id')
  async updateShop(
    @Query('id') id: number,
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
  async deleteShop(@Query('id') id: number): Promise<ShopResponseDto> {
    return this.shopService.remove(id);
  }
}
