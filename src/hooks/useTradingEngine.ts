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

  const updatePrice = useCallback((price: number, exitTime?: number) => {
    setState(prev => {
      const positionsToClose: Position[] = [];
      const remainingPositions: Position[] = [];
      
      // Check SL/TP for each position
      prev.positions.forEach(pos => {
        let shouldClose = false;
        
        if (pos.type === 'long') {
          if (pos.stopLoss && price <= pos.stopLoss) shouldClose = true;
          if (pos.takeProfit && price >= pos.takeProfit) shouldClose = true;
        } else {
          if (pos.stopLoss && price >= pos.stopLoss) shouldClose = true;
          if (pos.takeProfit && price <= pos.takeProfit) shouldClose = true;
        }
        
        if (shouldClose) {
          positionsToClose.push(pos);
        } else {
          remainingPositions.push(pos);
        }
      });

      // Calculate PnL for closed positions
      let totalClosedPnL = 0;
      const newTrades = positionsToClose.map(pos => {
        const exitPrice = pos.type === 'long' 
          ? (pos.stopLoss && price <= pos.stopLoss ? pos.stopLoss : pos.takeProfit!)
          : (pos.stopLoss && price >= pos.stopLoss ? pos.stopLoss : pos.takeProfit!);
        
        const priceDiff = pos.type === 'long'
          ? exitPrice - pos.entryPrice
          : pos.entryPrice - exitPrice;
        const pnl = priceDiff * pos.size * LEVERAGE;
        totalClosedPnL += pnl;

        return {
          id: crypto.randomUUID(),
          type: pos.type,
          entryPrice: pos.entryPrice,
          exitPrice,
          size: pos.size,
          pnl,
          entryTime: pos.entryTime,
          exitTime: exitTime || Date.now() / 1000,
        };
      });

      const unrealizedPnL = remainingPositions.reduce((total, pos) => {
        const priceDiff = pos.type === 'long' 
          ? price - pos.entryPrice 
          : pos.entryPrice - price;
        return total + (priceDiff * pos.size * LEVERAGE);
      }, 0);

      const newBalance = prev.balance + totalClosedPnL;

      return {
        ...prev,
        currentPrice: price,
        balance: newBalance,
        equity: newBalance + unrealizedPnL,
        positions: remainingPositions,
        trades: [...prev.trades, ...newTrades],
      };
    });
  }, []);

  const openPosition = useCallback((type: 'long' | 'short', size: number, candle: OHLCData, stopLoss?: number, takeProfit?: number) => {
    const position: Position = {
      id: crypto.randomUUID(),
      type,
      entryPrice: candle.close,
      size,
      entryTime: candle.time,
      stopLoss,
      takeProfit,
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
