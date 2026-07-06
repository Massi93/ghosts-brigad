//+------------------------------------------------------------------+
//| SR_Scalping.mqh - Support/Resistance & Price Action scalping    |
//|                                                                  |
//| Signal: Price reacts at dynamic S/R levels with PA confirmation |
//| Levels: Pivot points + recent swing highs/lows                  |
//+------------------------------------------------------------------+

struct SRLevels
{
   double pivot;
   double r1, r2, r3;
   double s1, s2, s3;
};

//--- Calculate daily pivot points
SRLevels SR_GetDailyPivots(string symbol)
{
   SRLevels lvl = {0, 0, 0, 0, 0, 0, 0};

   MqlRates rates[];
   if(CopyRates(symbol, PERIOD_D1, 1, 1, rates) <= 0) return lvl;

   double h = rates[0].high;
   double l = rates[0].low;
   double c = rates[0].close;

   lvl.pivot = (h + l + c) / 3.0;
   lvl.r1    = 2.0 * lvl.pivot - l;
   lvl.s1    = 2.0 * lvl.pivot - h;
   lvl.r2    = lvl.pivot + (h - l);
   lvl.s2    = lvl.pivot - (h - l);
   lvl.r3    = h + 2.0 * (lvl.pivot - l);
   lvl.s3    = l - 2.0 * (h - lvl.pivot);

   return lvl;
}

//--- Find recent swing high within lookback bars
double SR_SwingHigh(string symbol, ENUM_TIMEFRAMES tf, int lookback = 20, int leftBars = 3)
{
   double swHigh = 0;
   for(int i = leftBars + 1; i <= lookback; i++)
   {
      double high  = iHigh(symbol, tf, i);
      bool   isHigh = true;
      for(int j = i - leftBars; j <= i + leftBars; j++)
      {
         if(j == i) continue;
         if(j < 0 || j > lookback) continue;
         if(iHigh(symbol, tf, j) >= high) { isHigh = false; break; }
      }
      if(isHigh && high > swHigh) swHigh = high;
   }
   return swHigh;
}

//--- Find recent swing low within lookback bars
double SR_SwingLow(string symbol, ENUM_TIMEFRAMES tf, int lookback = 20, int leftBars = 3)
{
   double swLow = DBL_MAX;
   for(int i = leftBars + 1; i <= lookback; i++)
   {
      double low    = iLow(symbol, tf, i);
      bool   isLow  = true;
      for(int j = i - leftBars; j <= i + leftBars; j++)
      {
         if(j == i) continue;
         if(j < 0 || j > lookback) continue;
         if(iLow(symbol, tf, j) <= low) { isLow = false; break; }
      }
      if(isLow && low < swLow) swLow = low;
   }
   return (swLow == DBL_MAX) ? 0 : swLow;
}

struct SRScalpSignal { int direction; };

SRScalpSignal SRScalping_GetSignal(
   string          symbol,
   ENUM_TIMEFRAMES tf,
   double          zonePips     = 5.0,
   bool            usePivots    = true,
   bool            useSwings    = true,
   int             lookback     = 30,
   int             leftBars     = 3
)
{
   SRScalpSignal sig = {0};

   double point  = SymbolInfoDouble(symbol, SYMBOL_POINT) * 10;
   double zone   = zonePips * point;
   double close  = iClose(symbol, tf, 0);
   double open   = iOpen(symbol,  tf, 0);

   // Collect S/R levels
   double levels[];
   int    count = 0;

   if(usePivots)
   {
      SRLevels piv = SR_GetDailyPivots(symbol);
      ArrayResize(levels, count + 7);
      levels[count++] = piv.pivot;
      levels[count++] = piv.r1; levels[count++] = piv.r2; levels[count++] = piv.r3;
      levels[count++] = piv.s1; levels[count++] = piv.s2; levels[count++] = piv.s3;
   }

   if(useSwings)
   {
      double swH = SR_SwingHigh(symbol, tf, lookback, leftBars);
      double swL = SR_SwingLow(symbol,  tf, lookback, leftBars);
      ArrayResize(levels, count + 2);
      if(swH > 0) levels[count++] = swH;
      if(swL > 0) levels[count++] = swL;
   }

   // Check if price is near any level
   for(int i = 0; i < count; i++)
   {
      double lvl = levels[i];
      if(lvl <= 0) continue;

      // Near support: bullish pin bar or engulfing
      if(MathAbs(close - lvl) <= zone)
      {
         if(close > lvl && close > open) { sig.direction =  1; return sig; }
         if(close < lvl && close < open) { sig.direction = -1; return sig; }
      }
   }

   return sig;
}

//--- Check if price is near a pivot level
bool SR_NearLevel(double price, double level, double zonePips, string symbol)
{
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT) * 10;
   return (MathAbs(price - level) <= zonePips * point);
}
