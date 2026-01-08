export type ChartType = 'lightweight' | 'tradingview';

export interface ChartConfig {
  type: ChartType;
  showVolume: boolean;
  showCrosshair: boolean;
  enableDrawing: boolean;
}

export interface IndicatorConfig {
  id: string;
  name: string;
  type: 'overlay' | 'separate';
  params: Record<string, number | string>;
  enabled: boolean;
  color?: string;
}
