import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employee/entities/employee.entity';
import { Product } from '../product/entities/product.entity';
import { StockEntry } from './entities/stock-entry.entity';
import { StockEntryController } from './stock-entry.controller';
import { StockEntryService } from './stock-entry.service';

@Module({
  imports: [TypeOrmModule.forFeature([StockEntry, Product, Employee])],
  controllers: [StockEntryController],
  providers: [StockEntryService],
})
export class StockEntryModule {}
