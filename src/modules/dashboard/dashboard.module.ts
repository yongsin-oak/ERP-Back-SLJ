import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employee/entities/employee.entity';
import { OrderDetail } from '../order-detail/entities/orderDetail.entity';
import { Order } from '../order/entities/order.entity';
import { Product } from '../product/entities/product.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderDetail, Product, Employee])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
