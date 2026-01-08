import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const AnalyticsPage = () => {
  const { state } = useTradingEngine();

  // Calculate analytics
  const analytics = useMemo(() => {
    const trades = state.trades;
    const longTrades = trades.filter(t => t.type === 'long');
    const shortTrades = trades.filter(t => t.type === 'short');

    const longWinRate = longTrades.length > 0
      ? (longTrades.filter(t => t.pnl > 0).length / longTrades.length) * 100
      : 0;
    const shortWinRate = shortTrades.length > 0
      ? (shortTrades.filter(t => t.pnl > 0).length / shortTrades.length) * 100
      : 0;

    const longPnL = longTrades.reduce((sum, t) => sum + t.pnl, 0);
    const shortPnL = shortTrades.reduce((sum, t) => sum + t.pnl, 0);

    // Calculate hourly performance
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const hourTrades = trades.filter(t => {
        const tradeHour = new Date(t.exitTime * 1000).getHours();
        return tradeHour === hour;
      });
      const pnl = hourTrades.reduce((sum, t) => sum + t.pnl, 0);
      return {
        hour: `${hour}:00`,
        pnl,
        trades: hourTrades.length
      };
    }).filter(d => d.trades > 0);

    // Win/Loss distribution
    const winLossData = [
      { name: 'Wins', value: trades.filter(t => t.pnl > 0).length, color: '#10b981' },
      { name: 'Losses', value: trades.filter(t => t.pnl < 0).length, color: '#ef4444' },
      { name: 'Breakeven', value: trades.filter(t => t.pnl === 0).length, color: '#6b7280' }
    ].filter(d => d.value > 0);

    // Risk metrics
    const allPnLs = trades.map(t => t.pnl);
    const maxDrawdown = useMemo(() => {
      let peak = 0;
      let maxDD = 0;
      let cumulative = 0;
      trades.forEach(t => {
        cumulative += t.pnl;
        if (cumulative > peak) peak = cumulative;
        const dd = peak - cumulative;
        if (dd > maxDD) maxDD = dd;
      });
      return maxDD;
    }, [trades]);

    const avgPnL = trades.length > 0
      ? trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length
      : 0;
    const stdDev = trades.length > 1
      ? Math.sqrt(trades.reduce((sum, t) => sum + Math.pow(t.pnl - avgPnL, 2), 0) / (trades.length - 1))
      : 0;
    const sharpeRatio = stdDev > 0 ? avgPnL / stdDev : 0;

    return {
      longWinRate,
      shortWinRate,
      longPnL,
      shortPnL,
      hourlyData,
      winLossData,
      maxDrawdown,
      sharpeRatio,
      avgPnL,
      totalTrades: trades.length,
      profitableTrades: trades.filter(t => t.pnl > 0).length
    };
  }, [state.trades]);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-muted-foreground mt-1">Detailed trading performance analysis</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#0a0e17] border-[#1a2332]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{analytics.totalTrades}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0e17] border-[#1a2332]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profitable</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">{analytics.profitableTrades}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.totalTrades > 0
                  ? ((analytics.profitableTrades / analytics.totalTrades) * 100).toFixed(1)
                  : 0}% win rate
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0e17] border-[#1a2332]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Max Drawdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">${analytics.maxDrawdown.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#0a0e17] border-[#1a2332]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sharpe Ratio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${analytics.sharpeRatio >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {analytics.sharpeRatio.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Long vs Short Performance */}
          <Card className="bg-[#0a0e17] border-[#1a2332]">
            <CardHeader>
              <CardTitle className="text-white">Long vs Short Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-blue-500">LONG</Badge>
                    <span className="text-white">Win Rate</span>
                  </div>
                  <span className="text-white font-bold">{analytics.longWinRate.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-purple-500">SHORT</Badge>
                    <span className="text-white">Win Rate</span>
                  </div>
                  <span className="text-white font-bold">{analytics.shortWinRate.toFixed(1)}%</span>
                </div>
                <div className="h-px bg-[#1a2332]" />
                <div className="flex items-center justify-between">
                  <span className="text-white">Long P&L</span>
                  <span className={`font-bold ${analytics.longPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    ${analytics.longPnL.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Short P&L</span>
                  <span className={`font-bold ${analytics.shortPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    ${analytics.shortPnL.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Win/Loss Distribution */}
          <Card className="bg-[#0a0e17] border-[#1a2332]">
            <CardHeader>
              <CardTitle className="text-white">Win/Loss Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.winLossData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={analytics.winLossData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analytics.winLossData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No trade data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Hourly Performance */}
        <Card className="bg-[#0a0e17] border-[#1a2332]">
          <CardHeader>
            <CardTitle className="text-white">Hourly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.hourlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                  <XAxis dataKey="hour" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0e17', border: '1px solid #1a2332' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']}
                  />
                  <Bar dataKey="pnl" fill={(entry: any) => entry.pnl >= 0 ? '#10b981' : '#ef4444'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No hourly data available yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;
