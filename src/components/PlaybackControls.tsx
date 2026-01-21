import { Play, Pause, SkipForward, SkipBack, RotateCcw, Clock, GripVertical } from 'lucide-react';
import { PlaybackSpeed } from '@/types/trading';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  speed: PlaybackSpeed;
  progress: number;
  currentIndex: number;
  totalCandles: number;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onSeek: (index: number) => void;
  isLive?: boolean;
}

type TimeJump = '1h' | '2h' | '4h' | '5h' | '10h' | '12h' | '16h' | '1d' | '2d' | '3d' | '4d' | '5d' | '6d' | '1w';

const timeJumps: TimeJump[] = ['1h', '2h', '4h', '5h', '10h', '12h', '16h', '1d', '2d', '3d', '4d', '5d', '6d', '1w'];

export function PlaybackControls({
  isPlaying,
  speed,
  progress,
  currentIndex,
  totalCandles,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onReset,
  onSpeedChange,
  onSeek,
  isLive = false,
}: PlaybackControlsProps) {
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedJump, setSelectedJump] = useState<TimeJump>('1h');
  const controlsRef = useRef<HTMLDivElement>(null);

  // Convert time jump to number of candles
  const getJumpCandles = (jump: TimeJump): number => {
    const value = parseInt(jump);
    if (jump.endsWith('h')) return value;
    if (jump.endsWith('d')) return value * 24;
    if (jump.endsWith('w')) return value * 24 * 7;
    return 1;
  };

  const handleJumpForward = () => {
    const jumpAmount = getJumpCandles(selectedJump);
    onSeek(Math.min(currentIndex + jumpAmount, totalCandles - 1));
  };

  const handleJumpBackward = () => {
    const jumpAmount = getJumpCandles(selectedJump);
    onSeek(Math.max(currentIndex - jumpAmount, 0));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (controlsRef.current) {
      const rect = controlsRef.current.getBoundingClientRect();
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  return (
    <div
      ref={controlsRef}
      className="fixed bg-[#0a0e17]/95 backdrop-blur-sm border border-[#1a2332] rounded-lg shadow-2xl px-4 py-3 z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="pl-6">
      <div className="flex items-center gap-6">
        {/* Progress Bar */}
        <div className="flex-1">
          <div className="relative h-1.5 bg-[#1a2332] rounded-full overflow-hidden cursor-pointer group">
            <div 
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all duration-100",
                isLive ? "bg-emerald-500" : "bg-blue-500"
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
            <input
              type="range"
              min={0}
              max={totalCandles - 1}
              value={Math.min(currentIndex, totalCandles - 1)}
              onChange={(e) => onSeek(parseInt(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-mono text-muted-foreground">
              {currentIndex + 1} / {totalCandles}{isLive ? '+' : ''}
            </span>
            <span className={cn(
              "text-[10px] font-mono",
              isLive ? "text-emerald-400" : "text-muted-foreground"
            )}>
              {isLive ? '∞ LIVE' : `${progress.toFixed(0)}%`}
            </span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onReset}
            className="p-2 rounded hover:bg-[#1a2332] transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={handleJumpBackward}
            className="p-2 rounded hover:bg-[#1a2332] transition-colors"
            disabled={currentIndex <= 0}
            title={`${selectedJump} Geri`}
          >
            <SkipBack className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={isPlaying ? onPause : onPlay}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              isLive && isPlaying
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "bg-blue-500 hover:bg-blue-600"
            )}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white ml-0.5" />
            )}
          </button>

          <button
            onClick={handleJumpForward}
            className="p-2 rounded hover:bg-[#1a2332] transition-colors"
            title={`${selectedJump} İleri`}
          >
            <SkipForward className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Time Jump Selector */}
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-muted-foreground mr-1" />
          <select
            value={selectedJump}
            onChange={(e) => setSelectedJump(e.target.value as TimeJump)}
            className="px-2 py-1 text-xs font-mono rounded bg-[#0f1521] border border-[#1a2332] text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {timeJumps.map((jump) => (
              <option key={jump} value={jump}>
                {jump}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-muted-foreground ml-1">
            ({getJumpCandles(selectedJump)} mum)
          </span>
        </div>
      </div>
      </div>
    </div>
  );
}
