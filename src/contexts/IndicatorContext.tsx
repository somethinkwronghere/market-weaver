import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { IndicatorConfig } from '@/types/chart';

interface IndicatorContextType {
  indicators: IndicatorConfig[];
  addIndicator: (config: IndicatorConfig) => void;
  removeIndicator: (id: string) => void;
  toggleIndicator: (id: string) => void;
  updateIndicatorParams: (id: string, params: Record<string, number | string>) => void;
  clearAllIndicators: () => void;
}

const IndicatorContext = createContext<IndicatorContextType | undefined>(undefined);

const STORAGE_KEY = 'market-weaver-indicators';

const defaultIndicators: IndicatorConfig[] = [
  {
    id: 'rsi-default',
    name: 'RSI',
    type: 'separate',
    params: { period: 14 },
    enabled: true,
  },
  {
    id: 'macd-default',
    name: 'MACD',
    type: 'separate',
    params: { fast: 12, slow: 26, signal: 9 },
    enabled: true,
  },
  {
    id: 'stochastic-default',
    name: 'Stochastic',
    type: 'separate',
    params: { kPeriod: 14, dPeriod: 3 },
    enabled: true,
  },
  {
    id: 'atr-default',
    name: 'ATR',
    type: 'separate',
    params: { period: 14 },
    enabled: true,
  },
  {
    id: 'volume-default',
    name: 'Volume',
    type: 'separate',
    params: {},
    enabled: true,
  },
];

export function IndicatorProvider({ children }: { children: ReactNode }) {
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return defaultIndicators;
      }
    }
    return defaultIndicators;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(indicators));
  }, [indicators]);

  const addIndicator = (config: IndicatorConfig) => {
    setIndicators(prev => [...prev, config]);
  };

  const removeIndicator = (id: string) => {
    setIndicators(prev => prev.filter(ind => ind.id !== id));
  };

  const toggleIndicator = (id: string) => {
    setIndicators(prev =>
      prev.map(ind =>
        ind.id === id ? { ...ind, enabled: !ind.enabled } : ind
      )
    );
  };

  const updateIndicatorParams = (id: string, params: Record<string, number | string>) => {
    setIndicators(prev =>
      prev.map(ind =>
        ind.id === id ? { ...ind, params: { ...ind.params, ...params } } : ind
      )
    );
  };

  const clearAllIndicators = () => {
    setIndicators([]);
  };

  return (
    <IndicatorContext.Provider
      value={{
        indicators,
        addIndicator,
        removeIndicator,
        toggleIndicator,
        updateIndicatorParams,
        clearAllIndicators,
      }}
    >
      {children}
    </IndicatorContext.Provider>
  );
}

export function useIndicatorsContext() {
  const context = useContext(IndicatorContext);
  if (!context) {
    throw new Error('useIndicatorsContext must be used within IndicatorProvider');
  }
  return context;
}
