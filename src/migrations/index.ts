import { MigrationInterface } from 'typeorm';
import { InitSchema1710000000000 } from './1710000000000-InitSchema';
import { FixUsersColumnNames1710000000001 } from './1710000000001-FixUsersColumnNames';
import { SeedAdmin1710000000002 } from './1710000000002-SeedAdmin';
import { AddDepositsUpdatedAt1710000000003 } from './1710000000003-AddDepositsUpdatedAt';
import { AddUsernameMobileRoi1710000000004 } from './1710000000004-AddUsernameMobileRoi';
import { AddWithdrawalsUpdatedAt1710000000005 } from './1710000000005-AddWithdrawalsUpdatedAt';
import { AddWithdrawalPaymentProofUrl1710000000006 } from './1710000000006-AddWithdrawalPaymentProofUrl';
import { StakesAndUserStakedBalance1710000000007 } from './1710000000007-StakesAndUserStakedBalance';
import { AddWithdrawPasswordHash1710000000008 } from './1710000000008-AddWithdrawPasswordHash';
import { CreateIssues1710000000009 } from './1710000000009-CreateIssues';
import { StakeRoiSchedulePerStake1710000000010 } from './1710000000010-StakeRoiSchedulePerStake';

/** Ordered list for TypeORM (same order as timestamps). */
export const appMigrations: (new () => MigrationInterface)[] = [
  InitSchema1710000000000,
  FixUsersColumnNames1710000000001,
  SeedAdmin1710000000002,
  AddDepositsUpdatedAt1710000000003,
  AddUsernameMobileRoi1710000000004,
  AddWithdrawalsUpdatedAt1710000000005,
  AddWithdrawalPaymentProofUrl1710000000006,
  StakesAndUserStakedBalance1710000000007,
  AddWithdrawPasswordHash1710000000008,
  CreateIssues1710000000009,
  StakeRoiSchedulePerStake1710000000010,
];
