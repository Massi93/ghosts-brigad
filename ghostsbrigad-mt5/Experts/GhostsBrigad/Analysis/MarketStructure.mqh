//+------------------------------------------------------------------+
//| MarketStructure.mqh - Swing engine + classical analysis methods  |
//|                                                                  |
//| One shared swing-point engine feeding several methods:          |
//|   - Dow Theory      : trend from HH/HL vs LH/LL structure       |
//|   - Price Action    : pin bar, engulfing, inside-bar breakout   |
//|   - Fibonacci       : retracement of the last impulse leg,      |
//|                       golden-zone (50-61.8%) entries            |
//|   - Wyckoff         : spring / upthrust out of a trading range  |
//|   - Elliott (simpl.): impulse-wave context from swing sequence  |
//|   - Gann (simpl.)    : 1x1 angle line from the last major swing |
//| Every method returns a score in [-100, +100]:                   |
//| +100 = strongly bullish, -100 = strongly bearish, 0 = neutral.  |
//+------------------------------------------------------------------+

#define MS_MAX_SWINGS 12

struct SwingPoint { double price; int bar; bool isHigh; };

//--- Detect the most recent swing points (fractal 2-2, completed bars)
//    Fills newest-first. Returns count found.
int MS_FindSwings(string symbol, ENUM_TIMEFRAMES tf,
                  SwingPoint &swings[], int lookback = 120)
{
   ArrayResize(swings, 0);
   for(int i = 3; i < lookback && ArraySize(swings) < MS_MAX_SWINGS; i++)
   {
      double h = iHigh(symbol, tf, i);
      double l = iLow(symbol, tf, i);
      bool isSwingHigh = h > iHigh(symbol, tf, i-1) && h > iHigh(symbol, tf, i-2)
                      && h > iHigh(symbol, tf, i+1) && h > iHigh(symbol, tf, i+2);
      bool isSwingLow  = l < iLow(symbol, tf, i-1) && l < iLow(symbol, tf, i-2)
                      && l < iLow(symbol, tf, i+1) && l < iLow(symbol, tf, i+2);
      if(!isSwingHigh && !isSwingLow) continue;

      int n = ArraySize(swings);
      // keep alternation: skip same-type swing unless more extreme
      if(n > 0 && swings[n-1].isHigh == isSwingHigh) continue;
      ArrayResize(swings, n + 1);
      swings[n].price  = isSwingHigh ? h : l;
      swings[n].bar    = i;
      swings[n].isHigh = isSwingHigh;
   }
   return ArraySize(swings);
}

//==================================================================
//  DOW THEORY - trend from market structure
//==================================================================
double MS_DowScore(const SwingPoint &swings[])
{
   // need 2 highs + 2 lows
   double h1=0, h2=0, l1=0, l2=0; int nh=0, nl=0;
   for(int i = 0; i < ArraySize(swings); i++)
   {
      if(swings[i].isHigh) { if(nh==0) h1=swings[i].price; else if(nh==1) h2=swings[i].price; nh++; }
      else                 { if(nl==0) l1=swings[i].price; else if(nl==1) l2=swings[i].price; nl++; }
      if(nh >= 2 && nl >= 2) break;
   }
   if(nh < 2 || nl < 2) return 0;

   bool hh = h1 > h2, hl = l1 > l2;   // higher high / higher low
   bool ll = l1 < l2, lh = h1 < h2;   // lower low / lower high
   if(hh && hl) return  80;  // confirmed uptrend
   if(ll && lh) return -80;  // confirmed downtrend
   if(hh || hl) return  30;  // partial bullish structure
   if(ll || lh) return -30;
   return 0;
}

//==================================================================
//  PRICE ACTION - candle signals on the last closed bar
//==================================================================
double MS_PriceActionScore(string symbol, ENUM_TIMEFRAMES tf)
{
   double o1=iOpen(symbol,tf,1), c1=iClose(symbol,tf,1);
   double h1=iHigh(symbol,tf,1), l1=iLow(symbol,tf,1);
   double o2=iOpen(symbol,tf,2), c2=iClose(symbol,tf,2);
   double h2=iHigh(symbol,tf,2), l2=iLow(symbol,tf,2);

   double range1 = h1 - l1;
   if(range1 <= 0) return 0;
   double body1  = MathAbs(c1 - o1);
   double upperW = h1 - MathMax(o1, c1);
   double lowerW = MathMin(o1, c1) - l1;
   double score  = 0;

   // Pin bar: dominant wick rejecting a level
   if(lowerW >= 2.0*body1 && lowerW >= 0.6*range1) score += 50;  // bullish pin
   if(upperW >= 2.0*body1 && upperW >= 0.6*range1) score -= 50;  // bearish pin

   // Engulfing: body engulfs previous body, opposite colours
   if(c1 > o1 && c2 < o2 && c1 >= o2 && o1 <= c2) score += 40;
   if(c1 < o1 && c2 > o2 && c1 <= o2 && o1 >= c2) score -= 40;

   // Inside-bar breakout: bar1 inside bar2 -> bias from bar1 close side
   if(h1 < h2 && l1 > l2) score += (c1 > (h2+l2)/2 ? 15 : -15);

   return MathMax(-100, MathMin(100, score));
}

