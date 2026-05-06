import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderDetail } from '../order-detail/entities/orderDetail.entity';
import { Product } from '../product/entities/product.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Terminal } from '../terminal/terminal.entity';
import { Shop } from '../shop/entities/shop.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderDetail, Product, Employee, Terminal, Shop])],
  providers: [OrderService],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule {}
