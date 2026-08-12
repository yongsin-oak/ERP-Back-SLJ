import { generateIdWithPrefix } from '@app/common/helpers/generateIdWithPrefix.helper';
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
import { StockCount } from './stock-count.entity';

@Entity()
@Index(['stockCountId', 'productBarcode'])
export class StockCountItem {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    this.id = generateIdWithPrefix({ prefix: 'CNTI', withDateTime: false });
  }

  @ManyToOne(() => StockCount, (sc) => sc.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stockCountId' })
  stockCount: StockCount;

  @Column()
  stockCountId: string;

  // Not eager: a sheet holds one row per product, so an implicit join would drag
  // Product's four jsonb columns into every read. Callers ask for it explicitly.
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productBarcode' })
  product: Product;

  @Column()
  productBarcode: string;

  @Column('int')
  systemQty: number;

  @Column('int', { nullable: true })
  countedQty: number | null;

  @Column('int', { nullable: true })
  diff: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
