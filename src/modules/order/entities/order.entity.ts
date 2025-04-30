import { Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  totalPrice: number;

  totalQuantity: number;

  employeeId: number;

  shopId: number;

  createdAt: Date;

  updatedAt: Date;
}
//
