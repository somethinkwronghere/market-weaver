import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity, Clock, DollarSign } from 'lucide-react';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { storage } from '@/lib/storage';
import { useMemo } from 'react';

const DashboardPage = () => {
  const { state } = useTradingEngine();

  // Calculate statistics from trades
  const stats = useMemo(() => {
    const trades = state.trades;
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;

    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
      : 0;

    // Calculate streak
    let currentStreak = 0;
    for (let i = trades.length - 1; i >= 0; i--) {
      if (trades[i].pnl > 0) currentStreak++;
      else if (trades[i].pnl < 0) break;
    }

    return {
      totalTrades,
      winRate,
      totalPnL,
      avgWin,
      avgLoss,
      currentStreak,
      balance: state.balance,
      equity: state.equity,
      openPositions: state.positions.length
    };
  }, [state]);

  // Get saved time invested (simplified for now)
  const timeInvested = storage.get<number>('time-invested', 0);
  const hoursInvested = Math.floor(timeInvested / 3600);
  const minutesInvested = Math.floor((timeInvested % 3600) / 60);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Trading performance overview</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#0a0e17] border-[#1a2332]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Balance</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ${stats.balance.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Equity: ${stats.equity.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0e17] border-[#1a2332]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.winRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalTrades} trades total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0e17] border-[#1a2332]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total P&L</CardTitle>
              {stats.totalPnL >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                ${stats.totalPnL.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalPnL >= 0 ? 'Profit' : 'Loss'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0e17] border-[#1a2332]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Time Invested</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {hoursInvested}h {minutesInvested}m
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.openPositions} positions open
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Streak and Average Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-[#0a0e17] border-[#1a2332]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.currentStreak >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {stats.currentStreak > 0 ? `${stats.currentStreak} W` : stats.currentStreak < 0 ? `${Math.abs(stats.currentStreak)} L` : '0'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0e17] border-[#1a2332]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Win</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                ${stats.avgWin.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0e17] border-[#1a2332]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Loss</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                ${Math.abs(stats.avgLoss).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-[#0a0e17] border-[#1a2332]">
          <CardHeader>
            <CardTitle className="text-white">Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            {state.trades.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No trades yet. Start trading to see your history here.</p>
            ) : (
              <div className="space-y-2">
                {state.trades.slice(-10).reverse().map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg bg-[#050810]">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${trade.pnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-white">{trade.type.toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(trade.exitTime * 1000).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {trade.size} lots @ {trade.entryPrice.toFixed(5)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
