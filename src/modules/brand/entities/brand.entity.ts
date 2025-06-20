import { ApiProperty } from '@nestjs/swagger';
import { generateId } from 'src/common/helpers/generateIdWithPrefix';
import { Product } from 'src/modules/product/entities/product.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Brand {
  @ApiProperty({
    example: 1,
  })
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    this.id = generateId({
      prefix: 'BRD',
      withDateTime: false,
    });
  }

  @ApiProperty()
  @Column({ unique: true })
  name: string;

  @ApiProperty()
  @Column({ nullable: true })
  description: string;

  @OneToMany(() => Product, (product) => product.brand, {
    nullable: true,
    lazy: true,
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
