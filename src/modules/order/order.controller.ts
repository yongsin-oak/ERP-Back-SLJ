import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
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
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { OrderCreateDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/response-order.dto';
import { OrderUpdateDto } from './dto/update-order.dto';
import { OrderService } from './order.service';

@Controller({ path: 'order', version: '1' })
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Roles('*')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ type: OrderResponseDto })
  async createOrder(@Body() body: OrderCreateDto) {
    return ok(await this.orderService.create(body));
  }

  @Roles('*')
  @Get()
  @ApiOkResponsePaginated(OrderResponseDto)
  async getAllOrders(@Query() query: PaginatedGetAllDto): Promise<PaginatedResponseDto<OrderResponseDto>> {
    return ok(await this.orderService.findAll(query));
  }

  @Roles('*')
  @Get(':id')
  @ApiOkResponse({ type: OrderResponseDto })
  async getOrderById(@Param('id') id: string) {
    return ok(await this.orderService.findOne(id));
  }

  @Roles('*')
  @Patch(':id')
  @ApiOkResponse({ type: OrderResponseDto })
  async updateOrder(@Param('id') id: string, @Body() body: OrderUpdateDto) {
    return ok(await this.orderService.update(id, body));
  }

  @Roles('*')
  @Delete(':id')
  @ApiOkResponse({ type: OrderResponseDto })
  async deleteOrder(@Param('id') id: string) {
    return ok(await this.orderService.remove(id));
  }
}
