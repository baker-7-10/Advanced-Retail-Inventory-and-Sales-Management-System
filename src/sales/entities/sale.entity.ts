import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SaleItem } from './sale-item.entity';

export enum SaleStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

@Entity('sales')
@Index(['status'])
@Index(['createdAt'])
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  // Auto-generated invoice number e.g. INV-2024-000001
  @Column({ unique: true, length: 50 })
  invoiceNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({
    type: 'enum',
    enum: SaleStatus,
    default: SaleStatus.PENDING,
  })
  status: SaleStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Who processed this sale
  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.sales, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => SaleItem, (item) => item.sale, {
    cascade: true, // Auto-save items when saving sale
    eager: true,
  })
  items: SaleItem[];

  @CreateDateColumn()
  createdAt: Date;
}
