import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  OneToOne, JoinColumn, Index,
} from 'typeorm';
import { Product } from '../products/entities/product.entity';

@Entity('inventory')
@Index(['quantity'])
export class Inventory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  productId: number;

  @OneToOne(() => Product, (product) => product.inventory)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'int', default: 10 })
  minimumStock: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
