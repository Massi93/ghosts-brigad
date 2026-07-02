//+------------------------------------------------------------------+
//| VolumeAnalysis.mqh - VWAP, Volume Profile, Order Flow (delta)    |
//|                                                                  |
//|   - VWAP          : session volume-weighted average price with   |
//|                     deviation bands. Above = bullish control,    |
//|                     stretched >2 sigma = overextension warning.  |
//|   - Volume Profile: histogram of traded (tick) volume by price   |
//|                     over a rolling window -> POC + value area.   |
//|   - Order Flow    : per-bar buy/sell pressure approximated from  |
//|                     tick volume x close position in range, and   |
//|                     cumulative-delta divergence vs price.        |
//|                     (True order flow needs the DOM, which CFD    |
//|                     brokers do not provide - this is the best    |
//|                     available approximation.)                    |
//| Score in [-100, +100].                                           |
//+------------------------------------------------------------------+
#pragma once

//==================================================================
//  VWAP (session, from day start, tick-volume weighted)
//==================================================================
bool VA_SessionVWAP(string symbol, ENUM_TIMEFRAMES tf,
                    double &vwap, double &sigma)
{
   MqlDateTime dt; TimeToStruct(iTime(symbol, tf, 1), dt);
   dt.hour = 0; dt.min = 0; dt.sec = 0;
   datetime dayStart = StructToTime(dt);

   double sumPV = 0, sumV = 0, sumP2V = 0;
   for(int i = 1; i < 600; i++)
   {
      if(iTime(symbol, tf, i) < dayStart) break;
      double tp = (iHigh(symbol,tf,i) + iLow(symbol,tf,i) + iClose(symbol,tf,i)) / 3.0;
      double v  = (double)iTickVolume(symbol, tf, i);
      sumPV  += tp * v;
      sumP2V += tp * tp * v;
      sumV   += v;
   }
   if(sumV <= 0) return false;
   vwap  = sumPV / sumV;
   double var = sumP2V / sumV - vwap * vwap;
   sigma = (var > 0) ? MathSqrt(var) : 0;
   return true;
}

double VA_VWAPScore(string symbol, ENUM_TIMEFRAMES tf)
{
   double vwap, sigma;
   if(!VA_SessionVWAP(symbol, tf, vwap, sigma) || sigma <= 0) return 0;

   double z = (iClose(symbol, tf, 1) - vwap) / sigma;
   // trend bias inside +-2 sigma, mean-reversion warning beyond
   if(z >  2.5) return -25;         // overextended above -> fade risk
   if(z < -2.5) return  25;
   if(z >  0.3) return  MathMin(60, z * 30);
   if(z < -0.3) return  MathMax(-60, z * 30);
   return 0;
}

//==================================================================
//  VOLUME PROFILE (rolling window, tick volume by price bucket)
//==================================================================
#define VP_ROWS 24

bool VA_VolumeProfile(string symbol, ENUM_TIMEFRAMES tf, int bars,
                      double &poc, double &vah, double &val)
{
   double hi = -DBL_MAX, lo = DBL_MAX;
   for(int i = 1; i <= bars; i++)
   {
      hi = MathMax(hi, iHigh(symbol, tf, i));
      lo = MathMin(lo, iLow(symbol, tf, i));
   }
   if(hi <= lo) return false;
   double bucket = (hi - lo) / VP_ROWS;

   double vol[VP_ROWS];
   ArrayInitialize(vol, 0);
   for(int i = 1; i <= bars; i++)
   {
      double bh = iHigh(symbol,tf,i), bl = iLow(symbol,tf,i);
      double v  = (double)iTickVolume(symbol, tf, i);
      int rFrom = (int)MathFloor((bl - lo) / bucket);
      int rTo   = (int)MathFloor((bh - lo) / bucket);
      rFrom = MathMax(0, MathMin(VP_ROWS-1, rFrom));
      rTo   = MathMax(0, MathMin(VP_ROWS-1, rTo));
      double share = v / (rTo - rFrom + 1);
      for(int r = rFrom; r <= rTo; r++) vol[r] += share;
   }

   // POC = highest-volume bucket
   int pocRow = 0;
   double total = 0;
   for(int r = 0; r < VP_ROWS; r++)
   {
      total += vol[r];
      if(vol[r] > vol[pocRow]) pocRow = r;
   }
   poc = lo + (pocRow + 0.5) * bucket;

   // Value area = 70% of volume expanding from POC
   double acc = vol[pocRow];
   int up = pocRow, dn = pocRow;
   while(acc < 0.70 * total && (up < VP_ROWS-1 || dn > 0))
   {
      double nextUp = (up < VP_ROWS-1) ? vol[up+1] : -1;
      double nextDn = (dn > 0)         ? vol[dn-1] : -1;
      if(nextUp >= nextDn) { up++; acc += MathMax(0, nextUp); }
      else                 { dn--; acc += MathMax(0, nextDn); }
   }
   vah = lo + (up + 1.0) * bucket;
   val = lo + (double)dn * bucket;
   return true;
}

double VA_VolumeProfileScore(string symbol, ENUM_TIMEFRAMES tf, int bars = 96)
{
   double poc, vah, val;
   if(!VA_VolumeProfile(symbol, tf, bars, poc, vah, val)) return 0;
   double price = iClose(symbol, tf, 1);

   // acceptance above/below value = direction; inside value = rotation
   if(price > vah) return  50;   // accepted above value area
   if(price < val) return -50;   // accepted below value area
   if(price > poc) return  15;
   if(price < poc) return -15;
   return 0;
}

//==================================================================
//  ORDER FLOW (delta approximation from tick volume)
//==================================================================
//--- Per-bar delta: tick volume signed by where the close sits in
//    the bar's range ((close-open)/range in [-1..1]).
double VA_BarDelta(string symbol, ENUM_TIMEFRAMES tf, int i)
{
   double range = iHigh(symbol,tf,i) - iLow(symbol,tf,i);
   if(range <= 0) return 0;
   double pressure = (iClose(symbol,tf,i) - iOpen(symbol,tf,i)) / range;
   return pressure * (double)iTickVolume(symbol, tf, i);
}

double VA_OrderFlowScore(string symbol, ENUM_TIMEFRAMES tf, int bars = 20)
{
   double cum = 0, cumFirstHalf = 0;
   double volSum = 0;
   for(int i = 1; i <= bars; i++)
   {
      double d = VA_BarDelta(symbol, tf, i);
      cum += d;
      if(i > bars/2) cumFirstHalf += d;
      volSum += (double)iTickVolume(symbol, tf, i);
   }
   if(volSum <= 0) return 0;

   // normalized cumulative delta
   double norm = cum / volSum;                 // [-1..1]
   double score = MathMax(-60, MathMin(60, norm * 150));

   // divergence: price up over the window but delta down (or reverse)
   double priceChg = iClose(symbol,tf,1) - iClose(symbol,tf,bars);
   if(priceChg > 0 && cum < 0 && cumFirstHalf < 0) score -= 30; // hollow rally
   if(priceChg < 0 && cum > 0 && cumFirstHalf > 0) score += 30; // absorbed decline

   return MathMax(-100, MathMin(100, score));
}
