import { Role } from '@app/auth/role/role.enum';
import { generateIdWithPrefix } from '@app/common/helpers/generateIdWithPrefix.helper';
import { ApiProperty } from '@nestjs/swagger';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Terminal {
  @ApiProperty()
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    this.id = generateIdWithPrefix({ prefix: 'TERM', withDateTime: false });
  }

  @ApiProperty({ example: 'POS-01' })
  @Column({ unique: true })
  terminalCode: string;

  @ApiProperty({ example: 'POS หน้าร้าน 1' })
  @Column()
  name: string;

  @ApiProperty({ enum: Role })
  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Column()
  passwordHash: string;

  @ApiProperty()
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
