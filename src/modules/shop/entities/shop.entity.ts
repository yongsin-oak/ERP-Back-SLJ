import { ApiProperty } from '@nestjs/swagger';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Platform } from './platform.enum';
import { generateId } from 'src/common/helpers/generateIdWithPrefix';

@Entity()
@Unique(['name', 'platform'])
export class Shop {
  @ApiProperty()
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    this.id = generateId({
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
