// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Role } from '../role/role.enum';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: Role })
  role: Role;
}
