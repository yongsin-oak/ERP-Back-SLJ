import { Role } from '@app/auth/role/role.enum';
import { generateIdWithPrefix } from '@app/common/helpers/generateIdWithPrefix';
import { ApiProperty } from '@nestjs/swagger';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity()
export class Employee {
  @ApiProperty()
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    this.id = generateIdWithPrefix({
      prefix: 'EMP',
      withDateTime: false,
    });
  }

  @ApiProperty()
  @Column()
  firstName: string;

  @ApiProperty()
  @Column()
  lastName: string;

  @ApiProperty()
  @Column()
  nickname: string;

  @ApiProperty()
  @Column({ nullable: true })
  phoneNumber?: string;

  @ApiProperty()
  @Column({ nullable: true })
  startDate?: Date;

  @ApiProperty()
  @Column()
  department: Role;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({
    type: 'timestamp',
  })
  updatedAt: Date;
}
