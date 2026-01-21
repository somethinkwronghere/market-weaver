import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlaybackSpeed } from '@/types/trading';
import { Timeframe } from '@/components/TimeframeSelector';

interface FloatingReplayControllerProps {
  isPlaying: boolean;
  speed: PlaybackSpeed;
  progress: number;
  currentIndex: number;
  totalCandles: number;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: (steps?: number) => void;
  onStepBackward: (steps?: number) => void;
  onSeek: (index: number) => void;
  onChartInteractionLock?: (locked: boolean) => void;
}

// Sadece saatlik ve üstü timeframe'ler - Replay adım büyüklükleri
const REPLAY_TIMEFRAMES: Timeframe[] = ['1H', '4H', '1D', '1W'];

// Her timeframe kaç mum atlayacak (1H base olduğu için)
const STEP_SIZES: Record<Timeframe, number> = {
  '1H': 1,    // 1 mum
  '4H': 4,    // 4 mum
  '1D': 24,   // 24 mum (1 gün)
  '1W': 168,  // 168 mum (1 hafta = 7*24)
  '1M': 1,    // unused
  '5M': 1,    // unused
  '15M': 1,   // unused
  '1MO': 1,   // unused
};

const STORAGE_KEY = 'floating-replay-position';
const STEP_SIZE_KEY = 'floating-replay-step-size';

interface Position {
  x: number;
  y: number;
}

