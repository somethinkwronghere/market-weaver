import { useEffect, useRef, useCallback, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, LineStyle, IPriceLine } from 'lightweight-charts';
import { OHLCData, Position } from '@/types/trading';
import { DrawingLine } from '@/types/drawing';
import { DrawingTool } from './DrawingToolbar';
import { BollingerData, EMAData, SMAData } from '@/hooks/useIndicators';
import { PositionPrimitive, PositionToolData } from './PositionPrimitive';

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
  onOpenPosition?: (type: 'long' | 'short', size: number, stopLoss?: number, takeProfit?: number, useOverlay?: boolean) => void;
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
  onOpenPosition,
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
  const positionPrimitivesRef = useRef<Map<string, PositionPrimitive>>(new Map());
  const [drawingStart, setDrawingStart] = useState<{ price: number; time: number } | null>(null);
  const [dragging, setDragging] = useState<{ positionId: string; type: 'sl' | 'tp'; startPrice: number } | null>(null);
  const [linePositions, setLinePositions] = useState<Map<string, { sl: number | null; tp: number | null }>>(new Map());
  const [draggedPrices, setDraggedPrices] = useState<Map<string, { sl?: number; tp?: number }>>(new Map());
  const [positionDrawings, setPositionDrawings] = useState<PositionToolData[]>([]);
  const [drawingDrag, setDrawingDrag] = useState<{ id: string; type: 'sl' | 'tp' | 'resize' | 'entry'; startPrice: number; startX: number; initialSnapshot?: PositionToolData } | null>(null);


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


  // Sync primitives with positionDrawings state AND active positions
  useEffect(() => {
    if (!seriesRef.current) return;

    // 1. Manage Drawing Primitives
    const currentDrawingIds = new Set(positionDrawings.map(d => d.id));

    // Remove detached primitives
    positionPrimitivesRef.current.forEach((primitive, id) => {
      // Only manage drawing primitives here
      if (id.startsWith('pos-') && !currentDrawingIds.has(id)) {
        try { seriesRef.current?.detachPrimitive(primitive); } catch (e) { }
        positionPrimitivesRef.current.delete(id);
      }
      // If any non-drawing primitive exists in this ref, remove it (cleanup old state)
      if (!id.startsWith('pos-')) {
        try { seriesRef.current?.detachPrimitive(primitive); } catch (e) { }
        positionPrimitivesRef.current.delete(id);
      }
    });

    // Render Drawings
    positionDrawings.forEach(drawing => {
      let primitive = positionPrimitivesRef.current.get(drawing.id);
      if (!primitive && seriesRef.current) {
        primitive = new PositionPrimitive();
        seriesRef.current.attachPrimitive(primitive);
        positionPrimitivesRef.current.set(drawing.id, primitive);
      }
      primitive?.setData(drawing);
    });

  }, [positionDrawings]);

  // Render Real Positions as Standard PriceLines
  // Render Real Positions (Hybrid: PriceLines or Overlay)
  useEffect(() => {
    if (!seriesRef.current) return;

    // 1. Clean up ALL PriceLines first
    positionPriceLinesRef.current.forEach(lines => {
      if (lines.entry) seriesRef.current?.removePriceLine(lines.entry);
      if (lines.sl) seriesRef.current?.removePriceLine(lines.sl);
      if (lines.tp) seriesRef.current?.removePriceLine(lines.tp);
    });
    positionPriceLinesRef.current.clear();

    const activePrimitiveIds = new Set<string>();

    positions.forEach(pos => {
      if (pos.useOverlay) {
        // Render as Overlay (Primitive)
        let primitive = positionPrimitivesRef.current.get(pos.id);
        if (!primitive && seriesRef.current) {
          primitive = new PositionPrimitive();
          seriesRef.current.attachPrimitive(primitive);
          positionPrimitivesRef.current.set(pos.id, primitive);
        }

        primitive?.setData({
          id: pos.id,
          type: pos.type,
          entryPrice: pos.entryPrice,
          stopLoss: pos.stopLoss,
          takeProfit: pos.takeProfit,
          size: pos.size,
          showRiskReward: true,
          startTime: pos.entryTime,
          candleCount: 50,
        });
        activePrimitiveIds.add(pos.id);

      } else {
        // Render as PriceLines
        const lines: { entry?: IPriceLine; sl?: IPriceLine; tp?: IPriceLine } = {};

        // Entry Line
        lines.entry = seriesRef.current?.createPriceLine({
          price: pos.entryPrice,
          color: pos.type === 'long' ? '#00c853' : '#ff5252',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `Entry ${pos.entryPrice.toFixed(5)}`,
        });

        // SL Line
        if (pos.stopLoss) {
          lines.sl = seriesRef.current?.createPriceLine({
            price: pos.stopLoss,
            color: '#ff5252',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `SL ${pos.stopLoss.toFixed(5)}`,
          });
        }

        // TP Line
        if (pos.takeProfit) {
          lines.tp = seriesRef.current?.createPriceLine({
            price: pos.takeProfit,
            color: '#00c853',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `TP ${pos.takeProfit.toFixed(5)}`,
          });
        }

        positionPriceLinesRef.current.set(pos.id, lines);
      }
    });

    // Clean up detached primitives for real positions (those without useOverlay or closed)
    // IMPORTANT: Only clean up non-drawing primitives (IDs not starting with pos-)
    positionPrimitivesRef.current.forEach((prim, id) => {
      if (!id.startsWith('pos-') && !activePrimitiveIds.has(id)) {
        try { seriesRef.current?.detachPrimitive(prim); } catch (e) { }
        positionPrimitivesRef.current.delete(id);
      }
    });

  }, [positions]);


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
      } else if (drawingTool === 'long-position' || drawingTool === 'short-position') {
        const isLong = drawingTool === 'long-position';

        // Default SL/TP: 0.5% risk, 1% reward
        const riskPercent = 0.005;
        const dist = price * riskPercent;

        const stopLoss = isLong ? price - dist : price + dist;
        const takeProfit = isLong ? price + (dist * 2) : price - (dist * 2);

        // Open Real Position immediately with Overlay Visuals
        onOpenPosition?.(isLong ? 'long' : 'short', 0.1, stopLoss, takeProfit, true);
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
        } catch (e) { }
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
        } catch (e) { }
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
      } catch (e) { }
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


    // Note: Position primitives for the drawing tool are managed separately via click handlers
    // Trading positions (from TradingPanel) now just use the drag handles overlay

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

      // Auto-scroll only on initial load, not on every data update
      // User can manually scroll and it won't jump back
      if (chartRef.current) {
        const timeScale = chartRef.current.timeScale();
        const currentRange = timeScale.getVisibleLogicalRange();

        // Only auto-scroll if no range is set (initial load) or user is at the very end
        if (!currentRange) {
          timeScale.scrollToPosition(5, false);
        }
      }
    }
  }, [data]);

  // Unified Mouse Drag Handler for Trading Positions AND Position Drawings
  // Unified Mouse Drag Handler for Trading Positions AND Position Drawings
  const handleMouseDown = useCallback((e: React.MouseEvent, id: string, type: 'sl' | 'tp' | 'resize' | 'entry', startPrice: number) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if it's a position drawing
    if (id.startsWith('pos-')) {
      const drawing = positionDrawings.find(d => d.id === id);
      setDrawingDrag({
        id,
        type,
        startPrice,
        startX: e.clientX,
        initialSnapshot: drawing ? { ...drawing } : undefined
      });
    } else {
      // Legacy trading position drag
      setDragging({ positionId: id, type: type as 'sl' | 'tp', startPrice });
    }
  }, [positionDrawings]);

  // Global drag listener
  useEffect(() => {
    if ((!dragging && !drawingDrag) || !containerRef.current || !chartRef.current || !seriesRef.current) return;

    let currentPrice = dragging?.startPrice ?? drawingDrag?.startPrice ?? 0;

    // For resizing, we need to track mouse X movement
    const startX = drawingDrag?.startX ?? 0;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !chartRef.current || !seriesRef.current) return;

      try {
        const rect = containerRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const newPrice = seriesRef.current.coordinateToPrice(y);

        if (dragging) {
          if (newPrice !== null && newPrice !== undefined) {
            currentPrice = newPrice;

            const originalPos = positions.find(p => p.id === dragging.positionId);

            // Check if using overlay (Hybrid Mode)
            if (originalPos?.useOverlay) {
              // Overlay Drag Logic (Primitive)
              const primitive = positionPrimitivesRef.current.get(dragging.positionId);
              if (primitive) {
                const newData: PositionToolData = {
                  id: originalPos.id,
                  type: originalPos.type,
                  entryPrice: originalPos.entryPrice,
                  stopLoss: dragging.type === 'sl' ? newPrice : originalPos.stopLoss,
                  takeProfit: dragging.type === 'tp' ? newPrice : originalPos.takeProfit,
                  size: originalPos.size,
                  showRiskReward: true,
                  startTime: originalPos.entryTime,
                  candleCount: 50,
                };
                primitive.setData(newData);
              }
            } else {
              // Standard Drag Logic (PriceLine)
              const lines = positionPriceLinesRef.current.get(dragging.positionId);
              if (lines) {
                if (dragging.type === 'sl' && lines.sl) {
                  seriesRef.current.removePriceLine(lines.sl);
                  lines.sl = seriesRef.current.createPriceLine({
                    price: newPrice,
                    color: '#ff5252',
                    lineWidth: 1,
                    lineStyle: LineStyle.Dashed,
                    axisLabelVisible: true,
                    title: `SL ${newPrice.toFixed(5)}`,
                  });

                  const coord = seriesRef.current.priceToCoordinate(newPrice);
                  if (coord !== null) {
                    setLinePositions(prev => {
                      const next = new Map(prev);
                      const current = next.get(dragging.positionId) || { sl: null, tp: null };
                      next.set(dragging.positionId, { ...current, sl: coord });
                      return next;
                    });
                  }
                } else if (dragging.type === 'tp' && lines.tp) {
                  seriesRef.current.removePriceLine(lines.tp);
                  lines.tp = seriesRef.current.createPriceLine({
                    price: newPrice,
                    color: '#00c853',
                    lineWidth: 1,
                    lineStyle: LineStyle.Dashed,
                    axisLabelVisible: true,
                    title: `TP ${newPrice.toFixed(5)}`,
                  });

                  const coord = seriesRef.current.priceToCoordinate(newPrice);
                  if (coord !== null) {
                    setLinePositions(prev => {
                      const next = new Map(prev);
                      const current = next.get(dragging.positionId) || { sl: null, tp: null };
                      next.set(dragging.positionId, { ...current, tp: coord });
                      return next;
                    });
                  }
                }
                positionPriceLinesRef.current.set(dragging.positionId, lines);
              }
            }
          }

        } else if (drawingDrag && drawingDrag.initialSnapshot) {
          if (drawingDrag.type === 'resize') {
            // Horizontal drag for resizing duration
            const deltaPixels = e.clientX - startX;
            const sensitivity = 10;
            const deltaCandles = Math.round(deltaPixels / sensitivity);

            const newCount = Math.max(2, drawingDrag.initialSnapshot.candleCount + deltaCandles);

            setPositionDrawings(prev => prev.map(d => {
              if (d.id === drawingDrag.id) {
                return { ...d, candleCount: newCount };
              }
              return d;
            }));
          } else if (drawingDrag.type === 'entry' && newPrice !== null) {
            // Move entire position (Entry + SL + TP)
            const priceDelta = newPrice - drawingDrag.startPrice;

            setPositionDrawings(prev => prev.map(d => {
              if (d.id === drawingDrag.id) {
                const snap = drawingDrag.initialSnapshot!;
                return {
                  ...d,
                  entryPrice: snap.entryPrice + priceDelta,
                  stopLoss: snap.stopLoss ? snap.stopLoss + priceDelta : null,
                  takeProfit: snap.takeProfit ? snap.takeProfit + priceDelta : null,
                };
              }
              return d;
            }));
          } else {
            // Vertical drag for SL/TP
            if (newPrice !== null && newPrice !== undefined) {
              currentPrice = newPrice;
              setPositionDrawings(prev => prev.map(d => {
                if (d.id === drawingDrag.id) {
                  if (drawingDrag.type === 'sl') return { ...d, stopLoss: newPrice };
                  if (drawingDrag.type === 'tp') return { ...d, takeProfit: newPrice };
                }
                return d;
              }));
            }
          }
        }

      } catch (error) { console.error(error); }
    };

    const handleGlobalMouseUp = () => {
      if (dragging) {
        // Finalize trading position update
        if (dragging.type === 'sl') onUpdatePositionSl?.(dragging.positionId, currentPrice);
        if (dragging.type === 'tp') onUpdatePositionTp?.(dragging.positionId, currentPrice);
        setDragging(null);
      }
      if (drawingDrag) {
        setDrawingDrag(null);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragging, drawingDrag, onUpdatePositionSl, onUpdatePositionTp]);

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

      {/* Position Drawing Handles */}
      {positionDrawings.map(drawing => {
        if (!seriesRef.current || !chartRef.current) return null;

        const slY = drawing.stopLoss ? seriesRef.current.priceToCoordinate(drawing.stopLoss) : null;
        const tpY = drawing.takeProfit ? seriesRef.current.priceToCoordinate(drawing.takeProfit) : null;
        const entryY = seriesRef.current.priceToCoordinate(drawing.entryPrice);

        // Calculate X for resize handle (end of position)
        // We need the end time
        const candleInSeconds = 3600; // approximation if timeframe unknown
        const endTime = drawing.startTime + (drawing.candleCount * candleInSeconds);
        const endX = chartRef.current.timeScale().timeToCoordinate(endTime as Time);

        return (
          <div key={drawing.id}>
            {/* SL Handle */}
            {slY !== null && (
              <div
                className="absolute right-12 cursor-ns-resize z-20 select-none group"
                style={{ top: slY - 10 }}
                onMouseDown={(e) => handleMouseDown(e, drawing.id, 'sl', drawing.stopLoss!)}
              >
                <div className="bg-red-500/80 hover:bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm border border-red-400 backdrop-blur-sm transition-colors">
                  SL
                </div>
              </div>
            )}

            {/* TP Handle */}
            {tpY !== null && (
              <div
                className="absolute right-12 cursor-ns-resize z-20 select-none group"
                style={{ top: tpY - 10 }}
                onMouseDown={(e) => handleMouseDown(e, drawing.id, 'tp', drawing.takeProfit!)}
              >
                <div className="bg-green-500/80 hover:bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm border border-green-400 backdrop-blur-sm transition-colors">
                  TP
                </div>
              </div>
            )}

            {/* Entry Handle (Move Whole Position) */}
            {entryY !== null && (
              <div
                className="absolute right-12 cursor-move z-30 select-none group"
                style={{ top: entryY - 10 }}
                onMouseDown={(e) => handleMouseDown(e, drawing.id, 'entry', drawing.entryPrice)}
              >
                <div className="bg-blue-500/80 hover:bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm border border-blue-400 backdrop-blur-sm transition-colors">
                  Entry
                </div>
              </div>
            )}

            {/* Resize Handle (Right Edge) */}
            {endX !== null && entryY !== null && (
              <div
                className="absolute z-20 cursor-ew-resize group"
                style={{
                  left: endX - 4,
                  top: Math.min(entryY, slY ?? entryY, tpY ?? entryY),
                  height: Math.abs((Math.max(entryY, slY ?? entryY, tpY ?? entryY)) - (Math.min(entryY, slY ?? entryY, tpY ?? entryY))),
                  width: 10
                }}
                onMouseDown={(e) => handleMouseDown(e, drawing.id, 'resize', 0)}
              >
                <div className="w-1 h-full mx-auto bg-white/20 group-hover:bg-blue-400/50 transition-colors rounded-full" />
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
