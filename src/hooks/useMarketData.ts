import { useState, useCallback, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { OHLCData, PlaybackSpeed } from '@/types/trading';
import { Timeframe } from '@/components/TimeframeSelector';

interface CSVRow {
  '': string;
  Open: string;
  High: string;
  Low: string;
  Close: string;
  Volume: string;
}

// Aggregate candles based on timeframe
function aggregateCandles(candles: OHLCData[], timeframe: Timeframe): OHLCData[] {
  if (timeframe === '1H' || candles.length === 0) return candles;

  const multiplier = timeframe === '4H' ? 4 : 24; // 4H = 4 candles, 1D = 24 candles
  const aggregated: OHLCData[] = [];

  for (let i = 0; i < candles.length; i += multiplier) {
    const chunk = candles.slice(i, Math.min(i + multiplier, candles.length));
    if (chunk.length === 0) continue;

    const aggregatedCandle: OHLCData = {
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map(c => c.high)),
      low: Math.min(...chunk.map(c => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, c) => sum + c.volume, 0),
    };
    aggregated.push(aggregatedCandle);
  }

  return aggregated;
}

export function useMarketData() {
  const [rawCandles, setRawCandles] = useState<OHLCData[]>([]);
  const [allCandles, setAllCandles] = useState<OHLCData[]>([]);
  const [visibleCandles, setVisibleCandles] = useState<OHLCData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/data/synthetic_ohlc.csv');
      const csvText = await response.text();
      
      Papa.parse<CSVRow>(csvText, {
        header: true,
        complete: (results) => {
          const candles: OHLCData[] = results.data
            .filter(row => row[''] && row.Open)
            .map(row => ({
              time: new Date(row['']).getTime() / 1000,
              open: parseFloat(row.Open),
              high: parseFloat(row.High),
              low: parseFloat(row.Low),
              close: parseFloat(row.Close),
              volume: parseFloat(row.Volume),
            }));
          
          setRawCandles(candles);
          const aggregated = aggregateCandles(candles, timeframe);
          setAllCandles(aggregated);
          setVisibleCandles(aggregated.length > 0 ? [aggregated[0]] : []);
          setCurrentIndex(0);
          setIsLoading(false);
        },
      });
    } catch (error) {
      console.error('Failed to load market data:', error);
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    loadData();
  }, []);

  // Handle timeframe changes
  useEffect(() => {
    if (rawCandles.length > 0) {
      const aggregated = aggregateCandles(rawCandles, timeframe);
      setAllCandles(aggregated);
      // Reset to beginning when timeframe changes
      setVisibleCandles(aggregated.length > 0 ? [aggregated[0]] : []);
      setCurrentIndex(0);
      setIsPlaying(false);
    }
  }, [timeframe, rawCandles]);

  const addNextCandle = useCallback(() => {
    setCurrentIndex(prev => {
      const nextIndex = prev + 1;
      if (nextIndex >= allCandles.length) {
        setIsPlaying(false);
        return prev;
      }
      setVisibleCandles(allCandles.slice(0, nextIndex + 1));
      return nextIndex;
    });
  }, [allCandles]);

  const play = useCallback(() => {
    if (currentIndex >= allCandles.length - 1) return;
    setIsPlaying(true);
  }, [currentIndex, allCandles.length]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const stepForward = useCallback(() => {
    if (currentIndex < allCandles.length - 1) {
      addNextCandle();
    }
  }, [currentIndex, allCandles.length, addNextCandle]);

  const stepBackward = useCallback(() => {
    setCurrentIndex(prev => {
      const newIndex = Math.max(0, prev - 1);
      setVisibleCandles(allCandles.slice(0, newIndex + 1));
      return newIndex;
    });
  }, [allCandles]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
    setVisibleCandles(allCandles.length > 0 ? [allCandles[0]] : []);
  }, [allCandles]);

  const jumpTo = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, allCandles.length - 1));
    setCurrentIndex(clampedIndex);
    setVisibleCandles(allCandles.slice(0, clampedIndex + 1));
  }, [allCandles]);

  useEffect(() => {
    if (isPlaying) {
      const interval = 1000 / speed;
      intervalRef.current = setInterval(addNextCandle, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed, addNextCandle]);

  const currentCandle = visibleCandles[visibleCandles.length - 1] || null;
  const progress = allCandles.length > 0 ? ((currentIndex + 1) / allCandles.length) * 100 : 0;

  return {
    allCandles,
    visibleCandles,
    currentCandle,
    currentIndex,
    totalCandles: allCandles.length,
    progress,
    isPlaying,
    speed,
    isLoading,
    timeframe,
    play,
    pause,
    stepForward,
    stepBackward,
    reset,
    jumpTo,
    setSpeed,
    setTimeframe,
  };
}