export function FloatingReplayController({
  isPlaying,
  speed,
  progress,
  currentIndex,
  totalCandles,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onSeek,
  onChartInteractionLock,
}: FloatingReplayControllerProps) {
  const [position, setPosition] = useState<Position>({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [wasPlayingBeforeDrag, setWasPlayingBeforeDrag] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedStepSize, setSelectedStepSize] = useState<Timeframe>('1H');
  const panelRef = useRef<HTMLDivElement>(null);

  // Load saved position and step size from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPosition(parsed);
      } catch (e) {
        console.warn('Failed to parse saved position');
      }
    }

    const savedStepSize = localStorage.getItem(STEP_SIZE_KEY);
    if (savedStepSize && REPLAY_TIMEFRAMES.includes(savedStepSize as Timeframe)) {
      setSelectedStepSize(savedStepSize as Timeframe);
    }
  }, []);

  // Save position to localStorage
  const savePosition = useCallback((pos: Position) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  }, []);

  // Clamp position to viewport with snapping
  const clampPosition = useCallback((x: number, y: number): Position => {
    const panel = panelRef.current;
    if (!panel) return { x, y };

    const rect = panel.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 20;
    const maxY = window.innerHeight - rect.height - 20;

    let clampedX = Math.max(20, Math.min(x, maxX));
    let clampedY = Math.max(20, Math.min(y, maxY));

    // Snap to edges (30px threshold)
    const snapThreshold = 30;
    if (clampedX < snapThreshold + 20) clampedX = 20;
    if (clampedX > maxX - snapThreshold) clampedX = maxX;
    if (clampedY < snapThreshold + 20) clampedY = 20;
    if (clampedY > maxY - snapThreshold) clampedY = maxY;

    return { x: clampedX, y: clampedY };
  }, []);

  // Handle drag start
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only start drag from grip handle area
      const target = e.target as HTMLElement;
      if (!target.closest('[data-drag-handle]')) return;

      e.preventDefault();
      e.stopPropagation();

      const panel = panelRef.current;
      if (!panel) return;

      const rect = panel.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });

      setIsDragging(true);
      setWasPlayingBeforeDrag(isPlaying);

      // Pause replay during drag
      if (isPlaying) {
        onPause();
      }

      // Lock chart interaction
      onChartInteractionLock?.(true);

      // Capture pointer
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isPlaying, onPause, onChartInteractionLock]
  );

  // Handle drag move
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      const clamped = clampPosition(newX, newY);
      setPosition(clamped);
    },
    [isDragging, dragOffset, clampPosition]
  );

  // Handle drag end
  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;

      setIsDragging(false);

      // Release pointer capture
      const target = e.target as HTMLElement;
      if (target.releasePointerCapture) {
        target.releasePointerCapture((e as PointerEvent & { pointerId: number }).pointerId);
      }

      // Save final position
      savePosition(position);

      // Unlock chart interaction
      onChartInteractionLock?.(false);

      // Resume playback if it was playing before drag
      if (wasPlayingBeforeDrag) {
        onPlay();
      }
    },
    [isDragging, position, wasPlayingBeforeDrag, onPlay, onChartInteractionLock, savePosition]
  );

  // Attach global pointer event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);

      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const stepSize = STEP_SIZES[selectedStepSize];

      switch (e.key) {
        case ' ':
          e.preventDefault();
          isPlaying ? onPause() : onPlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onStepBackward(stepSize);
          break;
        case 'ArrowRight':
          e.preventDefault();
          onStepForward(stepSize);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, onPlay, onPause, onStepBackward, onStepForward, selectedStepSize]);

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed bg-[#0a0e17]/95 backdrop-blur-md border border-[#1a2332] rounded-lg shadow-2xl',
        'transition-shadow duration-100',
        isDragging ? 'shadow-blue-500/40 z-[100]' : 'shadow-black/50 z-50'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default',
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        transition: isDragging ? 'none' : 'transform 100ms ease-out',
        willChange: isDragging ? 'transform, left, top' : 'auto',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
    >
      <div className="flex items-stretch">
        {/* Drag Handle */}
        <div
          data-drag-handle
          className={cn(
            'flex items-center justify-center px-2 border-r border-[#1a2332]',
            'cursor-grab active:cursor-grabbing transition-all duration-75',
            'hover:bg-blue-500/10 hover:border-blue-500/30',
            isDragging && 'bg-blue-500/20'
          )}
          title="Sürükle (Grip)"
        >
          <GripVertical className={cn(
            'w-4 h-4 transition-colors duration-75',
            isDragging ? 'text-blue-400' : 'text-muted-foreground'
          )} />
        </div>

        {/* Controls Container */}
        <div className="flex items-center gap-3 px-4 py-2">
          {/* Step Backward */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStepBackward(STEP_SIZES[selectedStepSize]);
            }}
            disabled={currentIndex <= 0}
            className={cn(
              'p-1.5 rounded hover:bg-[#1a2332] transition-colors',
              currentIndex <= 0 && 'opacity-30 cursor-not-allowed'
            )}
            title={`Geri ${STEP_SIZES[selectedStepSize]} mum (←)`}
          >
            <SkipBack className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              isPlaying ? onPause() : onPlay();
            }}
            className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-all"
            title={isPlaying ? 'Duraklat (Space)' : `Oynat (${STEP_SIZES[selectedStepSize]} mum/adım)`}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 text-white" />
            ) : (
              <Play className="w-3.5 h-3.5 text-white ml-0.5" />
            )}
          </button>

          {/* Step Forward */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStepForward(STEP_SIZES[selectedStepSize]);
            }}
            className="p-1.5 rounded hover:bg-[#1a2332] transition-colors"
            title={`İleri ${STEP_SIZES[selectedStepSize]} mum (→)`}
          >
            <SkipForward className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-[#1a2332]" />

          {/* Slider Scrubber */}
          <div className="w-32">
            <div className="relative h-1 bg-[#1a2332] rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  transition: isPlaying ? 'width 50ms linear' : 'none'
                }}
              />
              <input
                type="range"
                min={0}
                max={totalCandles - 1}
                value={Math.min(currentIndex, totalCandles - 1)}
                onChange={(e) => {
                  e.stopPropagation();
                  onSeek(parseInt(e.target.value));
                }}
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title={`${currentIndex + 1} / ${totalCandles}`}
              />
            </div>
            <div className="text-[9px] font-mono text-muted-foreground text-center mt-0.5">
              {currentIndex + 1} / {totalCandles}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-[#1a2332]" />

          {/* Step Size Selector */}
          <div className="flex items-center gap-1">
            {REPLAY_TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStepSize(tf);
                  localStorage.setItem(STEP_SIZE_KEY, tf);
                }}
                className={cn(
                  'px-2 py-1 text-[10px] font-medium rounded transition-colors',
                  selectedStepSize === tf
                    ? 'bg-blue-500 text-white'
                    : 'text-muted-foreground hover:bg-[#1a2332]'
                )}
                title={`Adım: ${STEP_SIZES[tf]} mum (${tf})`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
