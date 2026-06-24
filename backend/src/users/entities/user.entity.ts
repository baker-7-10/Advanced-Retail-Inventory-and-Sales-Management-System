import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Sale } from '../../sales/entities/sale.entity';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
}

@Entity('users')
@Index('IDX_users_role_is_active', ['role', 'isActive'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Column({ select: false })
  @Exclude()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ select: false, default: 0 })
  @Exclude()
  failedLoginAttempts: number;

  @Column({ select: false, type: 'timestamp', nullable: true, default: null })
  @Exclude()
  lockedUntil: Date | null;

  @Column({ select: false, type: 'varchar', nullable: true, default: null })
  @Exclude()
  hashedRefreshToken: string | null;

  @OneToMany(() => Sale, (sale) => sale.user)
  sales: Sale[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
