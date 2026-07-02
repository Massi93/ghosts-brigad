//+------------------------------------------------------------------+
//| SMC.mqh - Smart Money Concepts                                   |
//|                                                                  |
//|   - BOS / CHoCH      : break of structure vs change of character|
//|   - Fair Value Gaps  : 3-bar imbalances the market tends to fill|
//|   - Order Blocks     : last opposite candle before displacement  |
//|   - Liquidity sweeps : stop hunts beyond swing highs/lows that   |
//|                        close back inside (reversal signature)    |
//| Score in [-100, +100].                                           |
//+------------------------------------------------------------------+
#pragma once

//--- Break of Structure: close beyond the most recent swing high/low.
//    Same direction as prior trend = BOS (continuation);
//    against it = CHoCH (potential reversal). Both are directional.
double SMC_StructureBreakScore(string symbol, ENUM_TIMEFRAMES tf,
                               const SwingPoint &swings[])
{
   if(ArraySize(swings) < 2) return 0;
   double c1 = iClose(symbol, tf, 1);
   for(int i = 0; i < ArraySize(swings); i++)
   {
      if(swings[i].isHigh && c1 > swings[i].price) return  60; // bullish break
      if(!swings[i].isHigh && c1 < swings[i].price) return -60; // bearish break
      if(i >= 1) break;   // only the freshest swing of each side matters
   }
   return 0;
}

//--- Fair Value Gap: bullish FVG when low[i] > high[i+2] (gap up).
//    Price trading back inside a recent FVG = entry zone in the gap's
//    direction. Scan the last `scan` bars.
double SMC_FVGScore(string symbol, ENUM_TIMEFRAMES tf, int scan = 20)
{
   double price = iClose(symbol, tf, 1);
   for(int i = 2; i < scan; i++)
   {
      double gapLo = iHigh(symbol, tf, i + 2);
      double gapHi = iLow(symbol, tf, i);
      if(gapHi > gapLo) // bullish FVG (gap up)
      {
         if(price >= gapLo && price <= gapHi) return 50;   // in the discount zone
      }
      double gapLo2 = iHigh(symbol, tf, i);
      double gapHi2 = iLow(symbol, tf, i + 2);
      if(gapLo2 < gapHi2) // bearish FVG (gap down)
      {
         if(price >= gapLo2 && price <= gapHi2) return -50; // in the premium zone
      }
   }
   return 0;
}

//--- Order Block: the last opposite candle before a displacement move
//    (body > dispMult x ATR). Price returning into that candle's range
//    is an institutional entry zone.
double SMC_OrderBlockScore(string symbol, ENUM_TIMEFRAMES tf,
                           int scan = 30, double dispMult = 1.5)
{
   double atr = ATR(symbol, tf, 14);
   if(atr <= 0) return 0;
   double price = iClose(symbol, tf, 1);

   for(int i = 2; i < scan; i++)
   {
      double body = iClose(symbol, tf, i) - iOpen(symbol, tf, i);
      if(MathAbs(body) < dispMult * atr) continue;

      // candle i is the displacement; candle i+1 is the order block
      double obHi = iHigh(symbol, tf, i + 1);
      double obLo = iLow(symbol, tf, i + 1);
      bool obIsBull = body > 0 && iClose(symbol, tf, i+1) < iOpen(symbol, tf, i+1);
      bool obIsBear = body < 0 && iClose(symbol, tf, i+1) > iOpen(symbol, tf, i+1);

      if(obIsBull && price >= obLo && price <= obHi) return  55;
      if(obIsBear && price >= obLo && price <= obHi) return -55;
   }
   return 0;
}

//--- Liquidity sweep (stop hunt): last closed bar pierces a prior
//    swing extreme then closes back beyond it -> smart money grabbed
//    the resting stops; expect the opposite move.
double SMC_LiquiditySweepScore(string symbol, ENUM_TIMEFRAMES tf,
                               const SwingPoint &swings[])
{
   if(ArraySize(swings) < 1) return 0;
   double h1 = iHigh(symbol, tf, 1), l1 = iLow(symbol, tf, 1);
   double c1 = iClose(symbol, tf, 1);

   for(int i = 0; i < ArraySize(swings) && i < 4; i++)
   {
      if(swings[i].isHigh && h1 > swings[i].price && c1 < swings[i].price)
         return -65;   // buy-side liquidity swept -> bearish
      if(!swings[i].isHigh && l1 < swings[i].price && c1 > swings[i].price)
         return  65;   // sell-side liquidity swept -> bullish
   }
   return 0;
}

//--- Aggregate SMC view (average of the non-zero components)
double SMC_Score(string symbol, ENUM_TIMEFRAMES tf, const SwingPoint &swings[])
{
   double parts[4];
   parts[0] = SMC_StructureBreakScore(symbol, tf, swings);
   parts[1] = SMC_FVGScore(symbol, tf);
   parts[2] = SMC_OrderBlockScore(symbol, tf);
   parts[3] = SMC_LiquiditySweepScore(symbol, tf, swings);

   double sum = 0; int n = 0;
   for(int i = 0; i < 4; i++)
      if(parts[i] != 0) { sum += parts[i]; n++; }
   return (n > 0) ? sum / n : 0;
}
