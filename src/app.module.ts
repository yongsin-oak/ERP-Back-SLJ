import { APP_INTERCEPTOR } from '@nestjs/core';
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { datasource } from '@db/data-source';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { ProductModule } from './modules/product/product.module';
import { BrandModule } from './modules/brand/brand.module';
import { CategoryModule } from './modules/category/category.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { ShopModule } from './modules/shop/shop.module';
import { OrderModule } from './modules/order/order.module';
import { OrderDetailModule } from './modules/order-detail/order-detail.module';
import { StockEntryModule } from './modules/stock-entry/stock-entry.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UserModule } from './modules/user/user.module';
import { TerminalModule } from './modules/terminal/terminal.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { ReportModule } from './modules/report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(datasource),
    AuthModule,
    ProductModule,
    BrandModule,
    CategoryModule,
    EmployeeModule,
    ShopModule,
    OrderModule,
    OrderDetailModule,
    StockEntryModule,
    DashboardModule,
    UserModule,
    TerminalModule,
    AuditLogModule,
    SupplierModule,
    ReportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, LoggingMiddleware).forRoutes('*');
  }
}
