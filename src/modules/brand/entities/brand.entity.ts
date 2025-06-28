import { ApiProperty } from '@nestjs/swagger';
import { generateIdWithPrefix } from '../../../common/helpers/generateIdWithPrefix.helper';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '@app/modules/product/entities/product.entity';

@Entity()
export class Brand {
  @ApiProperty({
    example: 1,
  })
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    this.id = generateIdWithPrefix({
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
  })
  @ApiProperty({ type: () => Product, isArray: true, required: false })
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
