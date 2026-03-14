import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'COMMISSION';
export type TransactionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  type: TransactionType;

  @Column({ type: 'varchar', length: 20 })
  status: TransactionStatus;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  referenceId: string | null;

  @Column({ type: 'int', nullable: true })
  level: number | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
