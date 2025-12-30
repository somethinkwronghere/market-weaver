import { Play, Pause, SkipForward, SkipBack, RotateCcw, FastForward, Radio } from 'lucide-react';
import { PlaybackSpeed } from '@/types/trading';
import { cn } from '@/lib/utils';

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

const speeds: PlaybackSpeed[] = [0.5, 1, 2, 4, 8];

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
  return (
    <div className="bg-[#0a0e17] border-t border-[#1a2332] px-4 py-3">
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
            onClick={onStepBackward}
            className="p-2 rounded hover:bg-[#1a2332] transition-colors"
            disabled={currentIndex <= 0}
            title="Step Back"
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
            onClick={onStepForward}
            className="p-2 rounded hover:bg-[#1a2332] transition-colors"
            title="Step Forward (generates synthetic if at end)"
          >
            <SkipForward className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1">
          <FastForward className="w-3 h-3 text-muted-foreground mr-1" />
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={cn(
                "px-2 py-1 text-xs font-mono rounded transition-colors",
                speed === s 
                  ? isLive ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"
                  : "text-muted-foreground hover:bg-[#1a2332]"
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
