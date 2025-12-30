import { OHLCData } from '@/types/trading';

interface CandleInfoProps {
  candle: OHLCData | null;
}

export function CandleInfo({ candle }: CandleInfoProps) {
  if (!candle) return null;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isGreen = candle.close >= candle.open;

  return (
    <div className="trading-card">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <div>
            <span className="stat-label">Time</span>
            <div className="font-mono text-sm">{formatDate(candle.time)}</div>
          </div>
          <div>
            <span className="stat-label">Open</span>
            <div className="font-mono text-sm">{candle.open.toFixed(5)}</div>
          </div>
          <div>
            <span className="stat-label">High</span>
            <div className="font-mono text-sm text-profit">{candle.high.toFixed(5)}</div>
          </div>
          <div>
            <span className="stat-label">Low</span>
            <div className="font-mono text-sm text-loss">{candle.low.toFixed(5)}</div>
          </div>
          <div>
            <span className="stat-label">Close</span>
            <div className={`font-mono text-sm font-medium ${isGreen ? 'profit-text' : 'loss-text'}`}>
              {candle.close.toFixed(5)}
            </div>
          </div>
        </div>
        <div>
          <span className="stat-label">Volume</span>
          <div className="font-mono text-sm">{candle.volume.toFixed(0)}</div>
        </div>
      </div>
    </div>
  );
}
