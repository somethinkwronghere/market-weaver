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
      {/* Price Display */}
      <div className="p-4 border-b border-[#1a2332]">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Current Price</div>
          <div className={cn(
            "text-3xl font-mono font-bold tracking-tight",
            priceChange >= 0 ? "text-green-400" : "text-red-400"
          )}>
            {currentPrice.toFixed(5)}
          </div>
        </div>
      </div>

      {/* Lot Size */}
      <div className="p-4 border-b border-[#1a2332]">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Lot Size</div>
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

      {/* Buy/Sell Buttons */}
      <div className="p-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => handleOpenPosition('long')}
          disabled={!currentCandle || balance <= 0}
          className="py-4 rounded-lg font-semibold flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-500 transition-colors"
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-sm">BUY</span>
        </button>
        <button
          onClick={() => handleOpenPosition('short')}
          disabled={!currentCandle || balance <= 0}
          className="py-4 rounded-lg font-semibold flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-500 transition-colors"
        >
          <TrendingDown className="w-5 h-5" />
          <span className="text-sm">SELL</span>
        </button>
      </div>

      {/* Open Positions */}
      <div className="flex-1 overflow-auto">
        {positions.length > 0 && (
          <div className="p-4 border-t border-[#1a2332]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Positions ({positions.length})
              </span>
              <button
                onClick={onCloseAll}
                className="text-[10px] text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider"
              >
                Close All
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
                    className="p-3 rounded bg-[#0f1521] border border-[#1a2332]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                          position.type === 'long' 
                            ? "bg-green-500/20 text-green-400" 
                            : "bg-red-500/20 text-red-400"
                        )}>
                          {position.type.toUpperCase()}
                        </span>
                        <span className="font-mono text-xs">{position.size} lot</span>
                      </div>
                      <button
                        onClick={() => onClosePosition(position.id)}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <X className="w-3 h-3 text-muted-foreground hover:text-red-400" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground">
                        @ {position.entryPrice.toFixed(5)}
                      </span>
                      <span className={cn(
                        "font-mono font-semibold",
                        pnl >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} pips
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

            {/* Total P&L */}
            <div className="mt-3 p-3 rounded bg-[#0f1521] border border-[#1a2332]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total P&L</span>
                <span className={cn(
                  "font-mono font-bold",
                  totalPnl >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} pips
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
