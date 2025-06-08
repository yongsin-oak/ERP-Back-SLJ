import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { OrderDetailService } from './order-detail.service';
import { OrderDetailCreateDto } from './dto/create-order-detail.dto';
import { OrderDetail } from './entities/orderDetail.entity';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { RolesGuard } from 'src/auth/role/roles.guard';
import { Roles } from 'src/auth/role/roles.decorator';
import { ApiOkResponsePaginated } from 'src/common/decorator/paginated.decorator';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from 'src/common/dto/paginated.dto';

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
  @Get(':id')
  @ApiOkResponse({ type: OrderDetail })
  async findOne(@Query('id') id: string): Promise<OrderDetail> {
    return this.orderDetailservice.findOne(id);
  }
}
