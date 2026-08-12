import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { Roles } from '@app/auth/role/roles.decorator';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { ok } from '@app/common/helpers/response';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import {
  DailyRevenueDto,
  DailyRevenueQueryDto,
  DashboardFilterQueryDto,
  DashboardStatsDto,
  LowStockDto,
  LowStockQueryDto,
  RecentOrderDto,
  RecentOrdersQueryDto,
} from './dto/dashboard.dto';

@Controller({ path: 'dashboard', version: '1' })
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles('*')
  @Get('stats')
  @ApiOkResponse({ type: DashboardStatsDto })
  async getStats(@Query() query: DashboardFilterQueryDto) {
    return ok(await this.dashboardService.getStats(query));
  }

  @Roles('*')
  @Get('daily-revenue')
  @ApiOkResponse({ type: DailyRevenueDto, isArray: true })
  async getDailyRevenue(@Query() query: DailyRevenueQueryDto) {
    return ok(await this.dashboardService.getDailyRevenue(query));
  }

  @Roles('*')
  @Get('recent-orders')
  @ApiOkResponse({ type: RecentOrderDto, isArray: true })
  async getRecentOrders(@Query() query: RecentOrdersQueryDto) {
    return ok(await this.dashboardService.getRecentOrders(query));
  }

  @Roles('*')
  @Get('low-stock')
  @ApiOkResponse({ type: LowStockDto, isArray: true })
  async getLowStock(@Query() query: LowStockQueryDto) {
    return ok(await this.dashboardService.getLowStock(query));
  }
}
