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
import { Dimensions, ProductUnitPrice } from './product.interface';
import { IsInt, Min } from 'class-validator';

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
  })
  @JoinColumn({ name: 'brandId' })
  brand: Brand;

  @Column({ nullable: true })
  brandId: string;

  @ApiProperty()
  @ManyToOne(() => Category, (category) => category.products, {
    nullable: true,
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ nullable: true })
  categoryId: string;

  @ApiProperty()
  @OneToMany(() => OrderDetail, (orderDetail) => orderDetail.product, {
    nullable: true,
    cascade: true,
  })
  orderDetails: OrderDetail[];

  @ApiProperty()
  @Column('jsonb', { nullable: true })
  costPrice: ProductUnitPrice;

  @ApiProperty()
  @Column('jsonb', { nullable: true })
  sellPrice: ProductUnitPrice;

  @ApiProperty()
  @Column('int')
  @IsInt()
  @Min(0)
  remaining: number;

  @ApiProperty()
  @Column('int', { nullable: true })
  @IsInt()
  @Min(0)
  minStock?: number;

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
  productDimensions: Dimensions;

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
  cartonDimensions: Dimensions;

  @ApiProperty()
  @Column({ nullable: true })
  @IsInt()
  @Min(0)
  piecesPerPack: number;

  @ApiProperty()
  @Column({ nullable: true })
  @IsInt()
  @Min(0)
  packPerCarton: number;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
