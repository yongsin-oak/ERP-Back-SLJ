import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Brand } from 'src/modules/brand/entities/brand.entity';

@Entity()
export class Product {
  @ApiProperty()
  @PrimaryColumn()
  barcode: string;

  @ApiProperty()
  @Column()
  name: string;

  @ManyToOne(() => Brand, (brand) => brand.products)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @ApiProperty()
  @Column({ nullable: true })
  categoryId: number;

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
