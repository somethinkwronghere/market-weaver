import { useState } from 'react';
import { TrendingUp, TrendingDown, X, Shield, Target } from 'lucide-react';
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
  const [showSlTp, setShowSlTp] = useState(false);
  const [slPips, setSlPips] = useState(50);
  const [tpPips, setTpPips] = useState(100);

  const currentPrice = currentCandle?.close || 0;
  const priceChange = currentCandle 
    ? currentCandle.close - currentCandle.open 
    : 0;
  const priceChangePercent = currentCandle && currentCandle.open > 0
    ? ((priceChange / currentCandle.open) * 100)
    : 0;

  const pipValue = 0.0001;

  const handleOpenPosition = (type: 'long' | 'short') => {
    let stopLoss: number | undefined;
    let takeProfit: number | undefined;

    if (showSlTp && currentPrice > 0) {
      if (type === 'long') {
        stopLoss = currentPrice - (slPips * pipValue);
        takeProfit = currentPrice + (tpPips * pipValue);
      } else {
        stopLoss = currentPrice + (slPips * pipValue);
        takeProfit = currentPrice - (tpPips * pipValue);
      }
    }

    onOpenPosition(type, lotSize, stopLoss, takeProfit);
  };

  return (
    <div className="trading-card space-y-4">
      {/* Current Price Display */}
      <div className="text-center pb-4 border-b border-border">
        <div className="stat-label mb-1">EUR/USD</div>
        <div className={cn(
          "price-ticker",
          priceChange >= 0 ? "profit-text" : "loss-text"
        )}>
          {currentPrice.toFixed(5)}
        </div>
        <div className={cn(
          "text-sm font-mono flex items-center justify-center gap-1 mt-1",
          priceChange >= 0 ? "profit-text" : "loss-text"
        )}>
          {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(5)} ({priceChangePercent.toFixed(3)}%)
        </div>
      </div>

      {/* Lot Size Input */}
      <div className="space-y-2">
        <label className="stat-label">Lot Size</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={lotSize}
            onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.01)}
            min={0.01}
            max={10}
            step={0.01}
            className="input-trading flex-1"
          />
          <div className="flex gap-1">
            {[0.01, 0.1, 0.5, 1].map((size) => (
              <button
                key={size}
                onClick={() => setLotSize(size)}
                className={cn(
                  "px-2 py-1 text-xs font-mono rounded border transition-colors",
                  lotSize === size 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-muted border-border hover:border-primary/50"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SL/TP Toggle */}
      <div className="space-y-3">
        <button
          onClick={() => setShowSlTp(!showSlTp)}
          className={cn(
            "w-full py-2 px-3 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors border",
            showSlTp 
              ? "bg-primary/20 border-primary text-primary" 
              : "bg-muted border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <Shield className="w-4 h-4" />
          <Target className="w-4 h-4" />
          Stop Loss / Take Profit
        </button>

        {showSlTp && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <label className="stat-label flex items-center gap-1">
                <Shield className="w-3 h-3 text-loss" />
                SL (pips)
              </label>
              <input
                type="number"
                value={slPips}
                onChange={(e) => setSlPips(parseInt(e.target.value) || 0)}
                min={0}
                step={10}
                className="input-trading w-full text-center"
              />
              {currentPrice > 0 && (
                <div className="text-xs text-muted-foreground text-center font-mono">
                  {(currentPrice - slPips * pipValue).toFixed(5)}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="stat-label flex items-center gap-1">
                <Target className="w-3 h-3 text-profit" />
                TP (pips)
              </label>
              <input
                type="number"
                value={tpPips}
                onChange={(e) => setTpPips(parseInt(e.target.value) || 0)}
                min={0}
                step={10}
                className="input-trading w-full text-center"
              />
              {currentPrice > 0 && (
                <div className="text-xs text-muted-foreground text-center font-mono">
                  {(currentPrice + tpPips * pipValue).toFixed(5)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Buy/Sell Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleOpenPosition('long')}
          disabled={!currentCandle || balance <= 0}
          className="btn-long py-4 rounded-lg font-semibold flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <TrendingUp className="w-5 h-5" />
          <span>BUY</span>
          <span className="text-xs opacity-80">Long</span>
        </button>
        <button
          onClick={() => handleOpenPosition('short')}
          disabled={!currentCandle || balance <= 0}
          className="btn-short py-4 rounded-lg font-semibold flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <TrendingDown className="w-5 h-5" />
          <span>SELL</span>
          <span className="text-xs opacity-80">Short</span>
        </button>
      </div>

      {/* Open Positions */}
      {positions.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="stat-label">Open Positions ({positions.length})</span>
            <button
              onClick={onCloseAll}
              className="text-xs text-destructive hover:text-destructive/80 transition-colors"
            >
              Close All
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {positions.map((position) => {
              const pnl = position.type === 'long'
                ? (currentPrice - position.entryPrice) * position.size * 100
                : (position.entryPrice - currentPrice) * position.size * 100;
              
              return (
                <div
                  key={position.id}
                  className="position-card flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded",
                      position.type === 'long' 
                        ? "bg-long/20 text-long" 
                        : "bg-short/20 text-short"
                    )}>
                      {position.type.toUpperCase()}
                    </span>
                    <span className="font-mono text-sm">{position.size} lot</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-mono text-sm font-medium",
                      pnl >= 0 ? "profit-text" : "loss-text"
                    )}>
                      {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}$
                    </span>
                    <button
                      onClick={() => onClosePosition(position.id)}
                      className="p-1 hover:bg-destructive/20 rounded transition-colors"
                    >
                      <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
