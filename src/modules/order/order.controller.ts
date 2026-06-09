import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
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
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { toStreamableFile } from '@app/common/helpers/excel.helper';
import { ApiBearerAuth, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { BulkDeleteOrderDto } from './dto/bulk-delete-order.dto';
import { CheckExistOrderDto } from './dto/check-exist-order.dto';
import { OrderCreateDto } from './dto/create-order.dto';
import { GetOrderDto } from './dto/get-order.dto';
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
  @Get('export')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportAll(@Query() query: GetOrderDto): Promise<StreamableFile> {
    const buffer = await this.orderService.exportAll(query);
    return toStreamableFile(buffer, 'ออเดอร์');
  }

  @Roles('*')
  @Get()
  @ApiOkResponsePaginated(OrderResponseDto)
  async getAllOrders(@Query() query: GetOrderDto): Promise<PaginatedResponseDto<OrderResponseDto>> {
    return ok(await this.orderService.findAll(query));
  }

  @Roles('*')
  @Post('check-exist')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Check which order IDs exist',
    schema: {
      type: 'object',
      properties: {
        existing: { type: 'array', items: { type: 'string' } },
        missing: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiBody({ type: CheckExistOrderDto })
  async checkExistOrders(@Body() body: CheckExistOrderDto) {
    return ok(await this.orderService.checkExist(body));
  }

  @Roles('*')
  @Delete('bulk')
  @ApiOkResponse({
    description: 'Delete multiple orders',
    schema: {
      type: 'object',
      properties: {
        deleted: { type: 'array', items: { $ref: '#/components/schemas/OrderResponseDto' } },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiBody({ type: BulkDeleteOrderDto })
  async deleteManyOrders(@Body() body: BulkDeleteOrderDto) {
    return ok(await this.orderService.bulkDelete(body));
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
