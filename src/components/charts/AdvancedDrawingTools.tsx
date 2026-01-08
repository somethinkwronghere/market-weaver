import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Crosshair,
  Minus,
  TrendingUp,
  Ruler,
  PenTool,
  Type,
  Shapes,
  Magnet,
  ZoomIn,
  ZoomOut,
  Lock,
  Unlock,
  Eraser
} from 'lucide-react';
import { DrawingTool } from '@/components/DrawingToolbar';
import { useState } from 'react';

interface AdvancedDrawingToolsProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onClearAll: () => void;
}

export function AdvancedDrawingTools({ activeTool, onToolChange, onClearAll }: AdvancedDrawingToolsProps) {
  const [magnetMode, setMagnetMode] = useState(false);
  const [locked, setLocked] = useState(false);

  const tools = [
    { id: 'select' as DrawingTool, icon: Crosshair, label: 'Select' },
    { id: 'trendline' as DrawingTool, icon: TrendingUp, label: 'Trend Line' },
    { id: 'horizontal' as DrawingTool, icon: Minus, label: 'Horizontal' },
    { id: 'support-resistance' as DrawingTool, icon: Ruler, label: 'S/R Levels' },
    { id: 'fibonacci' as DrawingTool, icon: PenTool, label: 'Fibonacci' },
    { id: 'brush' as DrawingTool, icon: Shapes, label: 'Brush' },
  ];

  const quickTools = [
    { icon: Magnet, label: 'Magnet', active: magnetMode, toggle: () => setMagnetMode(!magnetMode) },
    { icon: locked ? Lock : Unlock, label: 'Lock', active: locked, toggle: () => setLocked(!locked) },
  ];

  return (
    <Card className="bg-[#0a0e17] border-[#1a2332] p-2">
      <div className="flex flex-col gap-2">
        {/* Main Drawing Tools */}
        <div className="grid grid-cols-3 gap-1">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant={activeTool === tool.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onToolChange(tool.id)}
              className="flex flex-col items-center gap-1 h-auto py-2"
              title={tool.label}
            >
              <tool.icon className="w-4 h-4" />
              <span className="text-[10px]">{tool.label}</span>
            </Button>
          ))}
        </div>

        <Separator className="bg-[#1a2332]" />

        {/* Quick Tools */}
        <div className="flex gap-1">
          {quickTools.map((tool, idx) => (
            <Button
              key={idx}
              variant={tool.active ? 'default' : 'ghost'}
              size="sm"
              onClick={tool.toggle}
              title={tool.label}
            >
              <tool.icon className="w-4 h-4" />
            </Button>
          ))}
        </div>

        <Separator className="bg-[#1a2332]" />

        {/* Zoom Controls */}
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" title="Add Text">
            <Type className="w-4 h-4" />
          </Button>
        </div>

        <Separator className="bg-[#1a2332]" />

        {/* Actions */}
        <Button
          variant="destructive"
          size="sm"
          onClick={onClearAll}
          className="flex items-center gap-2"
        >
          <Eraser className="w-4 h-4" />
          Clear All
        </Button>
      </div>
    </Card>
  );
}
