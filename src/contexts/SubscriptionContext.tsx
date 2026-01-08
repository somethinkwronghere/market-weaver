import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PlanType, UserSubscription, PlanFeatures } from '@/types/subscription';
import { storage } from '@/lib/storage';

const STORAGE_KEY = 'market-weaver-subscription';

const DEFAULT_FEATURES: Record<PlanType, PlanFeatures> = {
  free: {
    maxOpenPositions: 3,
    advancedIndicators: false,
    customStrategies: 1,
    dataHistory: '7d',
    prioritySupport: false
  },
  pro: {
    maxOpenPositions: -1, // unlimited
    advancedIndicators: true,
    customStrategies: -1, // unlimited
    dataHistory: 'unlimited',
    prioritySupport: true
  }
};

interface SubscriptionContextValue {
  subscription: UserSubscription;
  features: PlanFeatures;
  setPlan: (plan: PlanType) => void;
  setProfile: (username: string, avatar?: string) => void;
  isPro: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<UserSubscription>(() => {
    return storage.get<UserSubscription>(STORAGE_KEY, {
      plan: 'free',
      username: 'Trader',
      avatar: undefined
    });
  });

  useEffect(() => {
    storage.set(STORAGE_KEY, subscription);
  }, [subscription]);

  const setPlan = (plan: PlanType) => {
    setSubscription(prev => ({ ...prev, plan }));
  };

  const setProfile = (username: string, avatar?: string) => {
    setSubscription(prev => ({ ...prev, username, avatar }));
  };

  const features = DEFAULT_FEATURES[subscription.plan];
  const isPro = subscription.plan === 'pro';

  return (
    <SubscriptionContext.Provider value={{ subscription, features, setPlan, setProfile, isPro }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
