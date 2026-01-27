export interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  id: string;
  type: 'long' | 'short';
  entryPrice: number;
  size: number;
  entryTime: number;
  stopLoss?: number;
  takeProfit?: number;
  useOverlay?: boolean;
}

export interface Trade {
  id: string;
  type: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  entryTime: number;
  exitTime: number;
}

export interface TradingState {
  balance: number;
  equity: number;
  positions: Position[];
  trades: Trade[];
  currentPrice: number;
}

export type PlaybackSpeed = 0.5 | 1 | 2 | 4 | 8;
