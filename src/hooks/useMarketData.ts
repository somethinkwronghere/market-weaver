import { useState, useCallback, useRef, useEffect } from "react";
import Papa from "papaparse";
import { OHLCData, PlaybackSpeed } from "@/types/trading";
import { Timeframe } from "@/components/TimeframeSelector";
import { TradingPair } from "@/components/PairSelector";
import { supabase } from "@/integrations/supabase/client";

interface CSVRow {
  [key: string]: string; // First column may have empty name or be indexed
  Open: string;
  High: string;
  Low: string;
  Close: string;
  Volume: string;
}

type PlaybackState = "idle" | "playing" | "paused";

function normalizeTimestampToSeconds(t: number): number {
  // lightweight-charts expects UTC seconds (integer)
  if (!Number.isFinite(t)) return 0;
  const seconds = t > 1e12 ? t / 1000 : t; // ms -> s heuristic
  return Math.floor(seconds);
}

function parseTimestampStringToSeconds(input: string | undefined): number {
  if (!input) return 0;
  const s = String(input).trim();
  if (!s) return 0;

  // Numeric epoch (seconds or ms)
  if (/^\d+(?:\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return 0;
    return normalizeTimestampToSeconds(n);
  }

  // Cross-browser ISO normalization.
  // CSV timestamps look like: "2024-01-01 00:00:00" (no timezone).
  const isoBase = s.replace(" ", "T");
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(isoBase);
  const iso = hasTimezone ? isoBase : `${isoBase}Z`; // treat as UTC when TZ is missing

  const ms = new Date(iso).getTime();
  return normalizeTimestampToSeconds(ms);
}

// Get aggregation multiplier based on timeframe (relative to 1H base data)
function getAggregationMultiplier(timeframe: Timeframe): number {
  switch (timeframe) {
    case '1M': return 1;    // No aggregation for minute data
    case '5M': return 1;
    case '15M': return 1;
    case '1H': return 1;
    case '4H': return 4;
    case '1D': return 24;
    case '1W': return 168;  // 24 * 7
    case '1MO': return 720; // ~30 days
    default: return 1;
  }
}

// Aggregate candles based on timeframe
function aggregateCandles(candles: OHLCData[], timeframe: Timeframe): OHLCData[] {
  const multiplier = getAggregationMultiplier(timeframe);
  if (multiplier === 1 || candles.length === 0) return candles;

  const aggregated: OHLCData[] = [];

  for (let i = 0; i < candles.length; i += multiplier) {
    const chunk = candles.slice(i, Math.min(i + multiplier, candles.length));
    if (chunk.length === 0) continue;

    const aggregatedCandle: OHLCData = {
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, c) => sum + c.volume, 0),
    };
    aggregated.push(aggregatedCandle);
  }

  return aggregated;
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
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const playbackStateRef = useRef<PlaybackState>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isCsvLoaded, setIsCsvLoaded] = useState(false);

  // Timeframe and pair
  const [timeframe, setTimeframe] = useState<Timeframe>("1H");
  const [pair, setPair] = useState<TradingPair>("EUR/USD");

  // UI flags
  const [isLive, setIsLive] = useState(false);
  const [dataSource, setDataSource] = useState<"polygon" | "csv">("csv");
  const [dataUpdatedAt, setDataUpdatedAt] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [apiRateLimited, setApiRateLimited] = useState(false);

  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const livePollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastApiCallRef = useRef<number>(0);
  const didInitRef = useRef(false);
  const prevTimeframeRef = useRef<Timeframe>("1H");
  const prevPairRef = useRef<TradingPair>("EUR/USD");

  // Keep ref in sync with state
  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  // Load live data from Polygon API with rate limit protection
  const loadPolygonData = useCallback(
    async (opts?: { silent?: boolean; force?: boolean }) => {
      // When playback starts, stop pulling live data.
      if (!opts?.force && playbackStateRef.current !== "idle") return;

      // Rate limit protection: minimum 30 seconds between API calls
      const now = Date.now();
      if (now - lastApiCallRef.current < 30000 && !opts?.force) {
        console.log("Skipping API call - rate limit protection");
        return;
      }

      // If already rate limited, don't try again for 60 seconds
      if (apiRateLimited && now - lastApiCallRef.current < 60000) {
        console.log("Skipping API call - previously rate limited");
        return;
      }

      lastApiCallRef.current = now;

      if (!opts?.silent) setIsLoading(true);
      setError(null);

      try {
        const timespanMap: Record<Timeframe, { multiplier: number; timespan: string }> = {
          "1M": { multiplier: 1, timespan: "minute" },
          "5M": { multiplier: 5, timespan: "minute" },
          "15M": { multiplier: 15, timespan: "minute" },
          "1H": { multiplier: 1, timespan: "hour" },
          "4H": { multiplier: 4, timespan: "hour" },
          "1D": { multiplier: 1, timespan: "day" },
          "1W": { multiplier: 1, timespan: "week" },
          "1MO": { multiplier: 1, timespan: "month" },
        };

        const { multiplier, timespan } = timespanMap[timeframe];

        // Parse pair to get from/to currencies
        const [fromCurrency, toCurrency] = pair.split("/");

        const { data, error: fnError } = await supabase.functions.invoke("polygon-forex", {
          body: {
            from: fromCurrency,
            to: toCurrency,
            multiplier,
            timespan,
          },
        });

        if (fnError) throw fnError;
        if (data?.error) {
          // Check if it's a rate limit error
          if (data.error.includes("exceeded the maximum requests")) {
            setApiRateLimited(true);
            throw new Error("API rate limited - using CSV data");
          }
          throw new Error(data.error);
        }

        setApiRateLimited(false);

        const candles: OHLCData[] = (data?.candles || [])
          .map((c: OHLCData) => ({ ...c, time: normalizeTimestampToSeconds(c.time) }))
          .filter((c: OHLCData) => c.time > 0)
          .sort((a: OHLCData, b: OHLCData) => a.time - b.time);

        if (candles.length === 0) throw new Error("No data returned from Polygon API");

        setLiveCandles(candles);
        setIsLive(true);
        setDataSource("polygon");
        setDataUpdatedAt(Date.now());

        // When idle, always show live candles
        if (playbackStateRef.current === "idle") {
          setVisibleCandles(candles);
        }

        console.log(`Loaded ${candles.length} candles from Polygon API`);
      } catch (err) {
        console.error("Failed to load Polygon data:", err);
        const errorMsg = err instanceof Error ? err.message : "Failed to load Polygon data";
        setError(errorMsg);

        // Fallback: if we have no visible data and CSV is loaded, show CSV data as "live" view
        if (
          playbackStateRef.current === "idle" &&
          visibleCandles.length === 0 &&
          csvCandles.length > 0
        ) {
          console.log("Using CSV data as fallback for live view");
          setVisibleCandles(csvCandles);
          setLiveCandles(csvCandles);
          setIsLive(false);
          setDataSource("csv");
          setDataUpdatedAt(Date.now());
        }
      } finally {
        if (!opts?.silent) setIsLoading(false);
      }
    },
    [timeframe, pair, apiRateLimited, visibleCandles.length, csvCandles]
  );

  // Load CSV data for playback
  const loadCSVData = useCallback(async () => {
    if (isCsvLoaded) return;

    try {
      const response = await fetch("/data/synthetic_ohlc_timegan-2.csv");
      if (!response.ok) throw new Error(`CSV fetch failed: ${response.status}`);

      const csvText = await response.text();

      const applyCandles = (candles: OHLCData[]) => {
        if (candles.length === 0) {
          setError("CSV parse produced 0 candles");
          setIsCsvLoaded(false);
          return;
        }

        setRawCsvCandles(candles);

        const aggregated = aggregateCandles(candles, timeframe).sort((a, b) => a.time - b.time);
        setCsvCandles(aggregated);
        setIsCsvLoaded(true);

        // If user hit play before CSV finished loading, ensure at least 1 bar becomes visible.
        if (playbackStateRef.current !== "idle" && aggregated.length > 0) {
          setVisibleCandles((prev) => (prev.length === 0 ? [aggregated[0]] : prev));
        }

        // If we're in idle mode and have no visible candles yet, show CSV as fallback
        if (playbackStateRef.current === "idle") {
          setVisibleCandles((prev) => {
            if (prev.length === 0) {
              console.log("Showing CSV data as initial fallback");
              setLiveCandles(aggregated);
              setIsLive(false);
              setDataSource("csv");
              setDataUpdatedAt(Date.now());
              return aggregated;
            }
            return prev;
          });
        }

        console.log(`Loaded ${aggregated.length} CSV candles for playback`);
      };

      // 1) Try header-based parse (works when CSV has a real timestamp header).
      Papa.parse<CSVRow>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const known = new Set(["Open", "High", "Low", "Close", "Volume"]);

          const candles: OHLCData[] = results.data
            .map((row) => {
              const keys = Object.keys(row);
              const tsKey = keys.find((k) => !known.has(k) && row[k]) || "";
              // If we couldn't find a timestamp key, we'll try the index-based fallback below.
              if (!tsKey) return null;

              const t = parseTimestampStringToSeconds(row[tsKey]);
              if (!t) return null;

              const open = parseFloat(row.Open);
              const high = parseFloat(row.High);
              const low = parseFloat(row.Low);
              const close = parseFloat(row.Close);
              const volume = parseFloat(row.Volume);

              if (![open, high, low, close].every(Number.isFinite)) return null;

              return {
                time: t,
                open,
                high,
                low,
                close,
                volume: Number.isFinite(volume) ? volume : 0,
              } satisfies OHLCData;
            })
            .filter((c): c is OHLCData => !!c)
            .sort((a, b) => a.time - b.time);

          if (candles.length > 0) {
            applyCandles(candles);
            return;
          }

          // 2) Fallback: index-based parse for files like:
          // ,Open,High,Low,Close,Volume
          // 2024-01-01 00:00:00,1.23,1.24,...
          Papa.parse<string[]>(csvText, {
            header: false,
            skipEmptyLines: true,
            complete: (r) => {
              const rows = (r.data || []).filter((row) => Array.isArray(row) && row.length >= 5);
              const body = rows.slice(1); // drop header row

              const candles2: OHLCData[] = body
                .map((row) => {
                  const ts = row[0];
                  const t = parseTimestampStringToSeconds(ts);
                  if (!t) return null;

                  const open = parseFloat(row[1]);
                  const high = parseFloat(row[2]);
                  const low = parseFloat(row[3]);
                  const close = parseFloat(row[4]);
                  const volume = row[5] ? parseFloat(row[5]) : 0;

                  if (![open, high, low, close].every(Number.isFinite)) return null;

                  return {
                    time: t,
                    open,
                    high,
                    low,
                    close,
                    volume: Number.isFinite(volume) ? volume : 0,
                  } satisfies OHLCData;
                })
                .filter((c): c is OHLCData => !!c)
                .sort((a, b) => a.time - b.time);

              applyCandles(candles2);
            },
          });
        },
      });
    } catch (e) {
      console.error("Failed to load CSV data:", e);
      setError(e instanceof Error ? e.message : "Failed to load CSV data");
      setIsCsvLoaded(false);
    }
  }, [timeframe, isCsvLoaded]);

  // Initial load - CSV first, then try API (guarded against React StrictMode double-invocation)
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    // Load CSV first as it's guaranteed to work
    loadCSVData();

    // Then try to load live data (may fail due to rate limits)
    const timer = setTimeout(() => {
      loadPolygonData({ force: true });
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll live data only while idle - reduced frequency to avoid rate limits
  useEffect(() => {
    if (playbackState === "idle" && !apiRateLimited) {
      if (livePollIntervalRef.current) clearInterval(livePollIntervalRef.current);
      // Poll every 60 seconds to avoid rate limits
      livePollIntervalRef.current = setInterval(() => {
        loadPolygonData({ silent: true, force: false });
      }, 60000);
    } else if (livePollIntervalRef.current) {
      clearInterval(livePollIntervalRef.current);
      livePollIntervalRef.current = null;
    }

    return () => {
      if (livePollIntervalRef.current) {
        clearInterval(livePollIntervalRef.current);
        livePollIntervalRef.current = null;
      }
    };
  }, [playbackState, loadPolygonData, apiRateLimited]);

  // Handle timeframe changes (only act when timeframe actually changes)
  useEffect(() => {
    const prevTf = prevTimeframeRef.current;
    if (prevTf === timeframe) return;
    prevTimeframeRef.current = timeframe;

    // Reload live data with new timeframe (only if we are in live mode)
    if (playbackStateRef.current === "idle" && !apiRateLimited) {
      loadPolygonData({ force: true });
    }

    // Re-aggregate CSV data if loaded
    if (rawCsvCandles.length > 0) {
      const aggregated = aggregateCandles(rawCsvCandles, timeframe).sort((a, b) => a.time - b.time);
      setCsvCandles(aggregated);

      // If user is currently in playback mode and timeframe changes, reset to start (paused)
      if (playbackStateRef.current !== "idle") {
        setPlaybackState("paused");
        setCurrentIndex(0);
        setVisibleCandles(aggregated.length > 0 ? [aggregated[0]] : []);
        setIsLive(false);
      }
    }
  }, [timeframe, rawCsvCandles, loadPolygonData, apiRateLimited]);

  // Handle pair changes
  useEffect(() => {
    const prevP = prevPairRef.current;
    if (prevP === pair) return;
    prevPairRef.current = pair;

    // Reset to idle and reload data for new pair
    if (playbackStateRef.current !== "idle") {
      setPlaybackState("idle");
    }
    setCurrentIndex(0);
    setVisibleCandles([]);
    setLiveCandles([]);
    
    // Reload live data with new pair
    if (!apiRateLimited) {
      loadPolygonData({ force: true });
    }
  }, [pair, loadPolygonData, apiRateLimited]);

  const addNextCandle = useCallback(() => {
    if (csvCandles.length === 0) return;

    setCurrentIndex((prev) => {
      // Stop at the end of CSV (no infinite synthetic extension)
      if (prev >= csvCandles.length - 1) {
        setPlaybackState("paused");
        // Keep live candles + all CSV candles
        setVisibleCandles(current => {
          const liveCount = liveCandles.length;
          if (liveCount > 0) {
            return [...liveCandles, ...csvCandles];
          }
          return csvCandles;
        });
        setIsLive(false);
        return prev;
      }

      const nextIndex = prev + 1;
      // Append next CSV candle to visible candles (which includes live + previous CSV)
      setVisibleCandles(current => {
        // If we have live candles at the beginning, keep them
        const liveCount = liveCandles.length;
        if (liveCount > 0) {
          return [...liveCandles, ...csvCandles.slice(0, nextIndex + 1)];
        }
        return csvCandles.slice(0, nextIndex + 1);
      });

      if (nextIndex >= csvCandles.length - 1) {
        setPlaybackState("paused");
      }

      return nextIndex;
    });
  }, [csvCandles, liveCandles]);

  // Play - start CSV playback, continuing from live data
  const play = useCallback(() => {
    if (csvCandles.length === 0) {
      console.log("CSV candles not loaded yet");
      return;
    }

    // When transitioning from idle (live view) to playback:
    // Append CSV data after live candles for seamless continuation
    if (playbackState === "idle") {
      // Get the last live candle's timestamp to continue from
      const lastLiveCandle = liveCandles[liveCandles.length - 1];
      
      if (lastLiveCandle && liveCandles.length > 0) {
        // Adjust CSV timestamps to continue after live data
        const timeOffset = lastLiveCandle.time - csvCandles[0].time + 3600; // 1 hour gap
        const adjustedCsvCandles = csvCandles.map(c => ({
          ...c,
          time: c.time + timeOffset
        }));
        
        // Start with live candles + first synthetic candle
        const combinedCandles = [...liveCandles, adjustedCsvCandles[0]];
        setVisibleCandles(combinedCandles);
        setCurrentIndex(0);
        
        // Store adjusted candles for playback
        setCsvCandles(adjustedCsvCandles);
      } else {
        // No live candles, just start from CSV
        setCurrentIndex(0);
        setVisibleCandles([csvCandles[0]]);
      }
      setIsLive(false);
    }

    setPlaybackState("playing");
  }, [playbackState, csvCandles, liveCandles]);

  // Pause playback
  const pause = useCallback(() => {
    setPlaybackState("paused");
  }, []);

  // Step forward
  const stepForward = useCallback(() => {
    if (csvCandles.length === 0) return;

    if (playbackState === "idle") {
      setCurrentIndex(0);
      setVisibleCandles([csvCandles[0]]);
      setPlaybackState("paused");
      setIsLive(false);
    } else {
      addNextCandle();
    }
  }, [playbackState, csvCandles, addNextCandle]);

  // Step backward
  const stepBackward = useCallback(() => {
    if (playbackState === "idle") return;

    setCurrentIndex((prev) => {
      if (prev <= 0) {
        setVisibleCandles(csvCandles.length > 0 ? [csvCandles[0]] : []);
        return 0;
      }

      const newIndex = prev - 1;
      setVisibleCandles(csvCandles.slice(0, newIndex + 1));
      setIsLive(false);
      return newIndex;
    });
  }, [csvCandles, playbackState]);

  // Reset - go back to showing live data
  const reset = useCallback(() => {
    setPlaybackState("idle");
    setCurrentIndex(0);
    setVisibleCandles(liveCandles);
    setIsLive(false);

    // Refresh live candles silently when returning to live mode
    loadPolygonData({ silent: true, force: true });
  }, [liveCandles, loadPolygonData]);

  // Jump to specific index
  const jumpTo = useCallback(
    (index: number) => {
      if (csvCandles.length === 0) return;

      if (playbackState === "idle") {
        setPlaybackState("paused");
      }

      const clampedIndex = Math.max(0, Math.min(index, csvCandles.length - 1));
      setCurrentIndex(clampedIndex);
      setVisibleCandles(csvCandles.slice(0, clampedIndex + 1));
      setIsLive(false);
    },
    [csvCandles, playbackState]
  );

  // Playback interval
  useEffect(() => {
    if (playbackState === "playing") {
      const interval = 1000 / speed;
      playbackIntervalRef.current = setInterval(addNextCandle, interval);
    } else if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [playbackState, speed, addNextCandle]);

  const currentCandle = visibleCandles[visibleCandles.length - 1] || null;
  const isPlaying = playbackState === "playing";
  const isInPlaybackMode = playbackState !== "idle";
  const totalCandles = isInPlaybackMode ? csvCandles.length : liveCandles.length;
  const progress = isInPlaybackMode
    ? csvCandles.length > 0
      ? (visibleCandles.length / csvCandles.length) * 100
      : 0
    : 100;

  const liveLastCandleTime = liveCandles[liveCandles.length - 1]?.time ?? null;
  const liveAgeSeconds = liveLastCandleTime
    ? Math.max(0, Math.floor(Date.now() / 1000 - liveLastCandleTime))
    : null;
  // If the most recent "live" candle is older than 6 hours, treat the feed as delayed.
  const liveIsStale = liveAgeSeconds !== null ? liveAgeSeconds > 6 * 60 * 60 : false;

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
    pair,
    isLive,
    dataSource,
    dataUpdatedAt,
    liveLastCandleTime,
    liveIsStale,
    error,
    play,
    pause,
    stepForward,
    stepBackward,
    reset,
    jumpTo,
    setSpeed,
    setTimeframe,
    setPair,
  };
}
