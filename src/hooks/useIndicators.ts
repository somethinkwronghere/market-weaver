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

export interface StochasticData {
  time: number;
  k: number;
  d: number;
}

export interface ATRData {
  time: number;
  value: number;
}

export interface VolumeData {
  time: number;
  value: number;
  color: string;
}

export interface EMAData {
  time: number;
  value: number;
  period: number;
}

export interface SMAData {
  time: number;
  value: number;
  period: number;
}

function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  ema[period - 1] = sum / period;
  
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
        macd: macdValue * 10000,
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

  // Stochastic Oscillator (14, 3, 3)
  const stochastic = useMemo(() => {
    if (candles.length < 14) return [];
    
    const kPeriod = 14;
    const dPeriod = 3;
    const stochData: StochasticData[] = [];
    const kValues: number[] = [];
    
    for (let i = kPeriod - 1; i < candles.length; i++) {
      const highs = candles.slice(i - kPeriod + 1, i + 1).map(c => c.high);
      const lows = candles.slice(i - kPeriod + 1, i + 1).map(c => c.low);
      const highestHigh = Math.max(...highs);
      const lowestLow = Math.min(...lows);
      
      const k = highestHigh !== lowestLow 
        ? ((candles[i].close - lowestLow) / (highestHigh - lowestLow)) * 100 
        : 50;
      kValues.push(k);
    }
    
    // Calculate %D (SMA of %K)
    for (let i = dPeriod - 1; i < kValues.length; i++) {
      const dSum = kValues.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0);
      const d = dSum / dPeriod;
      
      stochData.push({
        time: candles[kPeriod - 1 + i].time,
        k: kValues[i],
        d,
      });
    }
    
    return stochData;
  }, [candles]);

  // ATR (Average True Range) - 14 period
  const atr = useMemo(() => {
    if (candles.length < 15) return [];
    
    const period = 14;
    const atrData: ATRData[] = [];
    const trueRanges: number[] = [];
    
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const prev = candles[i - 1];
      
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - prev.close),
        Math.abs(current.low - prev.close)
      );
      trueRanges.push(tr);
    }
    
    // First ATR is SMA
    let atrValue = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < trueRanges.length; i++) {
      atrValue = ((atrValue * (period - 1)) + trueRanges[i]) / period;
      
      atrData.push({
        time: candles[i + 1].time,
        value: atrValue * 10000, // Scale for pips
      });
    }
    
    return atrData;
  }, [candles]);

  // Volume
  const volume = useMemo(() => {
    return candles.map((candle, i) => ({
      time: candle.time,
      value: candle.volume,
      color: candle.close >= candle.open ? '#22c55e80' : '#ef444480',
    }));
  }, [candles]);

  // Calculate EMA for different periods (common: 9, 12, 20, 26, 50, 200)
  const ema = useMemo(() => {
    const closes = candles.map(c => c.close);
    const periods = [9, 12, 20, 26, 50];
    const allEmaData: EMAData[] = [];

    periods.forEach(period => {
      if (closes.length < period) return;

      const emaValues = calculateEMA(closes, period);

      for (let i = period - 1; i < closes.length; i++) {
        if (emaValues[i] !== undefined) {
          allEmaData.push({
            time: candles[i].time,
            value: emaValues[i]!,
            period,
          });
        }
      }
    });

    return allEmaData;
  }, [candles]);

  // Calculate SMA for different periods (common: 20, 50, 100, 200)
  const sma = useMemo(() => {
    const closes = candles.map(c => c.close);
    const periods = [20, 50, 100, 200];
    const allSmaData: SMAData[] = [];

    periods.forEach(period => {
      if (closes.length < period) return;

      const smaValues = calculateSMA(closes, period);

      for (let i = period - 1; i < closes.length; i++) {
        if (smaValues[i] !== undefined) {
          allSmaData.push({
            time: candles[i].time,
            value: smaValues[i]!,
            period,
          });
        }
      }
    });

    return allSmaData;
  }, [candles]);

  return { rsi, macd, bollingerBands, stochastic, atr, volume, ema, sma };
}
