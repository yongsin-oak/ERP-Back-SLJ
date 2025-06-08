import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { datasource } from 'db/data-source';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { BrandController } from './modules/brand/brand.controller';
import { BrandModule } from './modules/brand/brand.module';
import { CategoryController } from './modules/category/category.controller';
import { CategoryModule } from './modules/category/category.module';
import { EmployeeController } from './modules/employee/employee.controller';
import { EmployeeModule } from './modules/employee/employee.module';
import { OrderDetailController } from './modules/order-detail/order-detail.controller';
import { OrderDetailModule } from './modules/order-detail/order-detail.module';
import { OrderController } from './modules/order/order.controller';
import { OrderModule } from './modules/order/order.module';
import { ProductController } from './modules/product/product.controller';
import { ProductModule } from './modules/product/product.module';
import { ShopController } from './modules/shop/shop.controller';
import { ShopModule } from './modules/shop/shop.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(datasource),
    AuthModule,
    ProductModule,
    BrandModule,
    CategoryModule,
    EmployeeModule,
    ShopModule,
    OrderModule,
    OrderDetailModule, // Ensure OrderDetail is imported if needed
  ],
  controllers: [
    AppController,
    AuthController,
    ProductController,
    BrandController,
    CategoryController,
    EmployeeController,
    ShopController,
    OrderController,
    OrderDetailController,
  ],
  providers: [AppService],
})
export class AppModule {}
