import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { RolesGuard } from 'src/auth/role/roles.guard';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from 'src/auth/role/roles.decorator';
import { OrderCreateDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { OrderResponseDto } from './dto/response-order.dto';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from 'src/common/dto/paginated.dto';
import { ApiOkResponsePaginated } from 'src/common/decorator/paginated.decorator';
import { OrderUpdateDto } from './dto/update-order.dto';

@Controller('order')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Roles('*')
  @Post()
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
  @ApiOkResponse({ type: OrderResponseDto })
  async updateOrder(
    @Query('id') id: string,
    @Body() body: OrderUpdateDto,
  ): Promise<OrderResponseDto> {
    return this.orderService.update(id, body);
  }
}
