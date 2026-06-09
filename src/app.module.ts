import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { datasource } from '@db/data-source';
import { v4 as uuidv4 } from 'uuid';

import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
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
import { StockCountModule } from './modules/stock-count/stock-count.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(datasource),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req, res) => {
          const id = uuidv4();
          res.setHeader('X-Request-ID', id);
          return id;
        },
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
              }
            : undefined,
        level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.currentPassword',
            'req.body.newPassword',
            'req.body.currentPass',
            'req.body.newPass',
          ],
          censor: '[Redacted]',
        },
        customLogLevel: (_req, res, err) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
        customProps: (req: any) => ({ userId: req.user?.id ?? undefined }),
        serializers: {
          req(req) {
            const method: string = req.method?.toUpperCase() ?? '';
            const result: Record<string, unknown> = {
              id: req.id,
              method,
              url: req.url,
              query: req.raw?.query,
            };
            if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
              result.body = req.raw?.body;
            }
            return result;
          },
        },
      },
    }),
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
    StockCountModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
