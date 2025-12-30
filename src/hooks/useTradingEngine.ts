import { useState, useCallback } from 'react';
import { Position, Trade, TradingState, OHLCData } from '@/types/trading';

const INITIAL_BALANCE = 10000;
const LEVERAGE = 100;

export function useTradingEngine() {
  const [state, setState] = useState<TradingState>({
    balance: INITIAL_BALANCE,
    equity: INITIAL_BALANCE,
    positions: [],
    trades: [],
    currentPrice: 0,
  });

  const updatePrice = useCallback((price: number) => {
    setState(prev => {
      const unrealizedPnL = prev.positions.reduce((total, pos) => {
        const priceDiff = pos.type === 'long' 
          ? price - pos.entryPrice 
          : pos.entryPrice - price;
        return total + (priceDiff * pos.size * LEVERAGE);
      }, 0);

      return {
        ...prev,
        currentPrice: price,
        equity: prev.balance + unrealizedPnL,
      };
    });
  }, []);

  const openPosition = useCallback((type: 'long' | 'short', size: number, candle: OHLCData) => {
    const position: Position = {
      id: crypto.randomUUID(),
      type,
      entryPrice: candle.close,
      size,
      entryTime: candle.time,
    };

    setState(prev => ({
      ...prev,
      positions: [...prev.positions, position],
    }));

    return position;
  }, []);

  const closePosition = useCallback((positionId: string, exitPrice: number, exitTime: number) => {
    setState(prev => {
      const position = prev.positions.find(p => p.id === positionId);
      if (!position) return prev;

      const priceDiff = position.type === 'long'
        ? exitPrice - position.entryPrice
        : position.entryPrice - exitPrice;
      const pnl = priceDiff * position.size * LEVERAGE;

      const trade: Trade = {
        id: crypto.randomUUID(),
        type: position.type,
        entryPrice: position.entryPrice,
        exitPrice,
        size: position.size,
        pnl,
        entryTime: position.entryTime,
        exitTime,
      };

      return {
        ...prev,
        balance: prev.balance + pnl,
        equity: prev.balance + pnl,
        positions: prev.positions.filter(p => p.id !== positionId),
        trades: [...prev.trades, trade],
      };
    });
  }, []);

  const closeAllPositions = useCallback((exitPrice: number, exitTime: number) => {
    setState(prev => {
      let totalPnL = 0;
      const newTrades: Trade[] = [];

      prev.positions.forEach(position => {
        const priceDiff = position.type === 'long'
          ? exitPrice - position.entryPrice
          : position.entryPrice - exitPrice;
        const pnl = priceDiff * position.size * LEVERAGE;
        totalPnL += pnl;

        newTrades.push({
          id: crypto.randomUUID(),
          type: position.type,
          entryPrice: position.entryPrice,
          exitPrice,
          size: position.size,
          pnl,
          entryTime: position.entryTime,
          exitTime,
        });
      });

      return {
        ...prev,
        balance: prev.balance + totalPnL,
        equity: prev.balance + totalPnL,
        positions: [],
        trades: [...prev.trades, ...newTrades],
      };
    });
  }, []);

  const resetAccount = useCallback(() => {
    setState({
      balance: INITIAL_BALANCE,
      equity: INITIAL_BALANCE,
      positions: [],
      trades: [],
      currentPrice: 0,
    });
  }, []);

  return {
    state,
    updatePrice,
    openPosition,
    closePosition,
    closeAllPositions,
    resetAccount,
  };
}
