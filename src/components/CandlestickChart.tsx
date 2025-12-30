import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import { OHLCData } from '@/types/trading';

interface CandlestickChartProps {
  data: OHLCData[];
  currentPrice?: number;
}

export function CandlestickChart({ data }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#070b14' },
        textColor: '#8b97a8',
      },
      grid: {
        vertLines: { color: '#131b2b' },
        horzLines: { color: '#131b2b' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#22c55e50',
          width: 1,
          style: 2,
          labelBackgroundColor: '#22c55e',
        },
        horzLine: {
          color: '#22c55e50',
          width: 1,
          style: 2,
          labelBackgroundColor: '#22c55e',
        },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      const chartData: CandlestickData<Time>[] = data.map(candle => ({
        time: candle.time as Time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));
      
      seriesRef.current.setData(chartData);
      
      // Auto-scroll to the latest candle
      if (chartRef.current) {
        chartRef.current.timeScale().scrollToRealTime();
      }
    }
  }, [data]);

  return (
    <div className="chart-container w-full h-full">
      <div ref={containerRef} className="w-full h-full min-h-[400px]" />
    </div>
  );
}
