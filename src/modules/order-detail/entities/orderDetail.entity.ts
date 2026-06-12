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
  Index,
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

  @ApiProperty({ type: () => Product })
  @Index()
  @ManyToOne(() => Product, (product) => product.orderDetails, {
    nullable: false,
  })
  @JoinColumn()
  product: Product;

  @ApiProperty({ type: () => Order })
  @ManyToOne(() => Order, (order) => order.orderDetails, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  order: Promise<Order> | Order;

  @ApiProperty()
  @Index()
  @Column({ nullable: false })
  orderId: string;

  @ApiProperty()
  @Column('integer', { nullable: true })
  quantityPack: number;

  @ApiProperty()
  @Column('integer', { nullable: true })
  quantityCarton: number;

  @ApiProperty()
  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
