import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, X, Shield, Target, Plus, Minus } from 'lucide-react';
import { OHLCData, Position } from '@/types/trading';
import { cn } from '@/lib/utils';

interface TradingPanelProps {
  currentCandle: OHLCData | null;

  onOpenPosition: (type: 'long' | 'short', size: number, stopLoss?: number, takeProfit?: number) => void;
  onClosePosition: (positionId: string) => void;
  onCloseAll: () => void;
  balance: number;
}

export function TradingPanel({
  currentCandle,
  onOpenPosition,
  onClosePosition,
  onCloseAll,
  balance,
}: TradingPanelProps) {
  const [lotSize, setLotSize] = useState(0.1);
  const [slPips, setSlPips] = useState(50);
  const [tpPips, setTpPips] = useState(100);
  const [slEnabled, setSlEnabled] = useState(true);
  const [tpEnabled, setTpEnabled] = useState(true);

  // New state for manual input mode
  const [inputMode, setInputMode] = useState<'pips' | 'price'>('pips');
  const [manualSL, setManualSL] = useState<string>('');
  const [manualTP, setManualTP] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Update manual inputs when calculated values change in pips mode
  // This ensures that when switching to manual mode, we start with the current calculation
  useEffect(() => {
    if (inputMode === 'pips' && currentCandle) {
      // We don't necessarily need to sync back to manual inputs constantly, 
      // but it might be nice for the user to see the value they just set with the slider.
      // However, standard behavior is usually separation or one-way sync.
      // Let's leave manual inputs empty or independent to avoid confusion unless we want full sync.
      // The user request implies "underneath", so maybe they want to see it?
      // Let's keep them separate for now to avoid overwriting user entry.
    }
  }, [slPips, tpPips, inputMode, currentCandle]);

  const currentPrice = currentCandle?.close || 0;
  const priceChange = currentCandle
    ? currentCandle.close - currentCandle.open
    : 0;
  const priceChangePercent = currentCandle && currentCandle.open !== 0
    ? ((currentCandle.close - currentCandle.open) / currentCandle.open) * 100
    : 0;

  const pipValue = 0.0001;

  const handleOpenPosition = (type: 'long' | 'short') => {
    let stopLoss: number | undefined;
    let takeProfit: number | undefined;
    setErrorDetails(null);

    // Calculate TP/SL based on mode
    if (inputMode === 'pips') {
      if (slEnabled && currentPrice > 0) {
        stopLoss = type === 'long'
          ? currentPrice - (slPips * pipValue)
          : currentPrice + (slPips * pipValue);
      }
      if (tpEnabled && currentPrice > 0) {
        takeProfit = type === 'long'
          ? currentPrice + (tpPips * pipValue)
          : currentPrice - (tpPips * pipValue);
      }
    } else {
      // Manual Mode
      if (slEnabled && manualSL) {
        const val = parseFloat(manualSL);
        if (!isNaN(val)) stopLoss = val;
      }
      if (tpEnabled && manualTP) {
        const val = parseFloat(manualTP);
        if (!isNaN(val)) takeProfit = val;
      }
    }

    // Validation
    if (currentPrice > 0) {
      if (stopLoss) {
        if (type === 'long' && stopLoss >= currentPrice) {
          setErrorDetails("Long için SL fiyatın altında olmalı!");
          return;
        }
        if (type === 'short' && stopLoss <= currentPrice) {
          setErrorDetails("Short için SL fiyatın üstünde olmalı!");
          return;
        }
      }
      if (takeProfit) {
        if (type === 'long' && takeProfit <= currentPrice) {
          setErrorDetails("Long için TP fiyatın üstünde olmalı!");
          return;
        }
        if (type === 'short' && takeProfit >= currentPrice) {
          setErrorDetails("Short için TP fiyatın altında olmalı!");
          return;
        }
      }
    }

    onOpenPosition(type, lotSize, stopLoss, takeProfit);
    // Reset manual inputs or keep them? Keeping them is better for repeated trades.
  };



  return (
    <div className="h-full flex flex-col bg-[#0a0e17]">
      {/* Price Display - Enhanced */}
      <div className="p-4 border-b border-[#1a2332]">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Güncel Fiyat</div>
          <div className={cn(
            "text-3xl font-mono font-bold tracking-tight transition-colors duration-200",
            priceChange >= 0 ? "text-green-400" : "text-red-400"
          )}>
            {currentPrice.toFixed(5)}
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className={cn(
              "text-sm font-mono font-semibold px-2 py-0.5 rounded",
              priceChange >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            )}>
              {priceChange >= 0 ? '+' : ''}{(priceChange * 10000).toFixed(1)} pips
            </div>
            <div className={cn(
              "text-sm font-mono font-semibold px-2 py-0.5 rounded",
              priceChangePercent >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            )}>
              {priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Trading Status Indicator */}
      {!currentCandle ? (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30">
          <div className="text-xs text-amber-400 text-center font-medium">
            ⚠️ Veri yükleniyor veya oynatma başlatılmadı
          </div>
        </div>
      ) : balance <= 0 ? (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30">
          <div className="text-xs text-red-400 text-center font-medium">
            💸 Bakiye tükendi! Reset tuşuna basarak yeniden başlayın
          </div>
        </div>
      ) : null}

      {/* Lot Size */}
      <div className="p-4 border-b border-[#1a2332]">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Lot Büyüklüğü</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLotSize(Math.max(0.01, lotSize - 0.01))}
            className="w-8 h-8 rounded bg-[#1a2332] hover:bg-[#252d3d] flex items-center justify-center transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            value={lotSize}
            onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.01)}
            min={0.01}
            max={10}
            step={0.01}
            className="flex-1 h-8 bg-[#0f1521] border border-[#1a2332] rounded text-center font-mono text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => setLotSize(Math.min(10, lotSize + 0.01))}
            className="w-8 h-8 rounded bg-[#1a2332] hover:bg-[#252d3d] flex items-center justify-center transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <div className="flex gap-1 mt-2">
          {[0.01, 0.1, 0.5, 1].map((size) => (
            <button
              key={size}
              onClick={() => setLotSize(size)}
              className={cn(
                "flex-1 py-1 text-xs font-mono rounded transition-colors",
                lotSize === size
                  ? "bg-blue-500 text-white"
                  : "bg-[#1a2332] hover:bg-[#252d3d] text-muted-foreground"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* SL/TP Controls */}
      <div className="p-4 border-b border-[#1a2332] space-y-3">
        {/* Mode Toggle */}
        <div className="flex bg-[#1a2332] rounded p-1 mb-2">
          <button
            onClick={() => setInputMode('pips')}
            className={cn(
              "flex-1 text-xs py-1 rounded transition-colors font-medium",
              inputMode === 'pips' ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-white"
            )}
          >
            Pips
          </button>
          <button
            onClick={() => setInputMode('price')}
            className={cn(
              "flex-1 text-xs py-1 rounded transition-colors font-medium",
              inputMode === 'price' ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-white"
            )}
          >
            Fiyat (Manuel)
          </button>
        </div>
        {/* Stop Loss */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSlEnabled(!slEnabled)}
            className={cn(
              "w-5 h-5 rounded flex items-center justify-center transition-colors",
              slEnabled ? "bg-red-500" : "bg-[#1a2332]"
            )}
          >
            <Shield className="w-3 h-3" />
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-red-400">Stop Loss</span>
              {inputMode === 'pips' && (
                <span className="text-xs font-mono text-muted-foreground">
                  {slEnabled && currentPrice > 0
                    ? (currentPrice - slPips * pipValue).toFixed(5)
                    : '—'}
                </span>
              )}
            </div>

            {inputMode === 'pips' ? (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={10}
                  max={200}
                  value={slPips}
                  onChange={(e) => setSlPips(parseInt(e.target.value))}
                  disabled={!slEnabled}
                  className="flex-1 h-1 bg-[#1a2332] rounded-full appearance-none cursor-pointer disabled:opacity-50"
                />
                <span className="text-xs font-mono w-12 text-right">{slPips} pips</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.00001"
                  placeholder="Örn: 1.08500"
                  value={manualSL}
                  onChange={(e) => setManualSL(e.target.value)}
                  disabled={!slEnabled}
                  className="flex-1 h-7 bg-[#0f1521] border border-[#1a2332] rounded px-2 font-mono text-sm focus:outline-none focus:border-red-500/50"
                />
              </div>
            )}
          </div>
        </div>

        {/* Take Profit */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTpEnabled(!tpEnabled)}
            className={cn(
              "w-5 h-5 rounded flex items-center justify-center transition-colors",
              tpEnabled ? "bg-green-500" : "bg-[#1a2332]"
            )}
          >
            <Target className="w-3 h-3" />
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-green-400">Take Profit</span>
              {inputMode === 'pips' && (
                <span className="text-xs font-mono text-muted-foreground">
                  {tpEnabled && currentPrice > 0
                    ? (currentPrice + tpPips * pipValue).toFixed(5)
                    : '—'}
                </span>
              )}
            </div>
            {inputMode === 'pips' ? (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={10}
                  max={300}
                  value={tpPips}
                  onChange={(e) => setTpPips(parseInt(e.target.value))}
                  disabled={!tpEnabled}
                  className="flex-1 h-1 bg-[#1a2332] rounded-full appearance-none cursor-pointer disabled:opacity-50"
                />
                <span className="text-xs font-mono w-12 text-right">{tpPips} pips</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.00001"
                  placeholder="Örn: 1.09500"
                  value={manualTP}
                  onChange={(e) => setManualTP(e.target.value)}
                  disabled={!tpEnabled}
                  className="flex-1 h-7 bg-[#0f1521] border border-[#1a2332] rounded px-2 font-mono text-sm focus:outline-none focus:border-green-500/50"
                />
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Error Message */}
      {
        errorDetails && (
          <div className="px-4 py-2 bg-red-500/20 border-b border-red-500/30 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-xs text-red-200 font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {errorDetails}
            </div>
          </div>
        )
      }

      {/* Buy/Sell Buttons - Enhanced - ALWAYS ENABLED */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => handleOpenPosition('long')}
          className="py-5 rounded-lg font-bold flex flex-col items-center gap-2 transition-all duration-200 relative overflow-hidden bg-gradient-to-br from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/20"
        >
          <TrendingUp className="w-6 h-6" />
          <div className="flex flex-col items-center">
            <span className="text-base">LONG</span>
            {currentPrice > 0 && (
              <span className="text-[10px] opacity-75 font-mono">
                @ {currentPrice.toFixed(5)}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => handleOpenPosition('short')}
          className="py-5 rounded-lg font-bold flex flex-col items-center gap-2 transition-all duration-200 relative overflow-hidden bg-gradient-to-br from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 hover:scale-[1.02] hover:shadow-lg hover:shadow-red-500/20"
        >
          <TrendingDown className="w-6 h-6" />
          <div className="flex flex-col items-center">
            <span className="text-base">SHORT</span>
            {currentPrice > 0 && (
              <span className="text-[10px] opacity-75 font-mono">
                @ {currentPrice.toFixed(5)}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Open Positions - Moved to AccountPanel */}
      <div className="flex-1 bg-[#0a0e17] flex items-center justify-center text-muted-foreground/20">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-20" />
          <div className="text-[10px] font-mono">REPLEX</div>
        </div>
      </div>
    </div >
  );
}
