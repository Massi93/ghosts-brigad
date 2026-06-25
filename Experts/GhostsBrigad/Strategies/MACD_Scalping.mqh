//+------------------------------------------------------------------+
//| MACD_Scalping.mqh - MACD momentum scalping strategy             |
//|                                                                  |
//| Signal: MACD histogram flip + zero-line cross confirmation      |
//| Filter: EMA trend filter to avoid counter-trend trades          |
//+------------------------------------------------------------------+
#pragma once

struct MACDScalpSignal { int direction; };

MACDScalpSignal MACDScalping_GetSignal(
   string          symbol,
   ENUM_TIMEFRAMES tf,
   int             fastEMA         = 12,
   int             slowEMA         = 26,
   int             signalPeriod    = 9,
   int             trendEmaPeriod  = 50,
   bool            useZeroCross    = false,
   bool            useHistFlip     = true,
   bool            useTrendFilter  = true
)
{
   MACDScalpSignal sig = {0};

   MACDValues macd0 = MACD(symbol, tf, fastEMA, slowEMA, signalPeriod, 0);
   MACDValues macd1 = MACD(symbol, tf, fastEMA, slowEMA, signalPeriod, 1);

   if(macd0.main == 0) return sig;

   bool trendBull = true, trendBear = true;
   if(useTrendFilter)
   {
      double ema   = EMA(symbol, tf, trendEmaPeriod, 0);
      double price = iClose(symbol, tf, 0);
      trendBull = (price > ema);
      trendBear = (price < ema);
   }

   bool buySignal  = false;
   bool sellSignal = false;

   if(useHistFlip)
   {
      // Histogram flips positive (momentum turning bullish)
      buySignal  = (macd1.histogram < 0) && (macd0.histogram >= 0);
      // Histogram flips negative (momentum turning bearish)
      sellSignal = (macd1.histogram > 0) && (macd0.histogram <= 0);
   }

   if(useZeroCross)
   {
      // MACD line crosses above zero
      buySignal  = buySignal  || ((macd1.main < 0) && (macd0.main >= 0));
      // MACD line crosses below zero
      sellSignal = sellSignal || ((macd1.main > 0) && (macd0.main <= 0));
   }

   if(buySignal  && trendBull) sig.direction =  1;
   if(sellSignal && trendBear) sig.direction = -1;

   return sig;
}

//--- MACD signal line cross
bool MACDScalping_SignalLineCross(string symbol, ENUM_TIMEFRAMES tf,
                                   int fast, int slow, int signal,
                                   bool bullish)
{
   MACDValues m0 = MACD(symbol, tf, fast, slow, signal, 0);
   MACDValues m1 = MACD(symbol, tf, fast, slow, signal, 1);
   if(bullish)
      return (m1.main < m1.signal) && (m0.main >= m0.signal);
   else
      return (m1.main > m1.signal) && (m0.main <= m0.signal);
}
