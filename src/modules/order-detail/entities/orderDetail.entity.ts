import { generateIdWithPrefix } from '@app/common/helpers/generateIdWithPrefix.helper';
import { Order } from '@app/modules/order/entities/order.entity';
import { Product } from '@app/modules/product/entities/product.entity';
import { forwardRef } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class OrderDetail {
  @ApiProperty({
    description: 'Unique identifier for the order detail',
    example: 'ORDDETAIL-20250608235923-TEST-001',
  })
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    this.id = generateIdWithPrefix({
      prefix: 'ORDDETAIL',
      withDateTime: true,
    });
  }

  @ApiProperty()
  @ManyToOne(() => Product, (product) => product.orderDetails, {
    nullable: false,
  })
  @JoinColumn()
  product: Product;

  @ApiProperty()
  @ManyToOne(() => Order, (order) => order.orderDetails, {
    nullable: false,
  })
  @JoinColumn({ name: 'orderId' })
  order: Promise<Order> | Order;

  @ApiProperty()
  @Column({ nullable: false })
  orderId: string;

  @ApiProperty()
  @Column('integer', { nullable: true })
  quantityPack: number;

  @ApiProperty()
  @Column('integer', { nullable: true })
  quantityCarton: number;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
