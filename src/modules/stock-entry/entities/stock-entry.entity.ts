import { generateIdWithPrefix } from '@app/common/helpers/generateIdWithPrefix.helper';
import { Employee } from '@app/modules/employee/entities/employee.entity';
import { Product } from '@app/modules/product/entities/product.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StockEntryType {
  IN = 'in',
  ADJUST = 'adjust',
  RETURN = 'return',
  DAMAGE = 'damage',
}

@Entity()
export class StockEntry {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    this.id = generateIdWithPrefix({ prefix: 'STK', withDateTime: true });
  }

  // Not eager: an implicit join would hydrate Product's four jsonb columns on
  // every read of the ledger. findAll/exportAll join it explicitly, and the write
  // path attaches the product it already loaded.
  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: 'productBarcode' })
  product: Product;

  @Index()
  @Column()
  productBarcode: string;

  @Index()
  @Column({ type: 'enum', enum: StockEntryType })
  type: StockEntryType;

  @Column('int')
  quantity: number;

  @Column('int')
  previousRemaining: number;

  @Column('int')
  newRemaining: number;

  // Not eager, same reason as `product` — loaded explicitly where it is rendered.
  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @Index()
  @Column({ nullable: true })
  employeeId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  costPricePerUnit: number | null;

  @Column({ nullable: true })
  note: string;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
