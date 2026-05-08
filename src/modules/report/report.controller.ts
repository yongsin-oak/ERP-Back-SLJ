import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { Roles } from '@app/auth/role/roles.decorator';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { NoCache } from '@app/common/decorator/cache-control.decorator';
import { ok } from '@app/common/helpers/response';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import {
  ManHourItemDto,
  ManHourQueryDto,
  SalesByProductItemDto,
  SalesByProductQueryDto,
  SalesByShopItemDto,
  SalesByShopQueryDto,
  SalesSummaryItemDto,
  SalesSummaryQueryDto,
} from './dto/report.dto';
import { ReportService } from './report.service';

@Controller({ path: 'report', version: '1' })
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Roles('*')
  @Get('sales-summary')
  @ApiOkResponse({ type: SalesSummaryItemDto, isArray: true })
  async getSalesSummary(@Query() query: SalesSummaryQueryDto) {
    return ok(await this.reportService.getSalesSummary(query));
  }

  @Roles('*')
  @Get('sales-by-shop')
  @ApiOkResponse({ type: SalesByShopItemDto, isArray: true })
  async getSalesByShop(@Query() query: SalesByShopQueryDto) {
    return ok(await this.reportService.getSalesByShop(query));
  }

  @Roles('*')
  @Get('sales-by-product')
  @ApiOkResponse({ type: SalesByProductItemDto, isArray: true })
  async getSalesByProduct(@Query() query: SalesByProductQueryDto) {
    return ok(await this.reportService.getSalesByProduct(query));
  }

  @Roles('*')
  @Get('man-hour')
  @ApiOkResponse({ type: ManHourItemDto, isArray: true })
  async getManHour(@Query() query: ManHourQueryDto) {
    return ok(await this.reportService.getManHour(query));
  }
}
