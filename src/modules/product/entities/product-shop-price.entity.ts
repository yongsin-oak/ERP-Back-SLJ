import { generateIdWithPrefix } from '@app/common/helpers/generateIdWithPrefix.helper';
import { ApiProperty } from '@nestjs/swagger';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { ProductUnitPrice } from './product.interface';

@Entity()
@Unique(['productBarcode', 'shopId'])
export class ProductShopPrice {
  @ApiProperty()
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    this.id = generateIdWithPrefix({ prefix: 'PSP', withDateTime: false });
  }

  @ApiProperty()
  @Column()
  productBarcode: string;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productBarcode' })
  product: Product;

  @ApiProperty()
  @Column()
  shopId: string;

  @ApiProperty()
  @Column('jsonb', { nullable: true })
  sellPrice: ProductUnitPrice;

  @ApiProperty({ required: false })
  @Column('jsonb', { nullable: true })
  costPrice: ProductUnitPrice;

  @ApiProperty({ required: false })
  @Column({ type: 'timestamp', nullable: true })
  effectiveFrom: Date;

  @ApiProperty({ required: false })
  @Column({ type: 'timestamp', nullable: true })
  effectiveTo: Date;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
