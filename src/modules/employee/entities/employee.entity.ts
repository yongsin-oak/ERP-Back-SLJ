import { ApiProperty } from '@nestjs/swagger';
import { Role } from 'src/auth/role/role.enum';
import { generateId } from 'src/common/helpers/generateIdWithPrefix';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Employee {
  @ApiProperty()
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    this.id = generateId({
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
