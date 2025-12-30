import { Wallet, TrendingUp, History, RotateCcw, Trophy, Target } from 'lucide-react';
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
  const profitFactor = averageLoss > 0 ? (averageWin * winningTrades.length) / (averageLoss * losingTrades.length) : 0;

  return (
    <div className="h-full flex flex-col bg-[#0a0e17]">
      {/* Account Summary */}
      <div className="p-4 border-b border-[#1a2332]">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Account</div>
          <button
            onClick={onReset}
            className="p-1.5 rounded hover:bg-[#1a2332] transition-colors"
            title="Reset Account"
          >
            <RotateCcw className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <Wallet className="w-3 h-3" />
              Balance
            </div>
            <div className="font-mono font-bold text-lg">${balance.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Equity
            </div>
            <div className={cn(
              "font-mono font-bold text-lg",
              equity > balance ? "text-green-400" : equity < balance ? "text-red-400" : ""
            )}>
              ${equity.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Total P&L */}
      <div className="p-4 border-b border-[#1a2332]">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total P&L</div>
        <div className={cn(
          "text-2xl font-mono font-bold",
          totalPnL >= 0 ? "text-green-400" : "text-red-400"
        )}>
          {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}$
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4 border-b border-[#1a2332]">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded bg-[#0f1521] border border-[#1a2332]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              Win Rate
            </div>
            <div className={cn(
              "font-mono font-semibold text-lg",
              winRate >= 50 ? "text-green-400" : "text-red-400"
            )}>
              {winRate.toFixed(1)}%
            </div>
          </div>
          <div className="p-3 rounded bg-[#0f1521] border border-[#1a2332]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" />
              Trades
            </div>
            <div className="font-mono font-semibold text-lg">{trades.length}</div>
          </div>
          <div className="p-3 rounded bg-[#0f1521] border border-[#1a2332]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Avg Win</div>
            <div className="font-mono font-semibold text-green-400">
              ${averageWin.toFixed(2)}
            </div>
          </div>
          <div className="p-3 rounded bg-[#0f1521] border border-[#1a2332]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Avg Loss</div>
            <div className="font-mono font-semibold text-red-400">
              ${averageLoss.toFixed(2)}
            </div>
          </div>
        </div>
        
        {profitFactor > 0 && (
          <div className="mt-3 p-3 rounded bg-[#0f1521] border border-[#1a2332]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Profit Factor</span>
              <span className={cn(
                "font-mono font-bold",
                profitFactor >= 1 ? "text-green-400" : "text-red-400"
              )}>
                {profitFactor.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Trades */}
      <div className="flex-1 overflow-auto">
        {trades.length > 0 && (
          <div className="p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
              <History className="w-3 h-3" />
              Recent Trades
            </div>
            <div className="space-y-2">
              {trades.slice(-10).reverse().map((trade) => (
                <TradeRow key={trade.id} trade={trade} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  return (
    <div className="flex items-center justify-between text-xs p-2 rounded bg-[#0f1521] border border-[#1a2332]">
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-[10px] font-semibold px-1.5 py-0.5 rounded",
          trade.type === 'long' 
            ? "bg-green-500/20 text-green-400" 
            : "bg-red-500/20 text-red-400"
        )}>
          {trade.type === 'long' ? 'BUY' : 'SELL'}
        </span>
        <span className="font-mono text-muted-foreground text-[10px]">
          {trade.entryPrice.toFixed(5)} → {trade.exitPrice.toFixed(5)}
        </span>
      </div>
      <span className={cn(
        "font-mono font-semibold",
        trade.pnl >= 0 ? "text-green-400" : "text-red-400"
      )}>
        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}$
      </span>
    </div>
  );
}
