import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { from, to, multiplier, timespan, startDate, endDate, assetType } = await req.json();
    
    const apiKey = Deno.env.get('POLYGON_API_KEY');
    if (!apiKey) {
      throw new Error('POLYGON_API_KEY not configured');
    }

    // Default values
    const fromCurrency = from || 'EUR';
    const toCurrency = to || 'USD';
    const pair = `${fromCurrency}/${toCurrency}`;
    const mult = multiplier || 1;
    const span = timespan || 'hour';
    const type = assetType || 'forex'; // 'forex' or 'crypto'
    
    // Calculate date range based on timespan for optimal data retrieval
    const end = endDate || new Date().toISOString().split('T')[0];
    
    // Dynamic date range based on timespan
    const getDaysForTimespan = (ts: string, m: number): number => {
      switch (ts) {
        case 'minute':
          if (m === 1) return 2;      // 1M: last 2 days (~2880 candles)
          if (m === 5) return 7;      // 5M: last 7 days (~2016 candles)
          if (m === 15) return 14;    // 15M: last 14 days (~1344 candles)
          return 7;
        case 'hour':
          if (m === 1) return 7;      // 1H: last 7 days (~168 candles)
          if (m === 4) return 30;     // 4H: last 30 days (~180 candles)
          return 7;
        case 'day':
          return 180;                 // 1D: last 180 days
        case 'week':
          return 730;                 // 1W: last 2 years (~104 candles)
        case 'month':
          return 1825;                // 1MO: last 5 years (~60 candles)
        default:
          return 7;
      }
    };
    
    const daysBack = startDate ? 0 : getDaysForTimespan(span, mult);
    const startDefault = new Date();
    startDefault.setDate(startDefault.getDate() - daysBack);
    const start = startDate || startDefault.toISOString().split('T')[0];

    console.log(`Fetching ${type} ${pair} data from ${start} to ${end} (${span}/${mult})`);

    // Polygon uses different ticker formats:
    // Forex: C:EURUSD
    // Crypto: X:BTCUSD
    const tickerPrefix = type === 'crypto' ? 'X' : 'C';
    const ticker = `${tickerPrefix}:${fromCurrency}${toCurrency}`;
    
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${mult}/${span}/${start}/${end}?adjusted=true&sort=asc&limit=50000&apiKey=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'ERROR') {
      console.error('Polygon API error:', data);

      // Avoid hard-failing the client on Polygon rate limits.
      // Return 200 with an explicit flag so the frontend can gracefully fallback to CSV.
      if (typeof data.error === 'string' && data.error.includes('exceeded the maximum requests per minute')) {
        return new Response(JSON.stringify({
          candles: [],
          pair,
          timespan: span,
          rateLimited: true,
          error: data.error,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error(data.error || 'Polygon API error');
    }

    // Transform results to OHLC format
    let candles = (data.results || []).map((bar: any) => ({
      time: Math.floor(bar.t / 1000), // Convert ms to seconds
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v || 0,
    }));

    // Some Polygon plans return delayed aggregates.
    // Try to augment with a fresh "last quote" and patch/append the latest candle if possible.
    // Note: Different endpoints for forex vs crypto
    try {
      let lastQuoteUrl: string;
      if (type === 'crypto') {
        lastQuoteUrl = `https://api.polygon.io/v1/last/crypto/${fromCurrency}/${toCurrency}?apiKey=${apiKey}`;
      } else {
        lastQuoteUrl = `https://api.polygon.io/v1/last_quote/currencies/${fromCurrency}/${toCurrency}?apiKey=${apiKey}`;
      }
      const lastQuoteRes = await fetch(lastQuoteUrl);
      const lastQuoteData = await lastQuoteRes.json();

      const q = lastQuoteData?.last ?? lastQuoteData?.results ?? lastQuoteData?.result ?? lastQuoteData;
      const rawTs = q?.timestamp ?? q?.t ?? q?.time;
      const rawBid = q?.bid ?? q?.b ?? q?.bp;
      const rawAsk = q?.ask ?? q?.a ?? q?.ap;
      const rawPrice = q?.price ?? q?.p ?? q?.mid ?? q?.m;

      const ts = typeof rawTs === 'number' ? rawTs : null;
      const bid = typeof rawBid === 'number' ? rawBid : null;
      const ask = typeof rawAsk === 'number' ? rawAsk : null;
      const price =
        typeof rawPrice === 'number'
          ? rawPrice
          : bid !== null && ask !== null
            ? (bid + ask) / 2
            : (bid ?? ask);

      if (ts !== null && typeof price === 'number' && Number.isFinite(price)) {
        const tsSec = Math.floor(ts > 1e12 ? ts / 1000 : ts);
        
        // Calculate bucket size for all supported timespans
        const getBucketSeconds = (timespan: string, multiplier: number): number => {
          switch (timespan) {
            case 'minute': return 60 * multiplier;
            case 'hour': return 3600 * multiplier;
            case 'day': return 86400 * multiplier;
            case 'week': return 604800 * multiplier;
            case 'month': return 2592000 * multiplier; // ~30 days
            default: return 3600 * multiplier;
          }
        };
        
        const bucketSeconds = getBucketSeconds(span, mult);
        const candleTime = Math.floor(tsSec / bucketSeconds) * bucketSeconds;

        if (candles.length > 0) {
          const last = candles[candles.length - 1];
          if (last.time === candleTime) {
            last.high = Math.max(last.high, price);
            last.low = Math.min(last.low, price);
            last.close = price;
          } else if (candleTime > last.time) {
            candles = candles.concat([
              {
                time: candleTime,
                open: last.close,
                high: Math.max(last.close, price),
                low: Math.min(last.close, price),
                close: price,
                volume: 0,
              },
            ]);
          }
        } else {
          candles = [
            {
              time: candleTime,
              open: price,
              high: price,
              low: price,
              close: price,
              volume: 0,
            },
          ];
        }
      }
    } catch (_e) {
      // Non-fatal: keep aggregates-only response.
      console.warn('Last quote fetch failed; continuing with aggregates only');
    }

    console.log(`Fetched ${candles.length} candles`);

    return new Response(JSON.stringify({ 
      candles,
      resultsCount: data.resultsCount,
      pair,
      timespan: span,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in polygon-forex function:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
