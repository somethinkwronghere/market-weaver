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
    
    // Calculate date range - last 30 days by default
    const end = endDate || new Date().toISOString().split('T')[0];
    const startDefault = new Date();
    startDefault.setDate(startDefault.getDate() - 30);
    const start = startDate || startDefault.toISOString().split('T')[0];

    console.log(`Fetching ${type} ${pair} data from ${start} to ${end}`);

    // Polygon uses different ticker formats:
    // Forex: C:EURUSD
    // Crypto: X:BTCUSD
    const tickerPrefix = type === 'crypto' ? 'X' : 'C';
    const ticker = `${tickerPrefix}:${fromCurrency}${toCurrency}`;
    
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${mult}/${span}/${start}/${end}?adjusted=true&sort=asc&limit=5000&apiKey=${apiKey}`;
    
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
        const bucketSeconds = span === 'day' ? 86400 * mult : span === 'hour' ? 3600 * mult : 1;
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
