import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/entities/product.entity';
import { StockEntry } from '../stock-entry/entities/stock-entry.entity';
import { StockCount } from './entities/stock-count.entity';
import { StockCountItem } from './entities/stock-count-item.entity';
import { StockCountController } from './stock-count.controller';
import { StockCountService } from './stock-count.service';

@Module({
  imports: [TypeOrmModule.forFeature([StockCount, StockCountItem, Product, StockEntry])],
  controllers: [StockCountController],
  providers: [StockCountService],
})
export class StockCountModule {}
