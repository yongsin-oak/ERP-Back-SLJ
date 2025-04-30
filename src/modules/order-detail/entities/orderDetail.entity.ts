import { Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class OrderDetail {
  @PrimaryGeneratedColumn()
  id: number;

  orderId: number;

  productId: number;

  quantity: number;

  price: number;

  createdAt: Date;

  updatedAt: Date;
}
