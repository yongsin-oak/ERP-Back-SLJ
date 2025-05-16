import { Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class OrderDetail {
  @PrimaryGeneratedColumn()
  id: number;

  orderId: number;

  productBarcode: number;

  quantity: number;

  createdAt: Date;

  updatedAt: Date;
}
