import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { Roles } from '@app/auth/role/roles.decorator';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { NoCache } from '@app/common/decorator/cache-control.decorator';
import { ok } from '@app/common/helpers/response';
import { toStreamableFile } from '@app/common/helpers/excel.helper';
import { Controller, Get, Header, Query, StreamableFile, UseGuards } from '@nestjs/common';
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
  @Get('sales-summary/export')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportSalesSummary(@Query() query: SalesSummaryQueryDto): Promise<StreamableFile> {
    const buffer = await this.reportService.exportSalesSummary(query);
    return toStreamableFile(buffer, 'ยอดขายรวม');
  }

  @Roles('*')
  @Get('sales-by-shop')
  @ApiOkResponse({ type: SalesByShopItemDto, isArray: true })
  async getSalesByShop(@Query() query: SalesByShopQueryDto) {
    return ok(await this.reportService.getSalesByShop(query));
  }

  @Roles('*')
  @Get('sales-by-shop/export')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportSalesByShop(@Query() query: SalesByShopQueryDto): Promise<StreamableFile> {
    const buffer = await this.reportService.exportSalesByShop(query);
    return toStreamableFile(buffer, 'ยอดขายตามร้าน');
  }

  @Roles('*')
  @Get('sales-by-product')
  @ApiOkResponse({ type: SalesByProductItemDto, isArray: true })
  async getSalesByProduct(@Query() query: SalesByProductQueryDto) {
    return ok(await this.reportService.getSalesByProduct(query));
  }

  @Roles('*')
  @Get('sales-by-product/export')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportSalesByProduct(@Query() query: SalesByProductQueryDto): Promise<StreamableFile> {
    const buffer = await this.reportService.exportSalesByProduct(query);
    return toStreamableFile(buffer, 'ยอดขายตามสินค้า');
  }

  @Roles('*')
  @Get('man-hour')
  @ApiOkResponse({ type: ManHourItemDto, isArray: true })
  async getManHour(@Query() query: ManHourQueryDto) {
    return ok(await this.reportService.getManHour(query));
  }

  @Roles('*')
  @Get('man-hour/export')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportManHour(@Query() query: ManHourQueryDto): Promise<StreamableFile> {
    const buffer = await this.reportService.exportManHour(query);
    return toStreamableFile(buffer, 'ชั่วโมงทำงาน');
  }
}
