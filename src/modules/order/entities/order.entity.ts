import { Employee } from '@app/modules/employee/entities/employee.entity';
import { Terminal } from '@app/modules/terminal/terminal.entity';
import { OrderDetail } from '@app/modules/order-detail/entities/orderDetail.entity';
import { Shop } from '@app/modules/shop/entities/shop.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OrderStatus {
  Pending = 'pending',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

@Entity()
export class Order {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'recordByEmployeeId' })
  recordBy: Employee;

  @ManyToOne(() => Terminal, { nullable: true })
  @JoinColumn({ name: 'terminalId' })
  terminal: Terminal;

  @Column({ nullable: true })
  terminalId: string;

  @ManyToOne(() => Shop, { nullable: true })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @OneToMany(() => OrderDetail, (orderDetail) => orderDetail.order, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn()
  orderDetails: OrderDetail[];

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.Pending })
  status: OrderStatus;

  @Column({ type: 'timestamp', nullable: true })
  startRecordAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedRecordAt: Date;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
