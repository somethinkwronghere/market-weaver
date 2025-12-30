import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { CandlestickChart } from '@/components/CandlestickChart';
import { PlaybackControls } from '@/components/PlaybackControls';
import { TradingPanel } from '@/components/TradingPanel';
import { AccountPanel } from '@/components/AccountPanel';
import { CandleInfo } from '@/components/CandleInfo';
import { DrawingToolbar, DrawingTool } from '@/components/DrawingToolbar';
import { TimeframeSelector, Timeframe } from '@/components/TimeframeSelector';
import { useMarketData } from '@/hooks/useMarketData';
import { useTradingEngine } from '@/hooks/useTradingEngine';
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

  // Update price when candle changes
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
    toast.success('Çizim eklendi');
  }, []);

  const handleClearDrawings = useCallback(() => {
    setDrawings([]);
    toast.info('Tüm çizimler silindi');
  }, []);

  const handleOpenPosition = (type: 'long' | 'short', size: number, stopLoss?: number, takeProfit?: number) => {
    if (!currentCandle) return;
    
    const position = openPosition(type, size, currentCandle, stopLoss, takeProfit);
    toast.success(`Opened ${type.toUpperCase()} position`, {
      description: `${size} lot at ${currentCandle.close.toFixed(5)}${stopLoss ? ` • SL: ${stopLoss.toFixed(5)}` : ''}${takeProfit ? ` • TP: ${takeProfit.toFixed(5)}` : ''}`,
    });
  };

  const handleClosePosition = (positionId: string) => {
    if (!currentCandle) return;
    closePosition(positionId, currentCandle.close, currentCandle.time);
    toast.info('Position closed');
  };

  const handleCloseAll = () => {
    if (!currentCandle) return;
    closeAllPositions(currentCandle.close, currentCandle.time);
    toast.info('All positions closed');
  };

  const handleReset = () => {
    resetPlayback();
    resetAccount();
    setDrawings([]);
    toast.success('Simulation reset');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading synthetic market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 p-4 lg:p-6">
        <div className="max-w-[1800px] mx-auto space-y-4 lg:space-y-6">
          {/* Candle Info Bar */}
          <CandleInfo candle={currentCandle} />

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Chart Section - Takes 3 columns */}
            <div className="lg:col-span-3 space-y-4">
              {/* Chart Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-3">
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

              <div className="h-[400px] lg:h-[500px]">
                <CandlestickChart 
                  data={visibleCandles}
                  currentPrice={currentCandle?.close}
                  drawingTool={drawingTool}
                  drawings={drawings}
                  onAddDrawing={handleAddDrawing}
                  positions={tradingState.positions}
                />
              </div>
              
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

            {/* Right Sidebar - Trading Controls */}
            <div className="space-y-4">
              <TradingPanel
                currentCandle={currentCandle}
                positions={tradingState.positions}
                onOpenPosition={handleOpenPosition}
                onClosePosition={handleClosePosition}
                onCloseAll={handleCloseAll}
                balance={tradingState.balance}
              />
              
              <AccountPanel
                state={tradingState}
                onReset={handleReset}
              />
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center text-xs text-muted-foreground py-4">
            <p>Synthetic Market Data • Forward Test Universe</p>
            <p className="mt-1 opacity-70">
              Bu veriler gerçek piyasa verisinden üretilmiş sentetik senaryo verileridir. 
              Gerçek alım satım tavsiyesi içermez.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
