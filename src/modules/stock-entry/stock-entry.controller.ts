import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { Roles } from '@app/auth/role/roles.decorator';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { NoCache } from '@app/common/decorator/cache-control.decorator';
import { ApiOkResponsePaginated } from '@app/common/decorator/paginated.decorator';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { ok } from '@app/common/helpers/response';
import { Body, Controller, Get, Header, HttpCode, HttpStatus, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { toStreamableFile } from '@app/common/helpers/excel.helper';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import {
  BulkAdjustStockEntryDto,
  BulkCreateStockEntryDto,
  CreateStockEntryDto,
  StockEntryGetDto,
} from './dto/stock-entry.dto';
import { StockEntry } from './entities/stock-entry.entity';
import { StockEntryService } from './stock-entry.service';

@Controller({ path: 'stock-entry', version: '1' })
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockEntryController {
  constructor(private readonly stockEntryService: StockEntryService) {}

  @Roles('*')
  @Get('export')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportAll(@Query() query: StockEntryGetDto): Promise<StreamableFile> {
    const buffer = await this.stockEntryService.exportAll(query);
    return toStreamableFile(buffer, 'ประวัติสต็อก');
  }

  @Roles('*')
  @Get()
  @ApiOkResponsePaginated(StockEntry)
  async findAll(@Query() query: StockEntryGetDto): Promise<PaginatedResponseDto<StockEntry>> {
    return ok(await this.stockEntryService.findAll(query));
  }

  @Roles('*')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ type: StockEntry })
  async create(@Body() body: CreateStockEntryDto) {
    return ok(await this.stockEntryService.create(body));
  }

  @Roles('*')
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({
    description: 'Bulk create stock entries',
    schema: {
      type: 'object',
      properties: {
        created: { type: 'array', items: { $ref: '#/components/schemas/StockEntry' } },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async createBulk(@Body() body: BulkCreateStockEntryDto) {
    return ok(await this.stockEntryService.createBulk(body));
  }

  @Roles('*')
  @Post('bulk-adjust')
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({
    description: 'Bulk adjust stock (set actual quantity)',
    schema: {
      type: 'object',
      properties: {
        created: { type: 'array', items: { $ref: '#/components/schemas/StockEntry' } },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async createBulkAdjust(@Body() body: BulkAdjustStockEntryDto) {
    return ok(await this.stockEntryService.createBulkAdjust(body));
  }
}
