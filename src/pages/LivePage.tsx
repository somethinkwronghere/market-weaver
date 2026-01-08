import { useEffect, useState, useCallback } from 'react';
import { Loader2, Radio } from 'lucide-react';
import { Header } from '@/components/Header';
import { CandlestickChart } from '@/components/CandlestickChart';
import { TradingPanel } from '@/components/TradingPanel';
import { AccountPanel } from '@/components/AccountPanel';
import { TimeframeSelector, Timeframe } from '@/components/TimeframeSelector';
import { PairSelector, TradingPair } from '@/components/PairSelector';
import { RSIPanel, MACDPanel, StochasticPanel, ATRPanel, VolumePanel } from '@/components/IndicatorPanel';
import { useMarketData } from '@/hooks/useMarketData';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { useIndicators } from '@/hooks/useIndicators';
import { toast } from 'sonner';

const LivePage = () => {
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');

  const {
    visibleCandles,
    currentCandle,
    isLoading,
    pair,
    dataSource,
    liveIsStale,
    liveLastCandleTime,
    setTimeframe: setMarketTimeframe,
    setPair,
  } = useMarketData();

  const {
    state: tradingState,
    updatePrice,
    openPosition,
    closePosition,
    closeAllPositions,
  } = useTradingEngine();

  const { rsi, macd, bollingerBands, stochastic, atr, volume } = useIndicators(visibleCandles);

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

  if (isLoading && visibleCandles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-muted-foreground">Canlı piyasa verisi yükleniyor...</p>
        </div>
      </div>
    );
  }

  const isLive = dataSource === 'polygon';

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
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                  isLive && !liveIsStale
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : liveIsStale
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  <Radio className="w-3 h-3" />
                  <span>
                    {isLive && !liveIsStale ? 'CANLI' : liveIsStale ? 'GECİKME' : 'CSV • YEDK'}
                    {liveLastCandleTime && ` • ${new Date(liveLastCandleTime * 1000).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Gerçek zamanlı alım satım</span>
              </div>
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
              drawingTool="select"
              drawings={[]}
              onAddDrawing={() => {}}
              positions={tradingState.positions}
              bollingerBands={bollingerBands}
              pair={pair}
            />
          </div>

          {/* Indicators - 5 panels grid */}
          <div className="h-[160px] bg-[#0a0e17] border-t border-[#1a2332] grid grid-cols-5 gap-1 p-1">
            <RSIPanel data={rsi} />
            <MACDPanel data={macd} />
            <StochasticPanel data={stochastic} />
            <ATRPanel data={atr} />
            <VolumePanel data={volume} />
          </div>
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
              onReset={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivePage;
