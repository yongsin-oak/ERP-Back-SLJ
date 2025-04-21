import { ProductModule } from './modules/product/product.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { datasource } from 'db/data-source';
import { ProductController } from './modules/product/product.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(datasource),
    AuthModule,
    ProductModule,
  ],
  controllers: [AppController, AuthController, ProductController],
  providers: [AppService],
})
export class AppModule {}
