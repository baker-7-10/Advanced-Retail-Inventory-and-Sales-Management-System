import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, OneToOne, JoinColumn, Index, AfterLoad,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { SaleItem } from '../../sales/entities/sale-item.entity';
import { Inventory } from '../../inventory/entities/inventory.entity';

@Entity('products')
@Index(['name'])
@Index(['price'])
@Index(['sku'])
@Index('IDX_products_name_description_fulltext', ['name', 'description', 'sku'], { fulltext: true })
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  relevance: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  stock: number = 0;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku: string;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  @Index()
  categoryId: number;

  @ManyToOne(() => Category, (category) => category.products, {
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @OneToMany(() => SaleItem, (saleItem) => saleItem.product)
  saleItems: SaleItem[];

  @OneToOne(() => Inventory, (inventory) => inventory.product)
  inventory: Inventory;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @AfterLoad()
  syncStockFromInventory() {
    this.stock = this.inventory?.quantity ?? 0;
  }
}
