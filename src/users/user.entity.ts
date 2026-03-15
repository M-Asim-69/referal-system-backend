import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { WalletTransaction } from '../wallet/wallet-transaction.entity';

export type UserRole = 'ADMIN' | 'USER';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column()
  passwordHash: string;

  @Column()
  fullName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  mobile: string | null;

  @Column({ type: 'varchar', length: 10, default: 'USER' })
  role: UserRole;

  @Column({ type: 'varchar', length: 10, default: 'ACTIVE' })
  status: UserStatus;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: '0' })
  totalDepositInvestment: string;

  @Column({ type: 'timestamp', nullable: true })
  lastRoiAt: Date | null;

  @Column({ unique: true })
  referralCode: string;

  @Column({ type: 'uuid', nullable: true })
  referredById: string | null;

  @ManyToOne(() => User, (user) => user.directReferrals, { nullable: true })
  @JoinColumn({ name: 'referredById' })
  referredBy: User | null;

  @OneToMany(() => User, (user) => user.referredBy)
  directReferrals: User[];

  @Column({ type: 'numeric', precision: 18, scale: 2, default: '0' })
  walletBalance: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentAccountNumber: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentAccountBank: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  profileImageUrl: string | null;

  @OneToMany(() => WalletTransaction, (tx) => tx.user)
  transactions: WalletTransaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
