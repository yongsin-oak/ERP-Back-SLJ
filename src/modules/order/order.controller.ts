import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { Roles } from '@app/auth/role/roles.decorator';
import { RolesGuard } from '@app/auth/role/roles.guard';
import {
  NoCache
} from '@app/common/decorator/cache-control.decorator';
import { ApiOkResponsePaginated } from '@app/common/decorator/paginated.decorator';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from '@app/common/dto/paginated.dto';
import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { OrderCreateDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/response-order.dto';
import { OrderUpdateDto } from './dto/update-order.dto';
import { OrderService } from './order.service';

@Controller('order')
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Roles('*')
  @Post()
  @NoCache() // ไม่ cache การสร้าง order
  @ApiOkResponse({ type: OrderResponseDto })
  async createOrder(@Body() body: OrderCreateDto): Promise<OrderResponseDto> {
    return this.orderService.create(body);
  }

  @Roles('*')
  @ApiOkResponsePaginated(OrderResponseDto)
  @Get()
  async getAllOrders(
    @Query() query: PaginatedGetAllDto,
  ): Promise<PaginatedResponseDto<OrderResponseDto>> {
    return this.orderService.findAll(query);
  }

  @Roles('*')
  @ApiOkResponse({ type: OrderResponseDto })
  @Get(':id')
  async getOrderById(@Query('id') id: string): Promise<OrderResponseDto> {
    return this.orderService.findOne(id);
  }

  @Roles('*')
  @Patch(':id')
  @NoCache() // ไม่ cache การอัปเดต order
  @ApiOkResponse({ type: OrderResponseDto })
  async updateOrder(
    @Query('id') id: string,
    @Body() body: OrderUpdateDto,
  ): Promise<OrderResponseDto> {
    return this.orderService.update(id, body);
  }
}
