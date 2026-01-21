import { useState } from 'react';
import { TrendingUp, TrendingDown, X, Shield, Target, Plus, Minus } from 'lucide-react';
import { OHLCData, Position } from '@/types/trading';
import { cn } from '@/lib/utils';

interface TradingPanelProps {
  currentCandle: OHLCData | null;
  positions: Position[];
  onOpenPosition: (type: 'long' | 'short', size: number, stopLoss?: number, takeProfit?: number) => void;
  onClosePosition: (positionId: string) => void;
  onCloseAll: () => void;
  balance: number;
}

export function TradingPanel({
  currentCandle,
  positions,
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

    if (slEnabled && currentPrice > 0) {
      if (type === 'long') {
        stopLoss = currentPrice - (slPips * pipValue);
      } else {
        stopLoss = currentPrice + (slPips * pipValue);
      }
    }

    if (tpEnabled && currentPrice > 0) {
      if (type === 'long') {
        takeProfit = currentPrice + (tpPips * pipValue);
      } else {
        takeProfit = currentPrice - (tpPips * pipValue);
      }
    }

    onOpenPosition(type, lotSize, stopLoss, takeProfit);
  };

  const totalPnl = positions.reduce((total, pos) => {
    const pnl = pos.type === 'long'
      ? (currentPrice - pos.entryPrice) * pos.size * 10000
      : (pos.entryPrice - currentPrice) * pos.size * 10000;
    return total + pnl;
  }, 0);

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
              <span className="text-xs font-mono text-muted-foreground">
                {slEnabled && currentPrice > 0 
                  ? (currentPrice - slPips * pipValue).toFixed(5)
                  : '—'}
              </span>
            </div>
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
              <span className="text-xs font-mono text-muted-foreground">
                {tpEnabled && currentPrice > 0 
                  ? (currentPrice + tpPips * pipValue).toFixed(5)
                  : '—'}
              </span>
            </div>
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
          </div>
        </div>
      </div>

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

      {/* Open Positions - Enhanced */}
      <div className="flex-1 overflow-auto">
        {positions.length > 0 ? (
          <div className="p-4 border-t border-[#1a2332]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Açık Pozisyonlar ({positions.length})
              </span>
              <button
                onClick={onCloseAll}
                className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all uppercase tracking-wider font-semibold"
              >
                Hepsini Kapat
              </button>
            </div>
            
            <div className="space-y-2">
              {positions.map((position) => {
                const pnl = position.type === 'long'
                  ? (currentPrice - position.entryPrice) * position.size * 10000
                  : (position.entryPrice - currentPrice) * position.size * 10000;
                
                return (
                  <div
                    key={position.id}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all duration-200",
                      pnl >= 0
                        ? "bg-green-500/5 border-green-500/30 hover:border-green-500/50"
                        : "bg-red-500/5 border-red-500/30 hover:border-red-500/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-md",
                          position.type === 'long'
                            ? "bg-green-500/30 text-green-300 border border-green-500/50"
                            : "bg-red-500/30 text-red-300 border border-red-500/50"
                        )}>
                          {position.type.toUpperCase()}
                        </span>
                        <span className="font-mono text-xs font-semibold">{position.size} lot</span>
                      </div>
                      <button
                        onClick={() => onClosePosition(position.id)}
                        className="p-1.5 hover:bg-red-500/30 rounded-md transition-all hover:scale-110"
                      >
                        <X className="w-3.5 h-3.5 text-red-400 hover:text-red-300" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-mono text-muted-foreground">
                        Giriş: {position.entryPrice.toFixed(5)}
                      </span>
                      <span className={cn(
                        "font-mono font-bold text-base px-2 py-0.5 rounded",
                        pnl >= 0 ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"
                      )}>
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                      </span>
                    </div>
                    
                    {(position.stopLoss || position.takeProfit) && (
                      <div className="flex gap-3 mt-2 pt-2 border-t border-[#1a2332] text-[10px]">
                        {position.stopLoss && (
                          <span className="text-red-400">
                            SL: {position.stopLoss.toFixed(5)}
                          </span>
                        )}
                        {position.takeProfit && (
                          <span className="text-green-400">
                            TP: {position.takeProfit.toFixed(5)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total P&L - Enhanced */}
            <div className={cn(
              "mt-3 p-4 rounded-lg border-2 transition-all duration-200",
              totalPnl >= 0
                ? "bg-green-500/10 border-green-500/50"
                : "bg-red-500/10 border-red-500/50"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Toplam K/Z</span>
                <span className={cn(
                  "font-mono font-bold text-xl",
                  totalPnl >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <p>Henüz açık pozisyon yok</p>
              <p className="text-xs mt-1">Long veya Short açın</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
