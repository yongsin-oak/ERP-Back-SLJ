import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { Roles } from '@app/auth/role/roles.decorator';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { ApiOkResponsePaginated } from '@app/common/decorator/paginated.decorator';
import { PaginatedGetAllDto, PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { ok } from '@app/common/helpers/response';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { OrderDetailResponseDto } from './dto/response-order-detail.dto';
import { OrderDetail } from './entities/orderDetail.entity';
import { OrderDetailService } from './order-detail.service';

@Controller({ path: 'order-detail', version: '1' })
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderDetailController {
  constructor(private readonly orderDetailservice: OrderDetailService) {}

  @Roles('*')
  @Get()
  @ApiOkResponsePaginated(OrderDetail)
  async findAll(@Query() query: PaginatedGetAllDto): Promise<PaginatedResponseDto<OrderDetail>> {
    return ok(await this.orderDetailservice.findAll(query));
  }

  @Roles('*')
  @Get(':orderId')
  @ApiOkResponse({ type: OrderDetailResponseDto, isArray: true })
  async findByOrderId(@Param('orderId') orderId: string) {
    return ok(await this.orderDetailservice.findByOrderId(orderId));
  }
}
