import { Employee } from 'src/modules/employee/entities/employee.entity';
import { OrderDetail } from 'src/modules/order-detail/entities/orderDetail.entity';
import { Shop } from 'src/modules/shop/entities/shop.entity';
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

@Entity()
export class Order {
  @PrimaryColumn()
  id: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  totalCostPrice: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  totalCurrentPrice: number;

  @Column({
    type: 'integer',
  })
  totalQuantity: number;

  @ManyToOne(() => Employee, (employee) => employee.id, {
    nullable: true,
  })
  @JoinColumn({ name: 'createdBy' })
  employee: Employee;

  @ManyToOne(() => Shop, (shop) => shop.id, {
    nullable: true,
  })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;


  @OneToMany(() => OrderDetail, (orderDetail) => orderDetail.order, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn()
  orderDetails: OrderDetail[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
  })
  updatedAt: Date;
}
//
