import { Wallet, TrendingUp, History, Trophy } from 'lucide-react';
import { TradingState, Trade } from '@/types/trading';
import { cn } from '@/lib/utils';

interface AccountPanelProps {
  state: TradingState;
  onReset: () => void;
}

export function AccountPanel({ state, onReset }: AccountPanelProps) {
  const { balance, equity, trades } = state;
  
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  const averageWin = winningTrades.length > 0 
    ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length 
    : 0;
  const averageLoss = losingTrades.length > 0 
    ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length)
    : 0;

  return (
    <div className="trading-card space-y-4">
      {/* Balance & Equity */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 stat-label">
            <Wallet className="w-3 h-3" />
            Balance
          </div>
          <div className="stat-value">${balance.toFixed(2)}</div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 stat-label">
            <TrendingUp className="w-3 h-3" />
            Equity
          </div>
          <div className={cn(
            "stat-value",
            equity > balance ? "profit-text" : equity < balance ? "loss-text" : ""
          )}>
            ${equity.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Total P&L */}
      <div className="pt-3 border-t border-border">
        <div className="stat-label mb-1">Total P&L</div>
        <div className={cn(
          "text-2xl font-mono font-bold",
          totalPnL >= 0 ? "profit-text" : "loss-text"
        )}>
          {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}$
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
        <div className="position-card text-center">
          <div className="stat-label mb-1">Win Rate</div>
          <div className={cn(
            "font-mono font-semibold",
            winRate >= 50 ? "profit-text" : "loss-text"
          )}>
            {winRate.toFixed(1)}%
          </div>
        </div>
        <div className="position-card text-center">
          <div className="stat-label mb-1">Total Trades</div>
          <div className="font-mono font-semibold">{trades.length}</div>
        </div>
        <div className="position-card text-center">
          <div className="stat-label mb-1">Avg Win</div>
          <div className="font-mono font-semibold profit-text">
            ${averageWin.toFixed(2)}
          </div>
        </div>
        <div className="position-card text-center">
          <div className="stat-label mb-1">Avg Loss</div>
          <div className="font-mono font-semibold loss-text">
            ${averageLoss.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      {trades.length > 0 && (
        <div className="pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 stat-label mb-2">
            <History className="w-3 h-3" />
            Recent Trades
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {trades.slice(-5).reverse().map((trade) => (
              <TradeRow key={trade.id} trade={trade} />
            ))}
          </div>
        </div>
      )}

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="w-full py-2 text-sm text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors border border-border"
      >
        Reset Account
      </button>
    </div>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        <span className={cn(
          "font-semibold px-1.5 py-0.5 rounded",
          trade.type === 'long' 
            ? "bg-long/20 text-long" 
            : "bg-short/20 text-short"
        )}>
          {trade.type === 'long' ? 'L' : 'S'}
        </span>
        <span className="font-mono text-muted-foreground">
          {trade.entryPrice.toFixed(4)} → {trade.exitPrice.toFixed(4)}
        </span>
      </div>
      <span className={cn(
        "font-mono font-medium",
        trade.pnl >= 0 ? "profit-text" : "loss-text"
      )}>
        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}$
      </span>
    </div>
  );
}
