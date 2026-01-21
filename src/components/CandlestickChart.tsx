import { useEffect, useRef, useCallback, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, LineStyle, IPriceLine } from 'lightweight-charts';
import { OHLCData, Position } from '@/types/trading';
import { DrawingLine } from '@/types/drawing';
import { DrawingTool } from './DrawingToolbar';
import { BollingerData, EMAData, SMAData } from '@/hooks/useIndicators';

interface CandlestickChartProps {
  data: OHLCData[];
  currentPrice?: number;
  drawingTool?: DrawingTool;
  drawings?: DrawingLine[];
  onAddDrawing?: (drawing: DrawingLine) => void;
  positions?: Position[];
  bollingerBands?: BollingerData[];
  emaData?: EMAData[];
  smaData?: SMAData[];
  onUpdatePositionSl?: (positionId: string, newSl: number) => void;
  onUpdatePositionTp?: (positionId: string, newTp: number) => void;
  pair?: string;
}

// Get price format based on asset type
function getPriceFormat(pair?: string) {
  const isCrypto = pair?.startsWith('BTC') || pair?.startsWith('ETH');
  if (isCrypto) {
    return { precision: 2, minMove: 0.01 };
  }
  // Forex pairs (EUR/USD, GBP/USD, etc.)
  return { precision: 5, minMove: 0.00001 };
}

