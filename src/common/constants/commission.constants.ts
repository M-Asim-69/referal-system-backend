export interface CommissionLevel {
  level: number;
  rate: number;
  label: string;
}

export const COMMISSION_LEVELS: CommissionLevel[] = [
  { level: 1, rate: 0.10, label: 'Direct referral (10%)' },
  { level: 2, rate: 0.05, label: 'Level 2 referral (5%)' },
  { level: 3, rate: 0.03, label: 'Level 3 referral (3%)' },
  { level: 4, rate: 0.02, label: 'Level 4 referral (2%)' },
  { level: 5, rate: 0.01, label: 'Level 5 referral (1%)' },
];
