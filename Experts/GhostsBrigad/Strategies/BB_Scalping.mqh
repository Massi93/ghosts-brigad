//+------------------------------------------------------------------+
//| BB_Scalping.mqh - Bollinger Bands scalping strategy             |
//|                                                                  |
//| Signal: Price touches/crosses BB bands with RSI confirmation    |
//| Modes:  Reversal (bounce off bands) | Breakout (band squeeze)   |
//+------------------------------------------------------------------+
#pragma once

enum BB_MODE { BB_REVERSAL = 0, BB_BREAKOUT = 1 };

struct BBScalpSignal { int direction; };

BBScalpSignal BBScalping_GetSignal(
   string          symbol,
   ENUM_TIMEFRAMES tf,
   BB_MODE         mode         = BB_REVERSAL,
   int             bbPeriod     = 20,
   double          bbDeviation  = 2.0,
   int             rsiPeriod    = 14,
   double          rsiBuyMax    = 40.0,
   double          rsiSellMin   = 60.0,
   double          squeezeThreshold = 0.001 // bandwidth / price for squeeze detection
)
{
   BBScalpSignal sig = {0};

   BBValues bb0 = BollingerBands(symbol, tf, bbPeriod, bbDeviation, 0);
   BBValues bb1 = BollingerBands(symbol, tf, bbPeriod, bbDeviation, 1);

   double close0 = iClose(symbol, tf, 0);
   double close1 = iClose(symbol, tf, 1);
   double open0  = iOpen(symbol,  tf, 0);
   double rsi    = RSI(symbol, tf, rsiPeriod, 0);

   if(bb0.upper <= 0 || bb0.lower <= 0) return sig;

   if(mode == BB_REVERSAL)
   {
      // Price touches lower band + bullish candle + RSI not overbought
      bool buySignal  = (close1 <= bb1.lower) && (close0 > open0) && (rsi <= rsiBuyMax);
      // Price touches upper band + bearish candle + RSI not oversold
      bool sellSignal = (close1 >= bb1.upper) && (close0 < open0) && (rsi >= rsiSellMin);

      if(buySignal)  sig.direction =  1;
      if(sellSignal) sig.direction = -1;
   }
   else if(mode == BB_BREAKOUT)
   {
      // Detect band squeeze (low volatility before breakout)
      double bandwidth = (bb0.upper - bb0.lower) / bb0.middle;
      if(bandwidth > squeezeThreshold) return sig;

      // Breakout above upper band
      bool buyBreakout  = (close1 < bb1.upper) && (close0 > bb0.upper);
      // Breakout below lower band
      bool sellBreakout = (close1 > bb1.lower) && (close0 < bb0.lower);

      if(buyBreakout)  sig.direction =  1;
      if(sellBreakout) sig.direction = -1;
   }

   return sig;
}

//--- BB bandwidth (volatility measure): low = squeeze
double BBScalping_Bandwidth(string symbol, ENUM_TIMEFRAMES tf, int period, double deviation)
{
   BBValues bb = BollingerBands(symbol, tf, period, deviation, 0);
   if(bb.middle == 0) return 0;
   return (bb.upper - bb.lower) / bb.middle;
}

//--- Check if price is inside BB (not at extremes)
bool BBScalping_PriceInsideBands(string symbol, ENUM_TIMEFRAMES tf, int period, double deviation)
{
   BBValues bb    = BollingerBands(symbol, tf, period, deviation, 0);
   double   price = iClose(symbol, tf, 0);
   return (price > bb.lower && price < bb.upper);
}
