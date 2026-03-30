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

export type StakeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Entity('stakes')
export class Stake {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: '0' })
  remainingAmount: string;

  @Column({ type: 'varchar', length: 10, default: 'PENDING' })
  status: StakeStatus;

  @Column({ type: 'timestamp', nullable: true })
  nextRoiAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
