import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { Roles } from '@app/auth/role/roles.decorator';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { NoCache } from '@app/common/decorator/cache-control.decorator';
import { ApiOkResponsePaginated } from '@app/common/decorator/paginated.decorator';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { ok } from '@app/common/helpers/response';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { CreateStockEntryDto, StockEntryGetDto } from './dto/stock-entry.dto';
import { StockEntry } from './entities/stock-entry.entity';
import { StockEntryService } from './stock-entry.service';

@Controller({ path: 'stock-entry', version: '1' })
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockEntryController {
  constructor(private readonly stockEntryService: StockEntryService) {}

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
}
