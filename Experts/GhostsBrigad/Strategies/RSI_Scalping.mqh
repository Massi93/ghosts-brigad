//+------------------------------------------------------------------+
//| RSI_Scalping.mqh - RSI mean-reversion scalping strategy         |
//|                                                                  |
//| Signal: RSI oversold/overbought with Stochastic confirmation    |
//| Filter: Price near BB middle for consolidating markets          |
//+------------------------------------------------------------------+
#pragma once

struct RSIScalpSignal { int direction; };

RSIScalpSignal RSIScalping_GetSignal(
   string          symbol,
   ENUM_TIMEFRAMES tf,
   int             rsiPeriod   = 14,
   double          oversold    = 30.0,
   double          overbought  = 70.0,
   int             stochK      = 5,
   int             stochD      = 3,
   int             stochSlowing= 3,
   double          stochOversold   = 20.0,
   double          stochOverbought = 80.0,
   bool            useStochConfirm = true
)
{
   RSIScalpSignal sig = {0};

   double rsiCurr = RSI(symbol, tf, rsiPeriod, 0);
   double rsiPrev = RSI(symbol, tf, rsiPeriod, 1);

   if(rsiCurr <= 0) return sig;

   // RSI exits oversold (reversal up)
   bool rsiBuy  = (rsiPrev < oversold) && (rsiCurr >= oversold);
   // RSI exits overbought (reversal down)
   bool rsiSell = (rsiPrev > overbought) && (rsiCurr <= overbought);

   if(!rsiBuy && !rsiSell) return sig;

   if(useStochConfirm)
   {
      StochValues st = Stochastic(symbol, tf, stochK, stochD, stochSlowing, 0);
      if(rsiBuy  && st.main >= stochOversold)   return sig; // not confirmed oversold
      if(rsiSell && st.main <= stochOverbought) return sig; // not confirmed overbought
   }

   if(rsiBuy)  sig.direction =  1;
   if(rsiSell) sig.direction = -1;

   return sig;
}

//--- RSI divergence detection (bullish/bearish)
bool RSIScalping_BullishDivergence(string symbol, ENUM_TIMEFRAMES tf, int rsiPeriod = 14, int lookback = 10)
{
   // Find recent two lows in price and compare with RSI lows
   double priceLow1 = iLow(symbol, tf, 1);
   double rsiLow1   = RSI(symbol, tf, rsiPeriod, 1);

   double priceLow2 = priceLow1;
   double rsiLow2   = rsiLow1;

   for(int i = 2; i <= lookback; i++)
   {
      double pl = iLow(symbol, tf, i);
      double rl = RSI(symbol, tf, rsiPeriod, i);
      if(pl < priceLow2) { priceLow2 = pl; rsiLow2 = rl; }
   }

   // Bullish divergence: price makes lower low but RSI makes higher low
   return (priceLow1 < priceLow2) && (rsiLow1 > rsiLow2);
}

bool RSIScalping_BearishDivergence(string symbol, ENUM_TIMEFRAMES tf, int rsiPeriod = 14, int lookback = 10)
{
   double priceHigh1 = iHigh(symbol, tf, 1);
   double rsiHigh1   = RSI(symbol, tf, rsiPeriod, 1);

   double priceHigh2 = priceHigh1;
   double rsiHigh2   = rsiHigh1;

   for(int i = 2; i <= lookback; i++)
   {
      double ph = iHigh(symbol, tf, i);
      double rh = RSI(symbol, tf, rsiPeriod, i);
      if(ph > priceHigh2) { priceHigh2 = ph; rsiHigh2 = rh; }
   }

   // Bearish divergence: price makes higher high but RSI makes lower high
   return (priceHigh1 > priceHigh2) && (rsiHigh1 < rsiHigh2);
}
