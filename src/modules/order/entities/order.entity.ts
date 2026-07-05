import { Employee } from '@app/modules/employee/entities/employee.entity';
import { Terminal } from '@app/modules/terminal/terminal.entity';
import { OrderDetail } from '@app/modules/order-detail/entities/orderDetail.entity';
import { Shop } from '@app/modules/shop/entities/shop.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OrderStatus {
  Completed = 'completed',
  Cancelled = 'cancelled',
}

@Entity()
export class Order {
  @PrimaryColumn()
  id: string;

  @Index()
  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'recordByEmployeeId' })
  recordBy: Employee;

  @Index()
  @ManyToOne(() => Terminal, { nullable: true })
  @JoinColumn({ name: 'terminalId' })
  terminal: Terminal;

  @Column({ nullable: true })
  terminalId: string;

  @Index()
  @ManyToOne(() => Shop, { nullable: true })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @OneToMany(() => OrderDetail, (orderDetail) => orderDetail.order, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn()
  orderDetails: OrderDetail[];

  @Index()
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.Completed })
  status: OrderStatus;

  @Index()
  @Column({ type: 'timestamp', nullable: true })
  startRecordAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedRecordAt: Date;

  @Column({ nullable: true })
  note: string;

  @Index()
  @Column({ nullable: true })
  orderNumber: string;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
