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
import { OrderCreateDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/response-order.dto';
import { OrderUpdateDto } from './dto/update-order.dto';
import { ApiOkResponsePaginated } from '@app/common/decorator/paginated.decorator';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { Roles } from '@app/auth/role/roles.decorator';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from '@app/common/dto/paginated.dto';
import {
  CacheForMinutes,
  NoCache,
} from '@app/common/decorator/cache-control.decorator';

@Controller('order')
@ApiBearerAuth()
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
  @CacheForMinutes(3) // Cache รายการ orders เป็นเวลา 3 นาที (เปลี่ยนบ่อย)
  async getAllOrders(
    @Query() query: PaginatedGetAllDto,
  ): Promise<PaginatedResponseDto<OrderResponseDto>> {
    return this.orderService.findAll(query);
  }

  @Roles('*')
  @ApiOkResponse({ type: OrderResponseDto })
  @Get(':id')
  @CacheForMinutes(5) // Cache ข้อมูล order เฉพาะเป็นเวลา 5 นาที
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
