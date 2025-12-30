import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { CandlestickChart } from '@/components/CandlestickChart';
import { PlaybackControls } from '@/components/PlaybackControls';
import { TradingPanel } from '@/components/TradingPanel';
import { AccountPanel } from '@/components/AccountPanel';
import { DrawingToolbar, DrawingTool } from '@/components/DrawingToolbar';
import { TimeframeSelector, Timeframe } from '@/components/TimeframeSelector';
import { RSIPanel, MACDPanel } from '@/components/IndicatorPanel';
import { useMarketData } from '@/hooks/useMarketData';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { useIndicators } from '@/hooks/useIndicators';
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
    play,
    pause,
    stepForward,
    stepBackward,
    reset: resetPlayback,
    jumpTo,
    setSpeed,
    setTimeframe: setMarketTimeframe,
  } = useMarketData();

  const {
    state: tradingState,
    updatePrice,
    openPosition,
    closePosition,
    closeAllPositions,
    resetAccount,
  } = useTradingEngine();

  const { rsi, macd, bollingerBands } = useIndicators(visibleCandles);

  useEffect(() => {
    if (currentCandle) {
      updatePrice(currentCandle.close, currentCandle.time);
    }
  }, [currentCandle, updatePrice]);

  const handleTimeframeChange = (tf: Timeframe) => {
    setTimeframe(tf);
    setMarketTimeframe(tf);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050810]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-muted-foreground">Loading synthetic market data...</p>
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
            <DrawingToolbar 
              activeTool={drawingTool}
              onToolChange={setDrawingTool}
              onClearDrawings={handleClearDrawings}
            />
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
              bollingerBands={bollingerBands}
            />
          </div>

          {/* Indicators */}
          <div className="h-[180px] bg-[#0a0e17] border-t border-[#1a2332] grid grid-cols-2 gap-2 p-2">
            <RSIPanel data={rsi} />
            <MACDPanel data={macd} />
          </div>

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
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
