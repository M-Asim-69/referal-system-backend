import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type DepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type DepositKind = 'INITIAL' | 'NORMAL';

@Entity('deposits')
export class Deposit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 10, default: 'PENDING' })
  status: DepositStatus;

  @Column({ type: 'varchar', length: 10, default: 'NORMAL' })
  kind: DepositKind;

  @Column({ type: 'varchar', length: 512, nullable: true })
  paymentProofUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
