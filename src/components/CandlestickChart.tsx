import { useEffect, useRef, useCallback, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, LineStyle, IPriceLine } from 'lightweight-charts';
import { OHLCData, Position } from '@/types/trading';
import { DrawingLine } from '@/types/drawing';
import { DrawingTool } from './DrawingToolbar';

interface CandlestickChartProps {
  data: OHLCData[];
  currentPrice?: number;
  drawingTool?: DrawingTool;
  drawings?: DrawingLine[];
  onAddDrawing?: (drawing: DrawingLine) => void;
  positions?: Position[];
}

export function CandlestickChart({ 
  data, 
  drawingTool = 'select',
  drawings = [],
  onAddDrawing,
  positions = []
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const [drawingStart, setDrawingStart] = useState<{ price: number; time: number } | null>(null);

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
      localization: {
        priceFormatter: (price: number) => price.toFixed(5),
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
      priceFormat: {
        type: 'price',
        precision: 5,
        minMove: 0.00001,
      },
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

  // Handle drawing tool clicks
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || drawingTool === 'select') return;

    const handleClick = (param: any) => {
      if (!param.point || !param.time) return;
      
      const price = seriesRef.current?.coordinateToPrice(param.point.y);
      if (price === null || price === undefined) return;

      if (drawingTool === 'horizontal') {
        const drawing: DrawingLine = {
          id: crypto.randomUUID(),
          type: 'horizontal',
          price1: price,
          time1: param.time as number,
          color: '#f59e0b',
        };
        onAddDrawing?.(drawing);
      } else if (drawingTool === 'support-resistance') {
        const drawing: DrawingLine = {
          id: crypto.randomUUID(),
          type: data.length > 0 && price < data[data.length - 1].close ? 'support' : 'resistance',
          price1: price,
          time1: param.time as number,
          color: price < data[data.length - 1]?.close ? '#22c55e' : '#ef4444',
        };
        onAddDrawing?.(drawing);
      } else if (drawingTool === 'trendline' || drawingTool === 'fibonacci') {
        if (!drawingStart) {
          setDrawingStart({ price, time: param.time as number });
        } else {
          const drawing: DrawingLine = {
            id: crypto.randomUUID(),
            type: drawingTool === 'fibonacci' ? 'fibonacci' : 'trendline',
            price1: drawingStart.price,
            time1: drawingStart.time,
            price2: price,
            time2: param.time as number,
            color: drawingTool === 'fibonacci' ? '#8b5cf6' : '#3b82f6',
            fibLevels: drawingTool === 'fibonacci' ? [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] : undefined,
          };
          onAddDrawing?.(drawing);
          setDrawingStart(null);
        }
      }
    };

    chartRef.current.subscribeClick(handleClick);

    return () => {
      chartRef.current?.unsubscribeClick(handleClick);
    };
  }, [drawingTool, drawingStart, onAddDrawing, data]);

  // Update price lines for drawings
  useEffect(() => {
    if (!seriesRef.current) return;

    // Remove old price lines
    priceLinesRef.current.forEach(line => {
      try {
        seriesRef.current?.removePriceLine(line);
      } catch (e) {}
    });
    priceLinesRef.current = [];

    // Add new price lines for horizontal/support/resistance drawings
    drawings.forEach(drawing => {
      if (drawing.type === 'horizontal' || drawing.type === 'support' || drawing.type === 'resistance') {
        const priceLine = seriesRef.current?.createPriceLine({
          price: drawing.price1,
          color: drawing.color,
          lineWidth: 2,
          lineStyle: drawing.type === 'horizontal' ? LineStyle.Solid : LineStyle.Dashed,
          axisLabelVisible: true,
          title: drawing.type === 'support' ? 'S' : drawing.type === 'resistance' ? 'R' : '',
        });
        if (priceLine) priceLinesRef.current.push(priceLine);
      } else if (drawing.type === 'fibonacci' && drawing.price2 !== undefined) {
        const high = Math.max(drawing.price1, drawing.price2);
        const low = Math.min(drawing.price1, drawing.price2);
        const diff = high - low;
        
        drawing.fibLevels?.forEach(level => {
          const price = high - (diff * level);
          const priceLine = seriesRef.current?.createPriceLine({
            price,
            color: '#8b5cf6',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: `${(level * 100).toFixed(1)}%`,
          });
          if (priceLine) priceLinesRef.current.push(priceLine);
        });
      }
    });

    // Add position lines (SL/TP)
    positions.forEach(pos => {
      // Entry price
      const entryLine = seriesRef.current?.createPriceLine({
        price: pos.entryPrice,
        color: pos.type === 'long' ? '#22c55e' : '#ef4444',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: pos.type === 'long' ? 'L' : 'S',
      });
      if (entryLine) priceLinesRef.current.push(entryLine);

      // Stop Loss
      if (pos.stopLoss) {
        const slLine = seriesRef.current?.createPriceLine({
          price: pos.stopLoss,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'SL',
        });
        if (slLine) priceLinesRef.current.push(slLine);
      }

      // Take Profit
      if (pos.takeProfit) {
        const tpLine = seriesRef.current?.createPriceLine({
          price: pos.takeProfit,
          color: '#22c55e',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'TP',
        });
        if (tpLine) priceLinesRef.current.push(tpLine);
      }
    });
  }, [drawings, positions]);

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
    <div className="chart-container w-full h-full relative">
      <div ref={containerRef} className="w-full h-full min-h-[400px]" />
      {drawingStart && (
        <div className="absolute top-2 left-2 bg-card px-2 py-1 rounded text-xs text-muted-foreground">
          İkinci noktayı seçin...
        </div>
      )}
    </div>
  );
}
