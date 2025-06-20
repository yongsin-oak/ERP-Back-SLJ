import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { generateId } from 'src/common/helpers/generateIdWithPrefix';
import { Order } from 'src/modules/order/entities/order.entity';
import { Product } from 'src/modules/product/entities/product.entity';
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
    example: 'ORD-DETAIL-20250608235923-TEST-001',
  })
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    this.id = generateId({ prefix: 'ORD-DETAIL', withDateTime: true });
  }

  @ManyToOne(() => Product, (product) => product.orderDetails, {
    nullable: false,
  })
  @JoinColumn()
  product: Product;

  @Exclude()
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
