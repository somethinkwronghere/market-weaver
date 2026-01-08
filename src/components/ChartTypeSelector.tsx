import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChartType } from '@/types/chart';
import { Layers } from 'lucide-react';

interface ChartTypeSelectorProps {
  currentType: ChartType;
  onChange: (type: ChartType) => void;
}

const chartTypes = [
  {
    type: 'lightweight' as ChartType,
    name: 'Lightweight Charts',
    description: 'Hızlı, hafif ve özelleştirilebilir',
    badge: 'Varsayılan'
  },
  {
    type: 'tradingview' as ChartType,
    name: 'TradingView',
    description: 'Full profesyonel özellikler',
    badge: 'Popüler'
  }
];

export function ChartTypeSelector({ currentType, onChange }: ChartTypeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Layers className="w-4 h-4 text-muted-foreground" />
      {chartTypes.map((chart) => (
        <Button
          key={chart.type}
          variant={currentType === chart.type ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(chart.type)}
          className="relative"
        >
          {chart.name}
          {chart.badge && (
            <span className="absolute -top-1 -right-1 px-1 text-[8px] bg-blue-500 rounded-full text-white">
              {chart.badge}
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}
