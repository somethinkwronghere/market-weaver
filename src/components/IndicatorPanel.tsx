import { useRef, useEffect } from 'react';
import { createChart, IChartApi, ISeriesApi, Time, LineStyle } from 'lightweight-charts';
import { RSIData, MACDData, StochasticData, ATRData, VolumeData } from '@/hooks/useIndicators';
import { cn } from '@/lib/utils';

interface RSIPanelProps {
  data: RSIData[];
}

export function RSIPanel({ data }: RSIPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#8b97a8',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#131b2b' },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: { visible: false },
      height: 60,
      handleScale: false,
      handleScroll: false,
    });

    const series = chart.addLineSeries({
      color: '#8b5cf6',
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
    });

    series.createPriceLine({
      price: 70,
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
    });
    series.createPriceLine({
      price: 30,
      color: '#22c55e',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
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
      seriesRef.current.setData(
        data.map(d => ({ time: d.time as Time, value: d.value }))
      );
    }
  }, [data]);

  const currentValue = data[data.length - 1]?.value || 0;

  return (
    <div className="bg-card/50 rounded border border-border p-1">
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] font-medium text-muted-foreground">RSI (14)</span>
        <span className={cn(
          "text-[10px] font-mono font-semibold",
          currentValue > 70 ? "text-destructive" : currentValue < 30 ? "text-primary" : "text-foreground"
        )}>
          {currentValue.toFixed(1)}
        </span>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

interface MACDPanelProps {
  data: MACDData[];
}

export function MACDPanel({ data }: MACDPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#8b97a8',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#131b2b' },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: { visible: false },
      height: 60,
      handleScale: false,
      handleScroll: false,
    });

    const histogramSeries = chart.addHistogramSeries({
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    const macdSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    const signalSeries = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    chartRef.current = chart;

    if (data.length > 0) {
      histogramSeries.setData(
        data.map(d => ({
          time: d.time as Time,
          value: d.histogram,
          color: d.histogram >= 0 ? '#22c55e80' : '#ef444480',
        }))
      );
      macdSeries.setData(
        data.map(d => ({ time: d.time as Time, value: d.macd }))
      );
      signalSeries.setData(
        data.map(d => ({ time: d.time as Time, value: d.signal }))
      );
    }

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  const current = data[data.length - 1];

  return (
    <div className="bg-card/50 rounded border border-border p-1">
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] font-medium text-muted-foreground">MACD (12,26,9)</span>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-blue-400">{current?.macd.toFixed(2) || '0.00'}</span>
          <span className="text-amber-400">{current?.signal.toFixed(2) || '0.00'}</span>
        </div>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

interface StochasticPanelProps {
  data: StochasticData[];
}

export function StochasticPanel({ data }: StochasticPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#8b97a8',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#131b2b' },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: { visible: false },
      height: 60,
      handleScale: false,
      handleScroll: false,
    });

    const kSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
    });

    const dSeries = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 1,
      priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
    });

    // Add overbought/oversold levels
    kSeries.createPriceLine({
      price: 80,
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
    });
    kSeries.createPriceLine({
      price: 20,
      color: '#22c55e',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
    });

    chartRef.current = chart;

    if (data.length > 0) {
      kSeries.setData(data.map(d => ({ time: d.time as Time, value: d.k })));
      dSeries.setData(data.map(d => ({ time: d.time as Time, value: d.d })));
    }

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  const current = data[data.length - 1];

  return (
    <div className="bg-card/50 rounded border border-border p-1">
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] font-medium text-muted-foreground">Stoch (14,3,3)</span>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-blue-400">K: {current?.k.toFixed(1) || '0.0'}</span>
          <span className="text-amber-400">D: {current?.d.toFixed(1) || '0.0'}</span>
        </div>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

interface ATRPanelProps {
  data: ATRData[];
}

export function ATRPanel({ data }: ATRPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#8b97a8',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#131b2b' },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: { visible: false },
      height: 60,
      handleScale: false,
      handleScroll: false,
    });

    const series = chart.addAreaSeries({
      lineColor: '#06b6d4',
      topColor: '#06b6d420',
      bottomColor: '#06b6d405',
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
    });

    chartRef.current = chart;

    if (data.length > 0) {
      series.setData(data.map(d => ({ time: d.time as Time, value: d.value })));
    }

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  const current = data[data.length - 1];

  return (
    <div className="bg-card/50 rounded border border-border p-1">
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] font-medium text-muted-foreground">ATR (14)</span>
        <span className="text-[10px] font-mono text-cyan-400">{current?.value.toFixed(1) || '0.0'} pips</span>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

interface VolumePanelProps {
  data: VolumeData[];
}

export function VolumePanel({ data }: VolumePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#8b97a8',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#131b2b' },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: { visible: false },
      height: 60,
      handleScale: false,
      handleScroll: false,
    });

    const series = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
    });

    chartRef.current = chart;

    if (data.length > 0) {
      series.setData(data.map(d => ({
        time: d.time as Time,
        value: d.value,
        color: d.color,
      })));
    }

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  const current = data[data.length - 1];
  const avgVolume = data.length > 0 ? data.reduce((sum, d) => sum + d.value, 0) / data.length : 0;
  const isHigh = current?.value > avgVolume * 1.5;

  return (
    <div className="bg-card/50 rounded border border-border p-1">
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] font-medium text-muted-foreground">Volume</span>
        <span className={cn(
          "text-[10px] font-mono",
          isHigh ? "text-amber-400" : "text-foreground"
        )}>
          {current?.value.toLocaleString() || '0'}
        </span>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