export function CandlestickChart({
  data,
  drawingTool = 'select',
  drawings = [],
  onAddDrawing,
  positions = [],
  bollingerBands = [],
  emaData = [],
  smaData = [],
  onUpdatePositionSl,
  onUpdatePositionTp,
  pair,
}: CandlestickChartProps) {
  const priceFormat = getPriceFormat(pair);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const positionPriceLinesRef = useRef<Map<string, { entry?: IPriceLine; sl?: IPriceLine; tp?: IPriceLine }>>(new Map());
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSeriesRef = useRef<Map<number, ISeriesApi<'Line'>>>(new Map());
  const smaSeriesRef = useRef<Map<number, ISeriesApi<'Line'>>>(new Map());
  const [drawingStart, setDrawingStart] = useState<{ price: number; time: number } | null>(null);
  const [dragging, setDragging] = useState<{ positionId: string; type: 'sl' | 'tp'; startPrice: number } | null>(null);
  const [linePositions, setLinePositions] = useState<Map<string, { sl: number | null; tp: number | null }>>(new Map());
  const [draggedPrices, setDraggedPrices] = useState<Map<string, { sl?: number; tp?: number }>>(new Map());


  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#050810' },
        textColor: '#6b7a8f',
      },
      grid: {
        vertLines: { color: '#0d1320', style: LineStyle.Solid },
        horzLines: { color: '#0d1320', style: LineStyle.Solid },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#3b82f680',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#3b82f6',
        },
        horzLine: {
          color: '#3b82f680',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#3b82f6',
        },
      },
      rightPriceScale: {
        borderColor: '#1a2332',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
        textColor: '#6b7a8f',
      },
      localization: {
        priceFormatter: (price: number) => price.toFixed(priceFormat.precision),
      },
      timeScale: {
        borderColor: '#1a2332',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' ' + 
                 date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        },
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
      upColor: '#00c853',
      downColor: '#ff5252',
      borderUpColor: '#00c853',
      borderDownColor: '#ff5252',
      wickUpColor: '#00c853',
      wickDownColor: '#ff5252',
      priceFormat: {
        type: 'price',
        precision: priceFormat.precision,
        minMove: priceFormat.minMove,
      },
    });

    // Add Bollinger Bands series
    const bbUpper = chart.addLineSeries({
      color: '#3b82f640',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    
    const bbMiddle = chart.addLineSeries({
      color: '#3b82f680',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    
    const bbLower = chart.addLineSeries({
      color: '#3b82f640',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;
    bbUpperRef.current = bbUpper;
    bbMiddleRef.current = bbMiddle;
    bbLowerRef.current = bbLower;

    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        chart.applyOptions({ width, height });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [pair, priceFormat.precision, priceFormat.minMove]);

  // Handle drawing tool clicks
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || drawingTool === 'select') return;

    const handleClick = (param: any) => {
      if (!param.point || !param.time) return;
      
      const price = seriesRef.current?.coordinateToPrice(param.point.y);
      if (price === null || price === undefined) return;

      if (drawingTool === 'horizontal') {
        const drawing: DrawingLine = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: 'horizontal',
          price1: price,
          time1: param.time as number,
          color: '#f59e0b',
        };
        onAddDrawing?.(drawing);
      } else if (drawingTool === 'support-resistance') {
        const drawing: DrawingLine = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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

  // Update Bollinger Bands
  useEffect(() => {
    if (bollingerBands.length > 0) {
      bbUpperRef.current?.setData(bollingerBands.map(d => ({ time: d.time as Time, value: d.upper })));
      bbMiddleRef.current?.setData(bollingerBands.map(d => ({ time: d.time as Time, value: d.middle })));
      bbLowerRef.current?.setData(bollingerBands.map(d => ({ time: d.time as Time, value: d.lower })));
    }
  }, [bollingerBands]);

  // Handle EMA overlays
  useEffect(() => {
    if (!chartRef.current) return;

    // Group EMA data by period
    const emaByPeriod = new Map<number, EMAData[]>();
    emaData.forEach(d => {
      if (!emaByPeriod.has(d.period)) {
        emaByPeriod.set(d.period, []);
      }
      emaByPeriod.get(d.period)!.push(d);
    });

    // Remove old EMA series that are no longer needed
    const currentPeriods = new Set(emaByPeriod.keys());
    emaSeriesRef.current.forEach((series, period) => {
      if (!currentPeriods.has(period)) {
        try {
          chartRef.current?.removeSeries(series);
        } catch (e) {}
        emaSeriesRef.current.delete(period);
      }
    });

    // Create or update EMA series
    emaByPeriod.forEach((data, period) => {
      let series = emaSeriesRef.current.get(period);

      if (!series && chartRef.current) {
        // Create new series with unique color based on period
        const colors = ['#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
        const colorIndex = period % colors.length;
        series = chartRef.current.addLineSeries({
          color: colors[colorIndex],
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: `EMA(${period})`,
        });
        emaSeriesRef.current.set(period, series);
      }

      if (series) {
        series.setData(data.map(d => ({ time: d.time as Time, value: d.value })));
      }
    });
  }, [emaData]);

  // Handle SMA overlays
  useEffect(() => {
    if (!chartRef.current) return;

    // Group SMA data by period
    const smaByPeriod = new Map<number, SMAData[]>();
    smaData.forEach(d => {
      if (!smaByPeriod.has(d.period)) {
        smaByPeriod.set(d.period, []);
      }
      smaByPeriod.get(d.period)!.push(d);
    });

    // Remove old SMA series that are no longer needed
    const currentPeriods = new Set(smaByPeriod.keys());
    smaSeriesRef.current.forEach((series, period) => {
      if (!currentPeriods.has(period)) {
        try {
          chartRef.current?.removeSeries(series);
        } catch (e) {}
        smaSeriesRef.current.delete(period);
      }
    });

    // Create or update SMA series
    smaByPeriod.forEach((data, period) => {
      let series = smaSeriesRef.current.get(period);

      if (!series && chartRef.current) {
        // Create new series with unique color based on period
        const colors = ['#22c55e', '#eab308', '#a855f7', '#f472b6', '#22d3ee'];
        const colorIndex = period % colors.length;
        series = chartRef.current.addLineSeries({
          color: colors[colorIndex],
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: true,
          title: `SMA(${period})`,
        });
        smaSeriesRef.current.set(period, series);
      }

      if (series) {
        series.setData(data.map(d => ({ time: d.time as Time, value: d.value })));
      }
    });
  }, [smaData]);

  // Update line positions based on current prices
  const updateLinePositions = useCallback(() => {
    if (!chartRef.current || !seriesRef.current) return;

    const newPositions = new Map<string, { sl: number | null; tp: number | null }>();

    positions.forEach(pos => {
      const slCoord = pos.stopLoss
        ? seriesRef.current!.priceToCoordinate(pos.stopLoss)
        : null;
      const tpCoord = pos.takeProfit
        ? seriesRef.current!.priceToCoordinate(pos.takeProfit)
        : null;

      newPositions.set(pos.id, { sl: slCoord, tp: tpCoord });
    });

    setLinePositions(newPositions);
  }, [positions]);

  // Update price lines for drawings and positions
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

    // Clear old position price lines
    positionPriceLinesRef.current.forEach((lines) => {
      try {
        if (lines.entry) seriesRef.current?.removePriceLine(lines.entry);
        if (lines.sl) seriesRef.current?.removePriceLine(lines.sl);
        if (lines.tp) seriesRef.current?.removePriceLine(lines.tp);
      } catch (e) {}
    });
    positionPriceLinesRef.current.clear();

    // Add position lines (Entry, SL, TP) - stored in Map for dragging
    positions.forEach(pos => {
      const posLines: { entry?: IPriceLine; sl?: IPriceLine; tp?: IPriceLine } = {};

      // Entry price
      const entryLine = seriesRef.current?.createPriceLine({
        price: pos.entryPrice,
        color: pos.type === 'long' ? '#00c853' : '#ff5252',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `${pos.type === 'long' ? 'BUY' : 'SELL'} ${pos.size}`,
      });
      if (entryLine) {
        priceLinesRef.current.push(entryLine);
        posLines.entry = entryLine;
      }

      // Stop Loss - draggable
      if (pos.stopLoss) {
        const slLine = seriesRef.current?.createPriceLine({
          price: pos.stopLoss,
          color: '#ff5252',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `◀ SL ${pos.stopLoss.toFixed(5)}`,
        });
        if (slLine) {
          priceLinesRef.current.push(slLine);
          posLines.sl = slLine;
        }
      }

      // Take Profit - draggable
      if (pos.takeProfit) {
        const tpLine = seriesRef.current?.createPriceLine({
          price: pos.takeProfit,
          color: '#00c853',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `◀ TP ${pos.takeProfit.toFixed(5)}`,
        });
        if (tpLine) {
          priceLinesRef.current.push(tpLine);
          posLines.tp = tpLine;
        }
      }

      positionPriceLinesRef.current.set(pos.id, posLines);
    });

    // Update line positions for draggable handles
    updateLinePositions();
  }, [drawings, positions, updateLinePositions]);

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

      // Keep latest candles visible (works for both live and historical playback)
      if (chartRef.current) {
        const timeScale = chartRef.current.timeScale();
        const currentRange = timeScale.getVisibleLogicalRange();

        // Only auto-scroll if user is already viewing the end (last 30 candles)
        // This prevents viewport jumping when user is viewing historical data
        if (!currentRange || currentRange.to >= chartData.length - 30) {
          timeScale.scrollToPosition(5, false);
        }
      }
    }
  }, [data]);

  // Handle mouse down on drag handle
  const handleMouseDown = useCallback((e: React.MouseEvent, positionId: string, lineType: 'sl' | 'tp', startPrice: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging({ positionId, type: lineType, startPrice });
  }, []);

  // Global mouse event listeners for dragging
  useEffect(() => {
    if (!dragging || !containerRef.current || !chartRef.current || !seriesRef.current) return;

    let currentPrice = dragging.startPrice;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !chartRef.current || !seriesRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;

      try {
        // Convert pixel coordinate to price
        const newPrice = seriesRef.current.coordinateToPrice(y);
        if (newPrice === null || newPrice === undefined) return;

        currentPrice = newPrice;

        const lines = positionPriceLinesRef.current.get(dragging.positionId);
        if (!lines) return;

        // Update the price line
        if (dragging.type === 'sl' && lines.sl) {
          seriesRef.current.removePriceLine(lines.sl);
          const newSlLine = seriesRef.current.createPriceLine({
            price: newPrice,
            color: '#ff5252',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `◀ SL ${newPrice.toFixed(5)}`,
          });
          lines.sl = newSlLine;
          positionPriceLinesRef.current.set(dragging.positionId, lines);

          // Update line position for handle
          const slCoord = seriesRef.current.priceToCoordinate(newPrice);
          setLinePositions(prev => {
            const newMap = new Map(prev);
            const posLines = newMap.get(dragging.positionId) || { sl: null, tp: null };
            newMap.set(dragging.positionId, { ...posLines, sl: slCoord });
            return newMap;
          });

          // Store dragged price temporarily
          setDraggedPrices(prev => {
            const newMap = new Map(prev);
            const posData = newMap.get(dragging.positionId) || {};
            newMap.set(dragging.positionId, { ...posData, sl: newPrice });
            return newMap;
          });
        } else if (dragging.type === 'tp' && lines.tp) {
          seriesRef.current.removePriceLine(lines.tp);
          const newTpLine = seriesRef.current.createPriceLine({
            price: newPrice,
            color: '#00c853',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `◀ TP ${newPrice.toFixed(5)}`,
          });
          lines.tp = newTpLine;
          positionPriceLinesRef.current.set(dragging.positionId, lines);

          // Update line position for handle
          const tpCoord = seriesRef.current.priceToCoordinate(newPrice);
          setLinePositions(prev => {
            const newMap = new Map(prev);
            const posLines = newMap.get(dragging.positionId) || { sl: null, tp: null };
            newMap.set(dragging.positionId, { ...posLines, tp: tpCoord });
            return newMap;
          });

          // Store dragged price temporarily
          setDraggedPrices(prev => {
            const newMap = new Map(prev);
            const posData = newMap.get(dragging.positionId) || {};
            newMap.set(dragging.positionId, { ...posData, tp: newPrice });
            return newMap;
          });
        }
      } catch (error) {
        console.error('Error during drag:', error);
      }
    };

    const handleGlobalMouseUp = () => {
      // Save the final dragged price to position state
      if (dragging.type === 'sl') {
        onUpdatePositionSl?.(dragging.positionId, currentPrice);
      } else if (dragging.type === 'tp') {
        onUpdatePositionTp?.(dragging.positionId, currentPrice);
      }
      setDragging(null);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragging, onUpdatePositionSl, onUpdatePositionTp]);

  return (
    <div className="chart-container w-full h-full relative bg-[#050810]">
      {/* Lightweight Charts Container */}
      <div
        ref={containerRef}
        className="w-full h-full min-h-[400px]"
      />

      {/* Draggable SL/TP Handles */}
      {positions.map(pos => {
        const posLines = linePositions.get(pos.id);
        if (!posLines) return null;

        return (
          <div key={pos.id}>
            {/* Stop Loss Handle */}
            {pos.stopLoss && posLines.sl !== null && (
              <div
                className="absolute left-4 cursor-ns-resize z-10 select-none"
                style={{ top: posLines.sl - 14 }}
                onMouseDown={(e) => handleMouseDown(e, pos.id, 'sl', pos.stopLoss)}
              >
                <div className="px-2 py-1 rounded-md text-xs bg-red-500 text-white font-medium shadow-lg">
                  SL: {pos.stopLoss.toFixed(5)}
                </div>
              </div>
            )}

            {/* Take Profit Handle */}
            {pos.takeProfit && posLines.tp !== null && (
              <div
                className="absolute left-4 cursor-ns-resize z-10 select-none"
                style={{ top: posLines.tp - 14 }}
                onMouseDown={(e) => handleMouseDown(e, pos.id, 'tp', pos.takeProfit)}
              >
                <div className="px-2 py-1 rounded-md text-xs bg-green-500 text-white font-medium shadow-lg">
                  TP: {pos.takeProfit.toFixed(5)}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Info overlays */}
      {drawingStart && (
        <div className="absolute top-2 left-2 bg-card/90 px-3 py-1.5 rounded text-xs text-muted-foreground border border-border pointer-events-none z-[10000]">
          İkinci noktayı seçin...
        </div>
      )}
    </div>
  );
}
