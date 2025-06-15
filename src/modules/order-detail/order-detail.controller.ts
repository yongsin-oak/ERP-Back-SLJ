import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { Roles } from 'src/auth/role/roles.decorator';
import { RolesGuard } from 'src/auth/role/roles.guard';
import { ApiOkResponsePaginated } from 'src/common/decorator/paginated.decorator';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from 'src/common/dto/paginated.dto';
import { OrderDetailResponseDto } from './dto/response-order-detail.dto';
import { OrderDetail } from './entities/orderDetail.entity';
import { OrderDetailService } from './order-detail.service';

@Controller('order-detail')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderDetailController {
  constructor(private readonly orderDetailservice: OrderDetailService) {}

  @Roles('*')
  @Get()
  @ApiOkResponsePaginated(OrderDetail)
  async findAll(
    @Query() query: PaginatedGetAllDto,
  ): Promise<PaginatedResponseDto<OrderDetail>> {
    return this.orderDetailservice.findAll(query);
  }

  @Roles('*')
  @Get('order/:orderId')
  @ApiOkResponse({ type: OrderDetailResponseDto, isArray: true })
  async findByOrderId(
    @Param('orderId') orderId: string,
  ): Promise<OrderDetailResponseDto[]> {
    return this.orderDetailservice.findByOrderId(orderId);
  }

  @Roles('*')
  @Get(':id')
  @ApiOkResponse({ type: OrderDetail })
  async findOne(@Query('id') id: string): Promise<OrderDetail> {
    return this.orderDetailservice.findOne(id);
  }
}
