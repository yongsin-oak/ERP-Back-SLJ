import { ApiProperty } from '@nestjs/swagger';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Platform } from './platform.enum';
import { generateIdWithPrefix } from '@app/common/helpers/generateIdWithPrefix.helper';

@Entity()
@Unique(['name', 'platform'])
export class Shop {
  @ApiProperty()
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    this.id = generateIdWithPrefix({
      prefix: 'SHOP',
      withDateTime: false,
    });
  }

  @ApiProperty()
  @Column()
  name: string;

  @ApiProperty()
  @Column({ nullable: true })
  description?: string;

  @ApiProperty()
  @Column()
  platform: Platform;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({
    type: 'timestamp',
  })
  updatedAt: Date;
}
