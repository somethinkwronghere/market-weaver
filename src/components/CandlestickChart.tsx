import { useEffect, useRef, useCallback, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, LineStyle, IPriceLine } from 'lightweight-charts';
import { OHLCData, Position } from '@/types/trading';
import { DrawingLine } from '@/types/drawing';
import { DrawingTool } from './DrawingToolbar';
import { BollingerData } from '@/hooks/useIndicators';
import { GripHorizontal } from 'lucide-react';

interface CandlestickChartProps {
  data: OHLCData[];
  currentPrice?: number;
  drawingTool?: DrawingTool;
  drawings?: DrawingLine[];
  onAddDrawing?: (drawing: DrawingLine) => void;
  positions?: Position[];
  bollingerBands?: BollingerData[];
  onUpdatePositionSl?: (positionId: string, newSl: number) => void;
  onUpdatePositionTp?: (positionId: string, newTp: number) => void;
}

export function CandlestickChart({ 
  data, 
  drawingTool = 'select',
  drawings = [],
  onAddDrawing,
  positions = [],
  bollingerBands = [],
  onUpdatePositionSl,
  onUpdatePositionTp,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [drawingStart, setDrawingStart] = useState<{ price: number; time: number } | null>(null);
  const [draggingLine, setDraggingLine] = useState<{ positionId: string; type: 'sl' | 'tp'; startY: number; startPrice: number } | null>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });

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
        priceFormatter: (price: number) => price.toFixed(5),
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
        precision: 5,
        minMove: 0.00001,
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
        setChartDimensions({ width, height });
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

  // Update Bollinger Bands
  useEffect(() => {
    if (bollingerBands.length > 0) {
      bbUpperRef.current?.setData(bollingerBands.map(d => ({ time: d.time as Time, value: d.upper })));
      bbMiddleRef.current?.setData(bollingerBands.map(d => ({ time: d.time as Time, value: d.middle })));
      bbLowerRef.current?.setData(bollingerBands.map(d => ({ time: d.time as Time, value: d.lower })));
    }
  }, [bollingerBands]);

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

    // Add position lines (Entry, SL, TP) - now draggable
    positions.forEach(pos => {
      // Entry price
      const entryLine = seriesRef.current?.createPriceLine({
        price: pos.entryPrice,
        color: pos.type === 'long' ? '#00c853' : '#ff5252',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `${pos.type === 'long' ? 'BUY' : 'SELL'} ${pos.size}`,
      });
      if (entryLine) priceLinesRef.current.push(entryLine);

      // Stop Loss - with drag label
      if (pos.stopLoss) {
        const slLine = seriesRef.current?.createPriceLine({
          price: pos.stopLoss,
          color: '#ff5252',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: '◀ SL',
        });
        if (slLine) priceLinesRef.current.push(slLine);
      }

      // Take Profit - with drag label
      if (pos.takeProfit) {
        const tpLine = seriesRef.current?.createPriceLine({
          price: pos.takeProfit,
          color: '#00c853',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: '◀ TP',
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

      // Keep latest candles visible (works for both live and historical playback)
      if (chartRef.current) {
        chartRef.current.timeScale().setVisibleLogicalRange({
          from: Math.max(0, chartData.length - 120),
          to: chartData.length + 5,
        });
      }
    }
  }, [data]);

  // Handle SL/TP dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingLine || !seriesRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const newPrice = seriesRef.current.coordinateToPrice(y);
    
    if (newPrice === null) return;

    const position = positions.find(p => p.id === draggingLine.positionId);
    if (!position) return;

    // Validate based on position type
    if (draggingLine.type === 'sl') {
      if (position.type === 'long' && newPrice < position.entryPrice) {
        onUpdatePositionSl?.(draggingLine.positionId, newPrice);
      } else if (position.type === 'short' && newPrice > position.entryPrice) {
        onUpdatePositionSl?.(draggingLine.positionId, newPrice);
      }
    } else if (draggingLine.type === 'tp') {
      if (position.type === 'long' && newPrice > position.entryPrice) {
        onUpdatePositionTp?.(draggingLine.positionId, newPrice);
      } else if (position.type === 'short' && newPrice < position.entryPrice) {
        onUpdatePositionTp?.(draggingLine.positionId, newPrice);
      }
    }
  }, [draggingLine, positions, onUpdatePositionSl, onUpdatePositionTp]);

  const handleMouseUp = useCallback(() => {
    setDraggingLine(null);
  }, []);

  useEffect(() => {
    if (draggingLine) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [draggingLine, handleMouseUp]);

  return (
    <div 
      className="chart-container w-full h-full relative bg-[#050810]"
      onMouseMove={handleMouseMove}
    >
      <div ref={containerRef} className="w-full h-full min-h-[400px]" />
      
      {/* Draggable SL/TP overlays */}
      {positions.map(pos => {
        if (!seriesRef.current || !containerRef.current) return null;
        
        return (
          <div key={pos.id}>
            {pos.stopLoss && (
              <div
                className="absolute right-20 cursor-ns-resize group"
                style={{
                  top: seriesRef.current.priceToCoordinate(pos.stopLoss) ?? 0,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDraggingLine({
                    positionId: pos.id,
                    type: 'sl',
                    startY: e.clientY,
                    startPrice: pos.stopLoss!,
                  });
                }}
              >
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-destructive/30 border border-destructive/60 text-destructive text-xs font-mono opacity-80 hover:opacity-100 transition-opacity">
                  <GripHorizontal className="w-3 h-3" />
                  <span>Drag SL</span>
                </div>
              </div>
            )}
            {pos.takeProfit && (
              <div
                className="absolute right-20 cursor-ns-resize group"
                style={{
                  top: seriesRef.current.priceToCoordinate(pos.takeProfit) ?? 0,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDraggingLine({
                    positionId: pos.id,
                    type: 'tp',
                    startY: e.clientY,
                    startPrice: pos.takeProfit!,
                  });
                }}
              >
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/30 border border-primary/60 text-primary text-xs font-mono opacity-80 hover:opacity-100 transition-opacity">
                  <GripHorizontal className="w-3 h-3" />
                  <span>Drag TP</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {drawingStart && (
        <div className="absolute top-2 left-2 bg-card/90 px-3 py-1.5 rounded text-xs text-muted-foreground border border-border">
          İkinci noktayı seçin...
        </div>
      )}
    </div>
  );
}
