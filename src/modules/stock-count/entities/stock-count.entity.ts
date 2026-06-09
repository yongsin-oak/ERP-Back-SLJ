import { generateIdWithPrefix } from '@app/common/helpers/generateIdWithPrefix.helper';
import { Employee } from '@app/modules/employee/entities/employee.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StockCountItem } from './stock-count-item.entity';

export enum StockCountStatus {
  DRAFT = 'Draft',
  COMPLETED = 'Completed',
}

@Entity()
export class StockCount {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    this.id = generateIdWithPrefix({ prefix: 'CNT' });
  }

  @Column({ type: 'date' })
  countDate: string;

  @Column({ type: 'enum', enum: StockCountStatus, default: StockCountStatus.DRAFT })
  status: StockCountStatus;

  @ManyToOne(() => Employee, { nullable: true, eager: true })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @Column({ nullable: true })
  employeeId: string;

  @Column({ nullable: true })
  note: string;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @OneToMany(() => StockCountItem, (item) => item.stockCount)
  items: StockCountItem[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
