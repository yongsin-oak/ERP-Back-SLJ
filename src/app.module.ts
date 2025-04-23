import { ProductModule } from './modules/product/product.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { datasource } from 'db/data-source';
import { ProductController } from './modules/product/product.controller';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { BrandModule } from './modules/brand/brand.module';
import { BrandController } from './modules/brand/brand.controller';
import { CategoryController } from './modules/category/category.controller';
import { CategoryModule } from './modules/category/category.module';

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
  ],
  controllers: [
    AppController,
    AuthController,
    ProductController,
    BrandController,
    CategoryController,
  ],
  providers: [AppService],
})
export class AppModule {}
