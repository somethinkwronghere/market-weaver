export type PlanType = 'free' | 'pro';

export interface UserSubscription {
  plan: PlanType;
  userId?: string;
  username?: string;
  avatar?: string;
}

export interface PlanFeatures {
  maxOpenPositions: number;
  advancedIndicators: boolean;
  customStrategies: number;
  dataHistory: string; // e.g., '30d', '1y', 'unlimited'
  prioritySupport: boolean;
}
