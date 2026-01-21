import { Wallet, TrendingUp, History, RotateCcw } from 'lucide-react';
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

  return (
    <div className="h-full flex flex-col bg-[#0a0e17]">
      {/* Account Summary */}
      <div className="p-4 border-b border-[#1a2332]">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Hesap Bilgileri</div>
          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-all text-xs font-semibold flex items-center gap-1.5"
            title="Reset Account"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <div className="text-[10px] uppercase tracking-wider text-blue-400 mb-1.5 flex items-center gap-1 font-semibold">
              <Wallet className="w-3 h-3" />
              Bakiye
            </div>
            <div className="font-mono font-bold text-lg text-blue-300">${balance.toFixed(2)}</div>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
            <div className="text-[10px] uppercase tracking-wider text-purple-400 mb-1.5 flex items-center gap-1 font-semibold">
              <TrendingUp className="w-3 h-3" />
              Equity
            </div>
            <div className={cn(
              "font-mono font-bold text-lg",
              equity > balance ? "text-green-400" : equity < balance ? "text-red-400" : "text-purple-300"
            )}>
              ${equity.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Total P&L */}
      <div className={cn(
        "p-4 border-b border-[#1a2332] transition-all duration-200",
        totalPnL >= 0 ? "bg-green-500/5" : "bg-red-500/5"
      )}>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">Toplam Kar/Zarar</div>
        <div className={cn(
          "text-3xl font-mono font-bold",
          totalPnL >= 0 ? "text-green-400" : "text-red-400"
        )}>
          {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}$
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {trades.length} işlem | {winningTrades.length} kazanan / {losingTrades.length} kaybeden
        </div>
      </div>

      {/* Recent Trades */}
      <div className="flex-1 overflow-auto">
        {trades.length > 0 ? (
          <div className="p-4">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-3 font-bold">
              <History className="w-3.5 h-3.5" />
              Son İşlemler
            </div>
            <div className="space-y-2">
              {trades.slice(-10).reverse().map((trade) => (
                <TradeRow key={trade.id} trade={trade} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <div className="text-center p-8">
              <div className="text-4xl mb-3">📈</div>
              <p className="font-semibold">Henüz işlem yok</p>
              <p className="text-xs mt-1">İşlemleriniz burada görünecek</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  return (
    <div className={cn(
      "flex items-center justify-between text-xs p-3 rounded-lg border-2 transition-all hover:scale-[1.01]",
      trade.pnl >= 0
        ? "bg-green-500/5 border-green-500/30 hover:border-green-500/50"
        : "bg-red-500/5 border-red-500/30 hover:border-red-500/50"
    )}>
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-[10px] font-bold px-2 py-1 rounded-md",
          trade.type === 'long'
            ? "bg-green-500/30 text-green-300 border border-green-500/50"
            : "bg-red-500/30 text-red-300 border border-red-500/50"
        )}>
          {trade.type === 'long' ? 'LONG' : 'SHORT'}
        </span>
        <div className="flex flex-col">
          <span className="font-mono text-muted-foreground text-[10px]">
            {trade.entryPrice.toFixed(5)} → {trade.exitPrice.toFixed(5)}
          </span>
          <span className="font-mono text-[9px] text-muted-foreground/60">
            {trade.size} lot
          </span>
        </div>
      </div>
      <span className={cn(
        "font-mono font-bold text-sm px-2 py-1 rounded",
        trade.pnl >= 0 ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"
      )}>
        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}$
      </span>
    </div>
  );
}
