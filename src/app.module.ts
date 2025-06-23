import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandModule } from './modules/brand/brand.module';
import { CategoryModule } from './modules/category/category.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { ShopModule } from './modules/shop/shop.module';
import { OrderModule } from './modules/order/order.module';
import { OrderDetailModule } from './modules/order-detail/order-detail.module';
import { AppController } from './app.controller';
import { ProductController } from './modules/product/product.controller';
import { BrandController } from './modules/brand/brand.controller';
import { CategoryController } from './modules/category/category.controller';
import { EmployeeController } from './modules/employee/employee.controller';
import { ShopController } from './modules/shop/shop.controller';
import { OrderController } from './modules/order/order.controller';
import { OrderDetailController } from './modules/order-detail/order-detail.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ProductModule } from './modules/product/product.module';
import { AuthController } from './auth/auth.controller';
import { datasource } from '@db/data-source';

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
