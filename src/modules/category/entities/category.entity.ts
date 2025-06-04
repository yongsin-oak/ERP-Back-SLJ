import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { Product } from 'src/modules/product/entities/product.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Category {
  @ApiProperty({
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column({ unique: true })
  name: string;

  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parentId' })
  parent?: Category;

  @Column({ nullable: true })
  @ApiProperty({ nullable: true, example: 3 })
  parentId?: number;

  @OneToMany(() => Category, (category) => category.parent, {
    nullable: true,
  })
  @JoinColumn({ name: 'childrenId', referencedColumnName: 'id' })
  children?: Category[];

  @IsArray()
  @ApiProperty({ nullable: true, isArray: true, example: [1, 2, 3] })
  @Column('int', { array: true, nullable: true })
  childrenId?: number[];

  @ApiProperty()
  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => Product, (product) => product.category, {
    nullable: true,
  })
  products: Product[];

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({
    type: 'timestamp',
  })
  updatedAt: Date;
}
