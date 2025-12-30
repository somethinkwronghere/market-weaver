import { useState } from 'react';
import { 
  TrendingUp, 
  Minus, 
  BarChart3, 
  MousePointer, 
  Trash2,
  Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type DrawingTool = 'select' | 'trendline' | 'horizontal' | 'fibonacci' | 'support-resistance';

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onClearDrawings: () => void;
}

const tools = [
  { id: 'select' as const, icon: MousePointer, label: 'Select' },
  { id: 'trendline' as const, icon: TrendingUp, label: 'Trend Line' },
  { id: 'horizontal' as const, icon: Minus, label: 'Horizontal Line' },
  { id: 'fibonacci' as const, icon: BarChart3, label: 'Fibonacci' },
  { id: 'support-resistance' as const, icon: Circle, label: 'S/R Level' },
];

export function DrawingToolbar({ activeTool, onToolChange, onClearDrawings }: DrawingToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-card rounded-lg border border-border">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            title={tool.label}
            className={cn(
              "p-2 rounded transition-colors",
              activeTool === tool.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
      <div className="w-px h-6 bg-border mx-1" />
      <button
        onClick={onClearDrawings}
        title="Clear All Drawings"
        className="p-2 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
