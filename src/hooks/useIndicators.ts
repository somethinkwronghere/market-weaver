import { useMemo } from 'react';
import { OHLCData } from '@/types/trading';

export interface RSIData {
  time: number;
  value: number;
}

export interface MACDData {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerData {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  ema[period - 1] = sum / period;
  
  // Calculate EMA for rest
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }
  
  return ema;
}

function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    sma[i] = sum / period;
  }
  
  return sma;
}

export function useIndicators(candles: OHLCData[]) {
  const rsi = useMemo(() => {
    if (candles.length < 15) return [];
    
    const period = 14;
    const rsiData: RSIData[] = [];
    const closes = candles.map(c => c.close);
    
    for (let i = period; i < closes.length; i++) {
      let gains = 0;
      let losses = 0;
      
      for (let j = i - period + 1; j <= i; j++) {
        const change = closes[j] - closes[j - 1];
        if (change > 0) gains += change;
        else losses -= change;
      }
      
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsiValue = 100 - (100 / (1 + rs));
      
      rsiData.push({
        time: candles[i].time,
        value: rsiValue,
      });
    }
    
    return rsiData;
  }, [candles]);

  const macd = useMemo(() => {
    if (candles.length < 26) return [];
    
    const closes = candles.map(c => c.close);
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    
    const macdLine: number[] = [];
    for (let i = 25; i < closes.length; i++) {
      macdLine[i] = ema12[i] - ema26[i];
    }
    
    // Signal line (9-period EMA of MACD)
    const validMacd = macdLine.filter(v => v !== undefined);
    const signalLine = calculateEMA(validMacd, 9);
    
    const macdData: MACDData[] = [];
    let signalIdx = 0;
    
    for (let i = 33; i < candles.length; i++) {
      const macdValue = macdLine[i] || 0;
      const signalValue = signalLine[signalIdx + 8] || 0;
      signalIdx++;
      
      macdData.push({
        time: candles[i].time,
        macd: macdValue * 10000, // Scale for display
        signal: signalValue * 10000,
        histogram: (macdValue - signalValue) * 10000,
      });
    }
    
    return macdData;
  }, [candles]);

  const bollingerBands = useMemo(() => {
    if (candles.length < 20) return [];
    
    const period = 20;
    const stdDevMultiplier = 2;
    const closes = candles.map(c => c.close);
    const sma = calculateSMA(closes, period);
    
    const bbData: BollingerData[] = [];
    
    for (let i = period - 1; i < closes.length; i++) {
      const middle = sma[i];
      if (middle === undefined) continue;
      
      // Calculate standard deviation
      let sumSquaredDiff = 0;
      for (let j = 0; j < period; j++) {
        sumSquaredDiff += Math.pow(closes[i - j] - middle, 2);
      }
      const stdDev = Math.sqrt(sumSquaredDiff / period);
      
      bbData.push({
        time: candles[i].time,
        upper: middle + stdDevMultiplier * stdDev,
        middle,
        lower: middle - stdDevMultiplier * stdDev,
      });
    }
    
    return bbData;
  }, [candles]);

  return { rsi, macd, bollingerBands };
}
