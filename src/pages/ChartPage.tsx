import { useEffect, useState, useCallback } from 'react';
import { Loader2, Radio } from 'lucide-react';
import { Header } from '@/components/Header';
import { CandlestickChart } from '@/components/CandlestickChart';
import { PlaybackControls } from '@/components/PlaybackControls';
import { FloatingReplayController } from '@/components/FloatingReplayController';
import { TradingPanel } from '@/components/TradingPanel';
import { AccountPanel } from '@/components/AccountPanel';
import { DrawingToolbar, DrawingTool } from '@/components/DrawingToolbar';
import { TimeframeSelector, Timeframe } from '@/components/TimeframeSelector';
import { PairSelector, TradingPair } from '@/components/PairSelector';
import { RSIPanel, MACDPanel, StochasticPanel, ATRPanel, VolumePanel } from '@/components/IndicatorPanel';
import { ChartTypeSelector } from '@/components/ChartTypeSelector';
import { TradingViewChart } from '@/components/charts/TradingViewChart';
import { IndicatorLibrary } from '@/components/charts/IndicatorLibrary';
import { useMarketData } from '@/hooks/useMarketData';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { useIndicators } from '@/hooks/useIndicators';
import { useIndicatorsContext } from '@/contexts/IndicatorContext';
import { DrawingLine } from '@/types/drawing';
import { ChartType, IndicatorConfig } from '@/types/chart';
import { toast } from 'sonner';

const ChartPage = () => {
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('select');
  const [drawings, setDrawings] = useState<DrawingLine[]>([]);
  const [chartType, setChartType] = useState<ChartType>('lightweight');
  const [isChartInteractionLocked, setIsChartInteractionLocked] = useState(false);

  const {
    indicators,
    addIndicator,
    removeIndicator,
    toggleIndicator,
  } = useIndicatorsContext();

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

  const { rsi, macd, bollingerBands, stochastic, atr, volume, ema, sma } = useIndicators(visibleCandles);

  // Filter overlay indicators based on enabled state
  const enabledOverlayIndicators = indicators.filter(i => i.enabled && i.type === 'overlay');
  const overlayIndicatorNames = new Set(enabledOverlayIndicators.map(i => i.name.toLowerCase()));

  // Filter EMA/SMA data based on enabled indicators
  const enabledEmaData = ema.filter(d => {
    return overlayIndicatorNames.has('ema');
  });

  const enabledSmaData = sma.filter(d => {
    return overlayIndicatorNames.has('sma');
  });

  const enabledBollingerBands = overlayIndicatorNames.has('bollinger bands') || overlayIndicatorNames.has('bollinger') ? bollingerBands : [];

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

  const handleOpenPosition = (type: 'long' | 'short', size: number, stopLoss?: number, takeProfit?: number) => {
    if (!currentCandle) return;
    openPosition(type, size, currentCandle, stopLoss, takeProfit);
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

  const handleAddIndicator = (config: IndicatorConfig) => {
    addIndicator(config);
    toast.success(`${config.name} added to chart`);
  };

  const handleUpdatePositionSl = useCallback((positionId: string, newSl: number) => {
    updatePosition(positionId, { stopLoss: newSl });
    toast.info(`SL güncellendi: ${newSl.toFixed(5)}`);
  }, [updatePosition]);

  const handleUpdatePositionTp = useCallback((positionId: string, newTp: number) => {
    updatePosition(positionId, { takeProfit: newTp });
    toast.info(`TP güncellendi: ${newTp.toFixed(5)}`);
  }, [updatePosition]);

  if (isLoading && visibleCandles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-muted-foreground">Piyasa verisi yükleniyor...</p>
        </div>
      </div>
    );
  }

  const renderChart = () => {
    switch (chartType) {
      case 'tradingview':
        return <TradingViewChart data={visibleCandles} symbol={pair} />;
      case 'lightweight':
      default:
        return (
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
            onUpdatePositionSl={handleUpdatePositionSl}
            onUpdatePositionTp={handleUpdatePositionTp}
            pair={pair}
          />
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
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
              <ChartTypeSelector currentType={chartType} onChange={setChartType} />
              <IndicatorLibrary
                onAddIndicator={handleAddIndicator}
                onRemoveIndicator={removeIndicator}
                onToggleIndicator={toggleIndicator}
                activeIndicators={indicators}
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
            <div
              className="w-full h-full"
              style={{
                pointerEvents: isChartInteractionLocked ? 'none' : 'auto'
              }}
            >
              {renderChart()}
            </div>

            {/* Floating Replay Controller */}
            <FloatingReplayController
              isPlaying={isPlaying}
              speed={speed}
              progress={progress}
              currentIndex={currentIndex}
              totalCandles={totalCandles}
              onPlay={play}
              onPause={pause}
              onStepForward={stepForward}
              onStepBackward={stepBackward}
              onSeek={jumpTo}
              onChartInteractionLock={setIsChartInteractionLocked}
            />
          </div>

          {/* Indicators - Dynamic panels based on enabled indicators (only show for lightweight charts) */}
          {chartType === 'lightweight' && (
            <div className="bg-[#0a0e17] border-t border-[#1a2332]">
              {indicators.filter(i => i.enabled && i.type === 'separate').length === 0 ? (
                <div className="h-[60px] flex items-center justify-center text-muted-foreground text-sm">
                  No indicators enabled. Click "Indicators" to add some.
                </div>
              ) : (
                <div
                  className="grid gap-1 p-1"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(indicators.filter(i => i.enabled && i.type === 'separate').length, 5)}, 1fr)`,
                    height: indicators.filter(i => i.enabled && i.type === 'separate').length > 0 ? '160px' : 'auto',
                  }}
                >
                  {indicators
                    .filter(i => i.enabled && i.type === 'separate')
                    .map((indicator) => {
                      const name = indicator.name.toLowerCase();
                      if (name === 'rsi') return <RSIPanel key={indicator.id} data={rsi} />;
                      if (name === 'macd') return <MACDPanel key={indicator.id} data={macd} />;
                      if (name === 'stochastic') return <StochasticPanel key={indicator.id} data={stochastic} />;
                      if (name === 'atr') return <ATRPanel key={indicator.id} data={atr} />;
                      if (name === 'volume') return <VolumePanel key={indicator.id} data={volume} />;
                      return null;
                    })}
                </div>
              )}
            </div>
          )}

          {/* Playback Controls */}
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
              onClosePosition={handleClosePosition}
              onCloseAll={handleCloseAll}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartPage;
