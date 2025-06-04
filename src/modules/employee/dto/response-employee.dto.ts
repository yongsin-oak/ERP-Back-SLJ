import { ApiProperty } from '@nestjs/swagger';
import { Role } from 'src/auth/role/role.enum';

export class EmployeeResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  phoneNumber?: string;

  @ApiProperty()
  startDate?: Date;

  @ApiProperty({
    enum: Role,
    example: Role.Operator,
  })
  department: Role;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// @Entity()
// export class Employee {
//   @ApiProperty()
//   @PrimaryGeneratedColumn()
//   id: number;

//   @ApiProperty()
//   @Column()
//   firstName: string;

//   @ApiProperty()
//   @Column()
//   lastName: string;

//   @ApiProperty()
//   @Column()
//   nickname: string;

//   @ApiProperty()
//   @Column({ nullable: true })
//   phoneNumber?: string;

//   @ApiProperty()
//   @Column({ nullable: true })
//   startDate?: Date;

//   @ApiProperty()
//   @Column()
//   department: Role;

//   @ApiProperty()
//   @CreateDateColumn({ type: 'timestamp' })
//   createdAt: Date;

//   @ApiProperty()
//   @UpdateDateColumn({
//     type: 'timestamp',
//   })
//   updatedAt: Date;
// }
