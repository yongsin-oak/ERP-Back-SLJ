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
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Category {
  @ApiProperty({
    example: 1,
  })
  @PrimaryColumn()
  id: string;

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
  parentId?: string;

  @OneToMany(() => Category, (category) => category.parent, {
    nullable: true,
  })
  @JoinColumn({ name: 'childrenId' })
  children?: Category[];

  @ApiProperty({ nullable: true, isArray: true, example: [1, 2, 3] })
  @Column('text', { array: true, nullable: true })
  childrenId?: string[];

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
