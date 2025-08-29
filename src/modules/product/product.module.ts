import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { Module } from '@nestjs/common';
import { Product } from './entities/product.entity';
import { Brand } from '../brand/entities/brand.entity';
import { Category } from '../category/entities/category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Brand, Category]),
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
