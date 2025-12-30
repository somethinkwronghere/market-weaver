export interface DrawingLine {
  id: string;
  type: 'trendline' | 'horizontal' | 'fibonacci' | 'support' | 'resistance';
  price1: number;
  time1: number;
  price2?: number;
  time2?: number;
  color: string;
  fibLevels?: number[]; // For fibonacci
}
