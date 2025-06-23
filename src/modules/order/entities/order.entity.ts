import { Employee } from '@app/modules/employee/entities/employee.entity';
import { OrderDetail } from '@app/modules/order-detail/entities/orderDetail.entity';
import { Shop } from '@app/modules/shop/entities/shop.entity';
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity()
export class Order {
  @PrimaryColumn()
  id: string;

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
