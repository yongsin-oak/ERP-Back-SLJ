import { generateIdWithPrefix } from '@app/common/helpers/generateIdWithPrefix.helper';
import { Employee } from '@app/modules/employee/entities/employee.entity';
import { Product } from '@app/modules/product/entities/product.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StockEntryType {
  IN = 'in',
  ADJUST = 'adjust',
  RETURN = 'return',
}

@Entity()
export class StockEntry {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    this.id = generateIdWithPrefix({ prefix: 'STK', withDateTime: true });
  }

  @ManyToOne(() => Product, { nullable: false, eager: true })
  @JoinColumn({ name: 'productBarcode' })
  product: Product;

  @Column()
  productBarcode: string;

  @Column({ type: 'enum', enum: StockEntryType })
  type: StockEntryType; 

  @Column('int')
  quantity: number;

  @Column('int')
  previousRemaining: number;

  @Column('int')
  newRemaining: number;

  @ManyToOne(() => Employee, { nullable: true, eager: true })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @Column({ nullable: true })
  employeeId: string;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
