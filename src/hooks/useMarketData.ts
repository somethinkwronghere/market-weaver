import { useState, useCallback, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { OHLCData, PlaybackSpeed } from '@/types/trading';
import { Timeframe } from '@/components/TimeframeSelector';
import { supabase } from '@/integrations/supabase/client';

interface CSVRow {
  '': string;
  Open: string;
  High: string;
  Low: string;
  Close: string;
  Volume: string;
}

type PlaybackState = 'idle' | 'playing' | 'paused';

// Aggregate candles based on timeframe
function aggregateCandles(candles: OHLCData[], timeframe: Timeframe): OHLCData[] {
  if (timeframe === '1H' || candles.length === 0) return candles;

  const multiplier = timeframe === '4H' ? 4 : 24;
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

// Generate synthetic candle based on previous candles
function generateSyntheticCandle(prevCandles: OHLCData[], lastTime: number, timeframe: Timeframe): OHLCData {
  const lastCandle = prevCandles[prevCandles.length - 1];
  const recentCandles = prevCandles.slice(-20);
  
  // Calculate average volatility from recent candles
  const avgRange = recentCandles.reduce((sum, c) => sum + (c.high - c.low), 0) / recentCandles.length;
  const avgVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
  
  // Calculate trend direction from recent closes
  const trendStrength = recentCandles.length > 5 
    ? (recentCandles[recentCandles.length - 1].close - recentCandles[0].close) / recentCandles[0].close
    : 0;
  
  // Random walk with trend bias
  const randomFactor = (Math.random() - 0.5) * 2;
  const trendBias = trendStrength * 10;
  const direction = randomFactor + trendBias;
  
  // Generate open (gap from previous close with small random factor)
  const gapFactor = (Math.random() - 0.5) * avgRange * 0.1;
  const open = lastCandle.close + gapFactor;
  
  // Generate close based on direction
  const priceChange = direction * avgRange * (0.3 + Math.random() * 0.7);
  const close = open + priceChange;
  
  // Generate high and low
  const wickUp = Math.random() * avgRange * 0.5;
  const wickDown = Math.random() * avgRange * 0.5;
  const high = Math.max(open, close) + wickUp;
  const low = Math.min(open, close) - wickDown;
  
  // Generate volume with some randomness
  const volumeVariation = 0.5 + Math.random();
  const volume = avgVolume * volumeVariation;
  
  // Calculate next time based on timeframe
  const timeIncrement = timeframe === '1H' ? 3600 : timeframe === '4H' ? 14400 : 86400;
  
  return {
    time: lastTime + timeIncrement,
    open,
    high,
    low,
    close,
    volume,
  };
}

export function useMarketData() {
  // Live data from Polygon
  const [liveCandles, setLiveCandles] = useState<OHLCData[]>([]);
  
  // CSV data for playback
  const [csvCandles, setCsvCandles] = useState<OHLCData[]>([]);
  const [rawCsvCandles, setRawCsvCandles] = useState<OHLCData[]>([]);
  
  // Visible candles (what's shown on chart)
  const [visibleCandles, setVisibleCandles] = useState<OHLCData[]>([]);
  
  // Playback state
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isCsvLoaded, setIsCsvLoaded] = useState(false);
  
  // Timeframe and live mode
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const [isLive, setIsLive] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syntheticCandlesRef = useRef<OHLCData[]>([]);

  // Load live data from Polygon API
  const loadPolygonData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const timespanMap: Record<Timeframe, { multiplier: number; timespan: string }> = {
        '1H': { multiplier: 1, timespan: 'hour' },
        '4H': { multiplier: 4, timespan: 'hour' },
        '1D': { multiplier: 1, timespan: 'day' },
      };
      
      const { multiplier, timespan } = timespanMap[timeframe];
      
      const { data, error: fnError } = await supabase.functions.invoke('polygon-forex', {
        body: { 
          from: 'EUR', 
          to: 'USD',
          multiplier,
          timespan,
        },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      // Sort candles by time to ensure ascending order
      const candles: OHLCData[] = (data.candles || [])
        .sort((a: OHLCData, b: OHLCData) => a.time - b.time);
      
      if (candles.length === 0) {
        throw new Error('No data returned from Polygon API');
      }

      setLiveCandles(candles);
      // When idle, show all live candles
      if (playbackState === 'idle') {
        setVisibleCandles(candles);
      }
      console.log(`Loaded ${candles.length} candles from Polygon API`);
    } catch (err) {
      console.error('Failed to load Polygon data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Polygon data');
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, playbackState]);

  // Load CSV data for playback
  const loadCSVData = useCallback(async () => {
    if (isCsvLoaded) return;
    
    try {
      const response = await fetch('/data/synthetic_ohlc_timegan-2.csv');
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
          
          setRawCsvCandles(candles);
          const aggregated = aggregateCandles(candles, timeframe);
          setCsvCandles(aggregated);
          setIsCsvLoaded(true);
          console.log(`Loaded ${aggregated.length} CSV candles for playback`);
        },
      });
    } catch (error) {
      console.error('Failed to load CSV data:', error);
      setError('Failed to load CSV data');
    }
  }, [timeframe, isCsvLoaded]);

  // Initial load - get live Polygon data
  useEffect(() => {
    loadPolygonData();
    loadCSVData();
  }, []);

  // Handle timeframe changes
  useEffect(() => {
    // Reload live data with new timeframe
    loadPolygonData();
    
    // Re-aggregate CSV data if loaded
    if (rawCsvCandles.length > 0) {
      const aggregated = aggregateCandles(rawCsvCandles, timeframe);
      setCsvCandles(aggregated);
      
      // If in playback mode, reset
      if (playbackState !== 'idle') {
        setPlaybackState('paused');
        setCurrentIndex(0);
        syntheticCandlesRef.current = [];
        setVisibleCandles(aggregated.length > 0 ? [aggregated[0]] : []);
        setIsLive(false);
      }
    }
  }, [timeframe]);

  // Add next candle during playback
  const addNextCandle = useCallback(() => {
    setCurrentIndex(prev => {
      const nextIndex = prev + 1;
      
      // If we've reached the end of CSV data, generate synthetic candle
      if (nextIndex >= csvCandles.length) {
        const allVisible = [...csvCandles, ...syntheticCandlesRef.current];
        const lastCandle = allVisible[allVisible.length - 1];
        const newSyntheticCandle = generateSyntheticCandle(allVisible, lastCandle.time, timeframe);
        syntheticCandlesRef.current = [...syntheticCandlesRef.current, newSyntheticCandle];
        setVisibleCandles([...csvCandles, ...syntheticCandlesRef.current]);
        setIsLive(true);
        return nextIndex;
      }
      
      setVisibleCandles([...csvCandles.slice(0, nextIndex + 1), ...syntheticCandlesRef.current]);
      return nextIndex;
    });
  }, [csvCandles, timeframe]);

  // Play - start CSV playback, stop showing live data
  const play = useCallback(() => {
    if (playbackState === 'idle') {
      // First time playing - start from beginning of CSV
      setCurrentIndex(0);
      syntheticCandlesRef.current = [];
      setVisibleCandles(csvCandles.length > 0 ? [csvCandles[0]] : []);
    }
    setPlaybackState('playing');
  }, [playbackState, csvCandles]);

  // Pause playback
  const pause = useCallback(() => {
    setPlaybackState('paused');
  }, []);

  // Step forward
  const stepForward = useCallback(() => {
    if (playbackState === 'idle') {
      // Start playback mode
      setCurrentIndex(0);
      syntheticCandlesRef.current = [];
      setVisibleCandles(csvCandles.length > 0 ? [csvCandles[0]] : []);
      setPlaybackState('paused');
    } else {
      addNextCandle();
    }
  }, [playbackState, csvCandles, addNextCandle]);

  // Step backward
  const stepBackward = useCallback(() => {
    if (playbackState === 'idle') return;
    
    setCurrentIndex(prev => {
      if (prev <= 0) return 0;
      
      const newIndex = prev - 1;
      
      // If stepping back from synthetic territory
      if (syntheticCandlesRef.current.length > 0 && newIndex >= csvCandles.length - 1) {
        syntheticCandlesRef.current = syntheticCandlesRef.current.slice(0, -1);
        setVisibleCandles([...csvCandles, ...syntheticCandlesRef.current]);
        if (syntheticCandlesRef.current.length === 0) setIsLive(false);
      } else {
        setVisibleCandles(csvCandles.slice(0, newIndex + 1));
        setIsLive(false);
      }
      
      return newIndex;
    });
  }, [csvCandles]);

  // Reset - go back to showing live data
  const reset = useCallback(() => {
    setPlaybackState('idle');
    setCurrentIndex(0);
    syntheticCandlesRef.current = [];
    setVisibleCandles(liveCandles);
    setIsLive(false);
  }, [liveCandles]);

  // Jump to specific index
  const jumpTo = useCallback((index: number) => {
    if (playbackState === 'idle') {
      setPlaybackState('paused');
    }
    const clampedIndex = Math.max(0, Math.min(index, csvCandles.length - 1));
    setCurrentIndex(clampedIndex);
    syntheticCandlesRef.current = [];
    setVisibleCandles(csvCandles.slice(0, clampedIndex + 1));
    setIsLive(false);
  }, [csvCandles, playbackState]);

  // Playback interval
  useEffect(() => {
    if (playbackState === 'playing') {
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
  }, [playbackState, speed, addNextCandle]);

  const currentCandle = visibleCandles[visibleCandles.length - 1] || null;
  const isPlaying = playbackState === 'playing';
  const isInPlaybackMode = playbackState !== 'idle';
  const totalCandles = isInPlaybackMode ? csvCandles.length : liveCandles.length;
  const progress = isInPlaybackMode 
    ? (csvCandles.length > 0 ? (visibleCandles.length / csvCandles.length) * 100 : 0)
    : 100;

  return {
    allCandles: isInPlaybackMode ? csvCandles : liveCandles,
    visibleCandles,
    currentCandle,
    currentIndex,
    totalCandles,
    progress: Math.min(progress, 100),
    isPlaying,
    isInPlaybackMode,
    speed,
    isLoading,
    timeframe,
    isLive,
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
