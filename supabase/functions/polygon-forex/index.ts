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
    const { from, to, multiplier, timespan, startDate, endDate } = await req.json();
    
    const apiKey = Deno.env.get('POLYGON_API_KEY');
    if (!apiKey) {
      throw new Error('POLYGON_API_KEY not configured');
    }

    // Default values for EUR/USD hourly data
    const pair = `${from || 'EUR'}/${to || 'USD'}`;
    const mult = multiplier || 1;
    const span = timespan || 'hour';
    
    // Calculate date range - last 30 days by default
    const end = endDate || new Date().toISOString().split('T')[0];
    const startDefault = new Date();
    startDefault.setDate(startDefault.getDate() - 30);
    const start = startDate || startDefault.toISOString().split('T')[0];

    console.log(`Fetching ${pair} data from ${start} to ${end}`);

    const url = `https://api.polygon.io/v2/aggs/ticker/C:${from || 'EUR'}${to || 'USD'}/range/${mult}/${span}/${start}/${end}?adjusted=true&sort=asc&limit=5000&apiKey=${apiKey}`;
    
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
    const candles = (data.results || []).map((bar: any) => ({
      time: Math.floor(bar.t / 1000), // Convert ms to seconds
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v || 0,
    }));

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
