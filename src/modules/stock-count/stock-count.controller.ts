import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StreamableFile } from '@nestjs/common';
import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { Roles } from '@app/auth/role/roles.decorator';
import { toStreamableFile } from '@app/common/helpers/excel.helper';
import { StockCountService } from './stock-count.service';
import {
  CreateStockCountDto,
  GetStockCountDto,
  UpdateStockCountItemsDto,
} from './dto/stock-count.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock-count')
export class StockCountController {
  constructor(private readonly stockCountService: StockCountService) {}

  @Roles('*')
  @Post()
  create(@Body() dto: CreateStockCountDto) {
    return this.stockCountService.create(dto);
  }

  @Roles('*')
  @Get()
  findAll(@Query() query: GetStockCountDto) {
    return this.stockCountService.findAll(query);
  }

  @Roles('*')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockCountService.findOne(id);
  }

  @Roles('*')
  @Patch(':id/items')
  updateItems(@Param('id') id: string, @Body() dto: UpdateStockCountItemsDto) {
    return this.stockCountService.updateItems(id, dto);
  }

  @Roles('*')
  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.stockCountService.complete(id);
  }

  @Roles('*')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stockCountService.remove(id);
  }

  @Roles('*')
  @Get(':id/export/blank')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportBlank(@Param('id') id: string): Promise<StreamableFile> {
    const buffer = await this.stockCountService.exportBlank(id);
    return toStreamableFile(buffer, 'นับสต็อก-blank');
  }

  @Roles('*')
  @Get(':id/export/result')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportResult(@Param('id') id: string): Promise<StreamableFile> {
    const buffer = await this.stockCountService.exportResult(id);
    return toStreamableFile(buffer, 'ผลนับสต็อก');
  }
}
