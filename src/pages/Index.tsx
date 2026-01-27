import { useEffect, useState, useCallback, useMemo } from 'react';
import { Loader2, Radio } from 'lucide-react';
import { Header } from '@/components/Header';
import { CandlestickChart } from '@/components/CandlestickChart';
import { PlaybackControls } from '@/components/PlaybackControls';
import { TradingPanel } from '@/components/TradingPanel';
import { AccountPanel } from '@/components/AccountPanel';
import { DrawingToolbar, DrawingTool } from '@/components/DrawingToolbar';
import { TimeframeSelector, Timeframe } from '@/components/TimeframeSelector';
import { PairSelector, TradingPair } from '@/components/PairSelector';
import { RSIPanel, MACDPanel, StochasticPanel, ATRPanel, VolumePanel } from '@/components/IndicatorPanel';
import { useMarketData } from '@/hooks/useMarketData';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { useIndicators } from '@/hooks/useIndicators';
import { useIndicatorsContext } from '@/contexts/IndicatorContext';
import { DrawingLine } from '@/types/drawing';
import { toast } from 'sonner';

const Index = () => {
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('select');
  const [drawings, setDrawings] = useState<DrawingLine[]>([]);

  const {
    visibleCandles,
    currentCandle,
    currentIndex,
    totalCandles,
    progress,
    isPlaying,
    speed,
    isLoading,
    isLive,
    isInPlaybackMode,
    pair,
    dataSource,
    dataUpdatedAt,
    liveIsStale,
    liveLastCandleTime,
    play,
    pause,
    stepForward,
    stepBackward,
    reset: resetPlayback,
    jumpTo,
    setSpeed,
    setTimeframe: setMarketTimeframe,
    setPair,
  } = useMarketData();

  const {
    state: tradingState,
    updatePrice,
    openPosition,
    closePosition,
    closeAllPositions,
    resetAccount,
    updatePosition,
  } = useTradingEngine();

  const { indicators } = useIndicatorsContext();
  const { rsi, macd, bollingerBands, stochastic, atr, volume, emaData, smaData } = useIndicators(visibleCandles);

  // Filter indicators based on enabled state
  const enabledIndicators = useMemo(() => {
    return indicators.filter(i => i.enabled);
  }, [indicators]);

  const enabledSeparateIndicators = useMemo(() => {
    return enabledIndicators.filter(i => i.type === 'separate');
  }, [enabledIndicators]);

  const enabledOverlayIndicators = useMemo(() => {
    return enabledIndicators.filter(i => i.type === 'overlay');
  }, [enabledIndicators]);

  // Filter overlay indicators
  const enabledEmaData = useMemo(() => {
    const hasEma = enabledOverlayIndicators.some(i => i.name === 'EMA');
    return hasEma ? emaData : [];
  }, [emaData, enabledOverlayIndicators]);

  const enabledSmaData = useMemo(() => {
    const hasSma = enabledOverlayIndicators.some(i => i.name === 'SMA');
    return hasSma ? smaData : [];
  }, [smaData, enabledOverlayIndicators]);

  const hasBollingerEnabled = enabledOverlayIndicators.some(
    i => i.name.toLowerCase().includes('bollinger')
  );
  const enabledBollingerBands = hasBollingerEnabled ? bollingerBands : [];

  useEffect(() => {
    if (currentCandle) {
      updatePrice(currentCandle.close, currentCandle.time);
    }
  }, [currentCandle, updatePrice]);

  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
    setMarketTimeframe(tf);
  };

  const handlePairChange = (newPair: TradingPair) => {
    setPair(newPair);
    toast.info(`${newPair} seçildi`);
  };

  const handleAddDrawing = useCallback((drawing: DrawingLine) => {
    setDrawings(prev => [...prev, drawing]);
    setDrawingTool('select');
  }, []);

  const handleClearDrawings = useCallback(() => {
    setDrawings([]);
  }, []);

  const handleOpenPosition = (type: 'long' | 'short', size: number, stopLoss?: number, takeProfit?: number, useOverlay?: boolean) => {
    if (!currentCandle) return;
    openPosition(type, size, currentCandle, stopLoss, takeProfit, useOverlay);
    toast.success(`${type.toUpperCase()} @ ${currentCandle.close.toFixed(5)}`);
  };

  const handleClosePosition = (positionId: string) => {
    if (!currentCandle) return;
    closePosition(positionId, currentCandle.close, currentCandle.time);
  };

  const handleCloseAll = () => {
    if (!currentCandle) return;
    closeAllPositions(currentCandle.close, currentCandle.time);
  };

  const handleReset = () => {
    resetPlayback();
    resetAccount();
    setDrawings([]);
  };

  const handleUpdatePositionSl = (positionId: string, newSl: number) => {
    updatePosition(positionId, { stopLoss: newSl });
  };

  const handleUpdatePositionTp = (positionId: string, newTp: number) => {
    updatePosition(positionId, { takeProfit: newTp });
  };

  if (isLoading && visibleCandles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050810]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-muted-foreground">Piyasa verisi yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#050810] overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Main Chart Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="h-10 bg-[#0a0e17] border-b border-[#1a2332] flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <PairSelector
                activePair={pair}
                onPairChange={handlePairChange}
              />
              <DrawingToolbar
                activeTool={drawingTool}
                onToolChange={setDrawingTool}
                onClearDrawings={handleClearDrawings}
              />
              {!isInPlaybackMode && (
                <div
                  className={
                    dataSource === 'polygon'
                      ? 'flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 rounded text-emerald-400 text-xs font-medium'
                      : 'flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 rounded text-amber-400 text-xs font-medium'
                  }
                >
                  <Radio className="w-3 h-3" />
                  <span>
                    {dataSource === 'polygon' ? 'CANLI • Polygon' : 'CSV • Yedek'}
                    {liveLastCandleTime
                      ? ` • son mum: ${new Date(liveLastCandleTime * 1000).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                      : ''}
                  </span>
                </div>
              )}
            </div>
            <TimeframeSelector
              activeTimeframe={timeframe}
              onTimeframeChange={handleTimeframeChange}
            />
          </div>

          {/* Chart */}
          <div className="flex-1 relative">
            <CandlestickChart
              data={visibleCandles}
              currentPrice={currentCandle?.close}
              drawingTool={drawingTool}
              drawings={drawings}
              onAddDrawing={handleAddDrawing}
              positions={tradingState.positions}
              bollingerBands={enabledBollingerBands}
              emaData={enabledEmaData}
              smaData={enabledSmaData}
              pair={pair}
              onUpdatePositionSl={handleUpdatePositionSl}
              onUpdatePositionTp={handleUpdatePositionTp}
              onOpenPosition={handleOpenPosition}
            />
          </div>

          {/* Indicators - dynamic grid based on enabled indicators */}
          {enabledSeparateIndicators.length > 0 && (
            <div className="h-[160px] bg-[#0a0e17] border-t border-[#1a2332] grid gap-1 p-1" style={{
              gridTemplateColumns: `repeat(${Math.min(enabledSeparateIndicators.length, 5)}, 1fr)`
            }}>
              {enabledSeparateIndicators.map((indicator) => {
                if (indicator.name === 'RSI') {
                  return <RSIPanel key={indicator.id} data={rsi} />;
                }
                if (indicator.name === 'MACD') {
                  return <MACDPanel key={indicator.id} data={macd} />;
                }
                if (indicator.name === 'Stochastic') {
                  return <StochasticPanel key={indicator.id} data={stochastic} />;
                }
                if (indicator.name === 'ATR') {
                  return <ATRPanel key={indicator.id} data={atr} />;
                }
                if (indicator.name === 'Volume') {
                  return <VolumePanel key={indicator.id} data={volume} />;
                }
                return null;
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-80 border-l border-[#1a2332] flex flex-col">
          <div className="flex-1 overflow-hidden">
            <TradingPanel
              currentCandle={currentCandle}
              positions={tradingState.positions}
              onOpenPosition={handleOpenPosition}
              onClosePosition={handleClosePosition}
              onCloseAll={handleCloseAll}
              balance={tradingState.balance}
            />
          </div>
          <div className="h-[45%] border-t border-[#1a2332] overflow-hidden">
            <AccountPanel
              state={tradingState}
              onReset={handleReset}
            />
          </div>
        </div>
      </div>

      {/* Floating Playback Controls */}
      <PlaybackControls
        isPlaying={isPlaying}
        speed={speed}
        progress={progress}
        currentIndex={currentIndex}
        totalCandles={totalCandles}
        onPlay={play}
        onPause={pause}
        onStepForward={stepForward}
        onStepBackward={stepBackward}
        onReset={handleReset}
        onSpeedChange={setSpeed}
        onSeek={jumpTo}
        isLive={isLive}
      />
    </div>
  );
};

export default Index;
