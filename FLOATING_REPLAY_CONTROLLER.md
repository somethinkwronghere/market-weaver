# Floating Replay Controller

FXReplay tarzı sürüklenebilir replay kontrol paneli. Bu bileşen, grafik üzerinde serbest konumlandırılabilen ve replay akışını kontrol eden bir overlay sağlar.

## Özellikler

### 🎯 Temel İşlevler

- **Drag & Drop**: Sol taraftaki grip (tutma noktası) ile paneli sürükleyip istediğiniz yere yerleştirin
- **Play/Pause**: Replay akışını başlatın/durdurun (Space tuşu)
- **Step Forward/Backward**: Tek tek mum ileri/geri gidin (← → ok tuşları)
- **Slider Scrubber**: Replay pozisyonunu hızlıca değiştirin
- **Timeframe Seçici**: Sadece saatlik ve üstü (1H, 4H, 1D, 1W) zaman dilimlerini değiştirin

### 🎨 Kullanıcı Deneyimi

- **Chart Interaction Lock**: Panel sürüklenirken:
  - Replay otomatik duraklıyor
  - Chart etkileşimi kilitleniyor (pan/zoom devre dışı)
  - Drag bitince eski durumuna dönüyor (playing ise devam ediyor)

- **Position Persistence**: Panel konumu localStorage'a kaydediliyor
  - Sayfa yenilendiğinde son konumda açılıyor

- **Edge Snapping**: Panel kenarlardan 30px yakına gelince otomatik yapışıyor

- **Visual Feedback**:
  - Drag sırasında panel biraz büyüyor (scale: 1.02)
  - Grip hover/active durumlarında renk değişiyor
  - Mavi glow efekti drag sırasında aktif

### ⌨️ Klavye Kısayolları

| Tuş | Aksiyon |
|-----|---------|
| `Space` | Play/Pause |
| `←` | Önceki mum |
| `→` | Sonraki mum |

## Kullanım

### ChartPage'e Entegrasyon

```tsx
import { FloatingReplayController } from '@/components/FloatingReplayController';

// State
const [isChartInteractionLocked, setIsChartInteractionLocked] = useState(false);

// Chart container'ı kilit state ile sarmalayın
<div
  className="w-full h-full"
  style={{
    pointerEvents: isChartInteractionLocked ? 'none' : 'auto'
  }}
>
  {renderChart()}
</div>

// Floating controller'ı ekleyin
<FloatingReplayController
  isPlaying={isPlaying}
  speed={speed}
  progress={progress}
  currentIndex={currentIndex}
  totalCandles={totalCandles}
  onPlay={play}
  onPause={pause}
  onStepForward={stepForward}
  onStepBackward={stepBackward}
  onSeek={jumpTo}
  currentTimeframe={timeframe}
  onTimeframeChange={handleTimeframeChange}
  onChartInteractionLock={setIsChartInteractionLocked}
/>
```

## Teknik Detaylar

### Drag Mekanizması

1. **pointerdown** → Drag başlar
   - Sadece `[data-drag-handle]` elementi tetikler
   - `wasPlaying` state'i saklanır
   - Replay pause edilir
   - Chart input kilitlenir
   - Pointer capture başlatılır

2. **pointermove** → Panel sürüklenir
   - `requestAnimationFrame` ile throttle
   - Viewport clamp (ekrandan taşmaz)
   - Edge snap (30px threshold)

3. **pointerup** → Drag biter
   - Pointer capture serbest bırakılır
   - Pozisyon localStorage'a yazılır
   - Chart input kilidi kaldırılır
   - `wasPlaying` true ise replay devam eder

### Z-Index Yönetimi

- Normal: `z-50`
- Drag sırasında: `z-100` (her zaman en üstte)

### Performance Optimizasyonu

- Drag sırasında `requestAnimationFrame` kullanımı
- Cleanup ile memory leak önleme
- Event delegation ile minimal listener

## Stil Özellikleri

- **Background**: `bg-[#0a0e17]/95` (yarı saydam dark)
- **Backdrop Blur**: `backdrop-blur-md` (bulanık arka plan)
- **Border**: `border-[#1a2332]` (subtle border)
- **Shadow**: Drag durumuna göre değişken gölge
- **Rounded**: `rounded-lg` (8px border radius)

## Gelecek İyileştirmeler

- [ ] Minimize/maximize butonu
- [ ] Custom hotkey ayarları
- [ ] Farklı tema renkleri
- [ ] Panel boyutu özelleştirmesi
- [ ] Çoklu preset pozisyonlar (köşelere hızlı taşıma)
