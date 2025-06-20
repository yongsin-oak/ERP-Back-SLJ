// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, PrimaryColumn, BeforeInsert } from 'typeorm';
import { Role } from '../role/role.enum';
import { nanoid } from 'nanoid';

@Entity()
export class User {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    this.id = nanoid(12);
  }

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: Role })
  role: Role;
}
