import { useState, useCallback, useRef, useEffect } from 'react';
import { GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableSlTpProps {
  type: 'sl' | 'tp';
  price: number;
  entryPrice: number;
  currentPrice: number;
  positionType: 'long' | 'short';
  chartHeight: number;
  priceRange: { min: number; max: number };
  onPriceChange: (newPrice: number) => void;
}

export function DraggableSlTp({
  type,
  price,
  entryPrice,
  currentPrice,
  positionType,
  chartHeight,
  priceRange,
  onPriceChange,
}: DraggableSlTpProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const priceToY = useCallback((p: number) => {
    const range = priceRange.max - priceRange.min;
    if (range === 0) return chartHeight / 2;
    return ((priceRange.max - p) / range) * chartHeight;
  }, [priceRange, chartHeight]);

  const yToPrice = useCallback((y: number) => {
    const range = priceRange.max - priceRange.min;
    return priceRange.max - (y / chartHeight) * range;
  }, [priceRange, chartHeight]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragY(e.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - dragY;
      const newY = priceToY(price) + deltaY;
      const newPrice = yToPrice(newY);
      
      // Validate price based on position type
      if (positionType === 'long') {
        if (type === 'sl' && newPrice < entryPrice) {
          onPriceChange(newPrice);
        } else if (type === 'tp' && newPrice > entryPrice) {
          onPriceChange(newPrice);
        }
      } else {
        if (type === 'sl' && newPrice > entryPrice) {
          onPriceChange(newPrice);
        } else if (type === 'tp' && newPrice < entryPrice) {
          onPriceChange(newPrice);
        }
      }
      
      setDragY(e.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragY, price, priceToY, yToPrice, entryPrice, positionType, type, onPriceChange]);

  const y = priceToY(price);
  const pnl = positionType === 'long' 
    ? (price - entryPrice) * 10000 
    : (entryPrice - price) * 10000;

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute left-0 right-16 h-6 flex items-center cursor-ns-resize group transition-opacity",
        isDragging && "opacity-100",
        !isDragging && "opacity-80 hover:opacity-100"
      )}
      style={{ top: y - 12 }}
      onMouseDown={handleMouseDown}
    >
      <div className={cn(
        "flex-1 h-px",
        type === 'sl' ? "bg-destructive" : "bg-primary"
      )} style={{ borderStyle: 'dashed', borderWidth: '1px 0 0 0' }} />
      
      <div className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono",
        type === 'sl' 
          ? "bg-destructive/20 text-destructive border border-destructive/50" 
          : "bg-primary/20 text-primary border border-primary/50"
      )}>
        <GripHorizontal className="w-3 h-3 opacity-50" />
        <span className="font-semibold">{type.toUpperCase()}</span>
        <span>{price.toFixed(5)}</span>
        <span className={cn(
          "ml-1",
          type === 'sl' ? "text-destructive" : "text-primary"
        )}>
          ({pnl >= 0 ? '+' : ''}{pnl.toFixed(1)} pips)
        </span>
      </div>
    </div>
  );
}
