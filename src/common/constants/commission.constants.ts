export const APP_CURRENCY = 'USD';
export const MIN_DEPOSIT = 5;
export const MIN_WITHDRAWAL = 3;
export const MIN_STAKE = 5;
/** Daily profit on approved stake principal. */
export const STAKE_ROI_DAILY_RATE = 0.016;

export interface CommissionLevel {
  level: number;
  rate: number;
  label: string;
}

export const COMMISSION_LEVELS: CommissionLevel[] = [
  { level: 1, rate: 0.1, label: 'Level 1 (10%)' },
  { level: 2, rate: 0.05, label: 'Level 2 (5%)' },
  { level: 3, rate: 0.03, label: 'Level 3 (3%)' },
  { level: 4, rate: 0.02, label: 'Level 4 (2%)' },
  { level: 5, rate: 0.01, label: 'Level 5 (1%)' },
];
