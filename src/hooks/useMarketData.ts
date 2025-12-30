import { useState, useCallback, useRef, useEffect } from "react";
import Papa from "papaparse";
import { OHLCData, PlaybackSpeed } from "@/types/trading";
import { Timeframe } from "@/components/TimeframeSelector";
import { supabase } from "@/integrations/supabase/client";

interface CSVRow {
  "": string;
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

// Aggregate candles based on timeframe
function aggregateCandles(candles: OHLCData[], timeframe: Timeframe): OHLCData[] {
  if (timeframe === "1H" || candles.length === 0) return candles;

  const multiplier = timeframe === "4H" ? 4 : 24;
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

  // Timeframe
  const [timeframe, setTimeframe] = useState<Timeframe>("1H");

  // UI flags (kept for compatibility; we no longer generate infinite synthetic candles)
  const [isLive, setIsLive] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const livePollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  // Load live data from Polygon API
  const loadPolygonData = useCallback(
    async (opts?: { silent?: boolean; force?: boolean }) => {
      // When playback starts, stop pulling live data.
      if (!opts?.force && playbackStateRef.current !== "idle") return;

      if (!opts?.silent) setIsLoading(true);
      setError(null);

      try {
        const timespanMap: Record<Timeframe, { multiplier: number; timespan: string }> = {
          "1H": { multiplier: 1, timespan: "hour" },
          "4H": { multiplier: 4, timespan: "hour" },
          "1D": { multiplier: 1, timespan: "day" },
        };

        const { multiplier, timespan } = timespanMap[timeframe];

        const { data, error: fnError } = await supabase.functions.invoke("polygon-forex", {
          body: {
            from: "EUR",
            to: "USD",
            multiplier,
            timespan,
          },
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        const candles: OHLCData[] = (data?.candles || [])
          .map((c: OHLCData) => ({ ...c, time: normalizeTimestampToSeconds(c.time) }))
          .filter((c: OHLCData) => c.time > 0)
          .sort((a: OHLCData, b: OHLCData) => a.time - b.time);

        if (candles.length === 0) throw new Error("No data returned from Polygon API");

        setLiveCandles(candles);

        // When idle, always show live candles
        if (playbackStateRef.current === "idle") {
          setVisibleCandles(candles);
        }

        console.log(
          `Loaded ${candles.length} candles from Polygon API, playbackState: ${playbackStateRef.current}`
        );
      } catch (err) {
        console.error("Failed to load Polygon data:", err);
        setError(err instanceof Error ? err.message : "Failed to load Polygon data");
      } finally {
        if (!opts?.silent) setIsLoading(false);
      }
    },
    [timeframe]
  );

  // Load CSV data for playback
  const loadCSVData = useCallback(async () => {
    if (isCsvLoaded) return;

    try {
      const response = await fetch("/data/synthetic_ohlc_timegan-2.csv");
      if (!response.ok) throw new Error(`CSV fetch failed: ${response.status}`);

      const csvText = await response.text();

      Papa.parse<CSVRow>(csvText, {
        header: true,
        complete: (results) => {
          const candles: OHLCData[] = results.data
            .filter((row) => row[""] && row.Open)
            .map((row) => ({
              time: normalizeTimestampToSeconds(new Date(row[""]).getTime()),
              open: parseFloat(row.Open),
              high: parseFloat(row.High),
              low: parseFloat(row.Low),
              close: parseFloat(row.Close),
              volume: parseFloat(row.Volume),
            }))
            .filter((c) =>
              Number.isFinite(c.time) &&
              Number.isFinite(c.open) &&
              Number.isFinite(c.high) &&
              Number.isFinite(c.low) &&
              Number.isFinite(c.close)
            )
            .sort((a, b) => a.time - b.time);

          setRawCsvCandles(candles);

          const aggregated = aggregateCandles(candles, timeframe).sort((a, b) => a.time - b.time);
          setCsvCandles(aggregated);
          setIsCsvLoaded(true);

          // If user hit play before CSV finished loading, ensure at least 1 bar becomes visible.
          if (playbackStateRef.current !== "idle" && aggregated.length > 0) {
            setVisibleCandles((prev) => (prev.length === 0 ? [aggregated[0]] : prev));
          }

          console.log(`Loaded ${aggregated.length} CSV candles for playback`);
        },
      });
    } catch (e) {
      console.error("Failed to load CSV data:", e);
      setError(e instanceof Error ? e.message : "Failed to load CSV data");
    }
  }, [timeframe, isCsvLoaded]);

  // Initial load
  useEffect(() => {
    loadPolygonData({ force: true });
    loadCSVData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll live data only while idle (stops as soon as playback starts)
  useEffect(() => {
    if (playbackState === "idle") {
      if (livePollIntervalRef.current) clearInterval(livePollIntervalRef.current);
      livePollIntervalRef.current = setInterval(() => {
        loadPolygonData({ silent: true, force: true });
      }, 15000);
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
  }, [playbackState, loadPolygonData]);

  // Handle timeframe changes
  useEffect(() => {
    // Reload live data with new timeframe (only if we are in live mode)
    if (playbackStateRef.current === "idle") {
      loadPolygonData({ force: true });
    }

    // Re-aggregate CSV data if loaded
    if (rawCsvCandles.length > 0) {
      const aggregated = aggregateCandles(rawCsvCandles, timeframe).sort((a, b) => a.time - b.time);
      setCsvCandles(aggregated);

      // If in playback mode, reset to the start (paused)
      if (playbackState !== "idle") {
        setPlaybackState("paused");
        setCurrentIndex(0);
        setVisibleCandles(aggregated.length > 0 ? [aggregated[0]] : []);
        setIsLive(false);
      }
    }
  }, [timeframe, rawCsvCandles, playbackState, loadPolygonData]);

  const addNextCandle = useCallback(() => {
    if (csvCandles.length === 0) return;

    setCurrentIndex((prev) => {
      // Stop at the end of CSV (no infinite synthetic extension)
      if (prev >= csvCandles.length - 1) {
        setPlaybackState("paused");
        setVisibleCandles(csvCandles);
        setIsLive(false);
        return prev;
      }

      const nextIndex = prev + 1;
      setVisibleCandles(csvCandles.slice(0, nextIndex + 1));

      if (nextIndex >= csvCandles.length - 1) {
        setPlaybackState("paused");
      }

      return nextIndex;
    });
  }, [csvCandles]);

  // Play - start CSV playback, stop showing live data
  const play = useCallback(() => {
    if (csvCandles.length === 0) return;

    if (playbackState === "idle") {
      setCurrentIndex(0);
      setVisibleCandles([csvCandles[0]]);
      setIsLive(false);
    }

    setPlaybackState("playing");
  }, [playbackState, csvCandles]);

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
    error,
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
