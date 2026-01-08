import { useEffect, useRef } from 'react';
import { OHLCData } from '@/types/trading';

interface TradingViewChartProps {
  data: OHLCData[];
  symbol?: string;
  theme?: 'light' | 'dark';
}

export function TradingViewChart({ data, symbol = 'EURUSD', theme = 'dark' }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = '';

    // Create widget config
    const widgetConfig = {
      autosize: true,
      symbol: `FX:${symbol.replace('/', '')}`,
      interval: '60',
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1',
      locale: 'en',
      toolbar_bg: '#f1f3f6',
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      container_id: 'tradingview-widget',
      details: true,
      hotlist: true,
      calendar: true,
      studies: [
        'MASimple@tv-basicstudies',
        'RSI@tv-basicstudies',
        'MACD@tv-basicstudies'
      ],
      overrides: {
        'paneProperties.background': theme === 'dark' ? '#050810' : '#ffffff',
        'paneProperties.vertGridProperties.color': theme === 'dark' ? '#1a2332' : '#e0e3eb',
        'paneProperties.horzGridProperties.color': theme === 'dark' ? '#1a2332' : '#e0e3eb',
        'scalesProperties.textColor': theme === 'dark' ? '#6b7a8f' : '#131722',
      }
    };

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify(widgetConfig);
    scriptRef.current = script;

    containerRef.current.appendChild(script);

    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
    };
  }, [symbol, theme]);

  return (
    <div className="w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: '500px' }}
      />
    </div>
  );
}
