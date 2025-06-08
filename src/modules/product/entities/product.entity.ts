import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Brand } from 'src/modules/brand/entities/brand.entity';
import { Category } from 'src/modules/category/entities/category.entity';
import { OrderDetail } from 'src/modules/order-detail/entities/orderDetail.entity';

@Entity()
export class Product {
  @ApiProperty()
  @PrimaryColumn()
  barcode: string;

  @ApiProperty()
  @Column()
  name: string;

  @ApiProperty()
  @ManyToOne(() => Brand, (brand) => brand.products, {
    nullable: true,
    lazy: true,
  })
  @JoinColumn({ name: 'brandId' })
  brand: Promise<Brand>;

  @ApiProperty()
  @ManyToOne(() => Category, (category) => category.products, {
    nullable: true,
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @ApiProperty()
  @OneToMany(() => OrderDetail, (orderDetail) => orderDetail.product, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn({ name: 'orderDetailId' })
  orderDetails: OrderDetail[];

  @ApiProperty()
  @Column('decimal', { precision: 10, scale: 2 })
  costPrice: number;

  @ApiProperty()
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  currentPrice: number;

  @ApiProperty()
  @Column('int')
  remaining: number;

  @ApiProperty({
    example: {
      length: 0,
      width: 0,
      height: 0,
      weight: 0,
    },
    required: false,
    description: 'Product dimensions in cm and weight in kg',
  })
  @Column('jsonb', { nullable: true })
  productDimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };

  @ApiProperty({
    example: {
      length: 0,
      width: 0,
      height: 0,
      weight: 0,
    },
    required: false,
    description: 'Carton dimensions in cm and weight in kg',
  })
  @Column('jsonb', { nullable: true })
  cartonDimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };

  @ApiProperty()
  @Column({ nullable: true })
  piecesPerPack: number;

  @ApiProperty()
  @Column({ nullable: true })
  packPerCarton: number;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
