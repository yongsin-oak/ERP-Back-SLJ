import { generateIdWithPrefix } from '@app/common/helpers/generateIdWithPrefix.helper';
import { BeforeInsert, Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export enum AuditActorType {
  User = 'user',
  Terminal = 'terminal',
  Employee = 'employee',
  System = 'system',
}

export enum AuditAction {
  Login = 'login',
  Logout = 'logout',
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
  StockIn = 'stock_in',
  StockAdjust = 'stock_adjust',
  StockReturn = 'stock_return',
  OrderComplete = 'order_complete',
  OrderCancel = 'order_cancel',
  PinVerify = 'pin_verify',
}

@Entity()
export class AuditLog {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    this.id = generateIdWithPrefix({ prefix: 'AUDIT', withDateTime: true });
  }

  @Column({ type: 'enum', enum: AuditActorType })
  actorType: AuditActorType;

  @Column()
  actorId: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column()
  resourceType: string;

  @Column({ nullable: true })
  resourceId: string;

  @Column('jsonb', { nullable: true })
  beforeData: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  afterData: Record<string, unknown>;

  @Column({ nullable: true })
  ipAddress: string;

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
