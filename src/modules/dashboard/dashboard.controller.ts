import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { Roles } from '@app/auth/role/roles.decorator';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { ok } from '@app/common/helpers/response';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import {
  DailyRevenueDto,
  DashboardStatsDto,
  LowStockDto,
  RecentOrderDto,
} from './dto/dashboard.dto';

@Controller({ path: 'dashboard', version: '1' })
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles('*')
  @Get('stats')
  @ApiOkResponse({ type: DashboardStatsDto })
  async getStats() {
    return ok(await this.dashboardService.getStats());
  }

  @Roles('*')
  @Get('daily-revenue')
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiOkResponse({ type: DailyRevenueDto, isArray: true })
  async getDailyRevenue(@Query('days') days?: string) {
    return ok(await this.dashboardService.getDailyRevenue(days ? parseInt(days) : 7));
  }

  @Roles('*')
  @Get('recent-orders')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: RecentOrderDto, isArray: true })
  async getRecentOrders(@Query('limit') limit?: string) {
    return ok(await this.dashboardService.getRecentOrders(limit ? parseInt(limit) : 5));
  }

  @Roles('*')
  @Get('low-stock')
  @ApiQuery({ name: 'threshold', required: false, type: Number })
  @ApiOkResponse({ type: LowStockDto, isArray: true })
  async getLowStock(@Query('threshold') threshold?: string) {
    return ok(await this.dashboardService.getLowStock(threshold ? parseInt(threshold) : 5));
  }
}