//==================================================================
//  FIBONACCI - retracement of the last impulse leg
//==================================================================
double MS_FibonacciScore(string symbol, ENUM_TIMEFRAMES tf,
                         const SwingPoint &swings[])
{
   if(ArraySize(swings) < 2) return 0;
   double from = swings[1].price, to = swings[0].price;
   double leg  = to - from;
   if(MathAbs(leg) <= 0) return 0;

   double price = iClose(symbol, tf, 1);
   // how far price retraced the leg (0 = no retrace, 1 = full)
   double retr = (to - price) / leg;

   if(retr < 0.15 || retr > 0.886) return 0;   // no setup / leg invalidated
   bool up = leg > 0;                          // impulse was bullish
   double s = 0;
   if(retr >= 0.50 && retr <= 0.65)      s = 70;  // golden zone
   else if(retr >= 0.35 && retr < 0.50)  s = 40;  // 38.2% zone
   else if(retr >  0.65 && retr <= 0.79) s = 25;  // deep but valid
   else                                  s = 10;
   return up ? s : -s;   // buy the dip of an up-leg, sell the pullback of a down-leg
}

//==================================================================
//  WYCKOFF - spring / upthrust out of a trading range
//==================================================================
double MS_WyckoffScore(string symbol, ENUM_TIMEFRAMES tf, int rangeBars = 30)
{
   // Range boundaries over rangeBars, excluding the last 2 bars
   double hi = -DBL_MAX, lo = DBL_MAX;
   for(int i = 3; i < rangeBars + 3; i++)
   {
      hi = MathMax(hi, iHigh(symbol, tf, i));
      lo = MathMin(lo, iLow(symbol, tf, i));
   }
   double atr = ATR(symbol, tf, 14);
   if(atr <= 0 || hi - lo > 8.0 * atr) return 0;   // not a compression range

   long volNow  = iTickVolume(symbol, tf, 1);
   long volAvg  = 0;
   for(int i = 2; i < 22; i++) volAvg += iTickVolume(symbol, tf, i);
   volAvg /= 20;
   bool volSpike = (volNow > volAvg * 3 / 2);

   double l1 = iLow(symbol, tf, 1),  h1 = iHigh(symbol, tf, 1);
   double c1 = iClose(symbol, tf, 1);

   // Spring: dip below range low, close back inside (with volume = stronger)
   if(l1 < lo && c1 > lo)  return volSpike ? 85 : 55;
   // Upthrust: poke above range high, close back inside
   if(h1 > hi && c1 < hi)  return volSpike ? -85 : -55;
   return 0;
}

//==================================================================
//  ELLIOTT WAVE (simplified, experimental)
//==================================================================
//  Impulse context: 3 successively higher swing highs with shallow
//  (<61.8%) retracements suggests waves 3/5 of an up impulse.
//  NOTE: real Elliott counting is subjective; this is only a
//  structural approximation. Off by default in the EA.
double MS_ElliottScore(const SwingPoint &swings[])
{
   if(ArraySize(swings) < 6) return 0;
   double hs[3]; double ls[3]; int nh=0, nl=0;
   for(int i = 0; i < ArraySize(swings) && (nh < 3 || nl < 3); i++)
   {
      if(swings[i].isHigh && nh < 3) hs[nh++] = swings[i].price;
      if(!swings[i].isHigh && nl < 3) ls[nl++] = swings[i].price;
   }
   if(nh < 3 || nl < 3) return 0;

   bool upImpulse   = hs[0] > hs[1] && hs[1] > hs[2] && ls[0] > ls[1];
   bool downImpulse = ls[0] < ls[1] && ls[1] < ls[2] && hs[0] < hs[1];
   if(upImpulse)
   {
      // wave overlap rule: last retrace must hold above prior swing low
      double retr = (hs[0] - ls[0]) / MathMax(1e-10, hs[0] - hs[1] + (hs[1] - ls[1]));
      return (retr < 0.65) ? 45 : 15;
   }
   if(downImpulse) return -45;
   return 0;
}

//==================================================================
//  GANN (simplified, experimental) - 1x1 angle from last major swing
//==================================================================
//  Rising 1x1: swing low + 1 ATR per bar. Price above the line keeps
//  bullish "time/price balance"; below it, bearish. Off by default.
double MS_GannScore(string symbol, ENUM_TIMEFRAMES tf,
                    const SwingPoint &swings[])
{
   if(ArraySize(swings) < 1) return 0;
   double atr = ATR(symbol, tf, 14);
   if(atr <= 0) return 0;

   // last swing low and last swing high anchors
   for(int i = 0; i < ArraySize(swings); i++)
   {
      double line = swings[i].isHigh
         ? swings[i].price - atr * swings[i].bar    // falling 1x1 from high
         : swings[i].price + atr * swings[i].bar;   // rising 1x1 from low
      double price = iClose(symbol, tf, 1);
      if(!swings[i].isHigh) return (price > line) ? 30 : -30;
      return (price < line) ? -30 : 30;
   }
   return 0;
}
