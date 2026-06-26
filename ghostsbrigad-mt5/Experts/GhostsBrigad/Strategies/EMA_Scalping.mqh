//+------------------------------------------------------------------+
//| EMA_Scalping.mqh - EMA crossover scalping strategy              |
//|                                                                  |
//| Signal: Fast EMA crosses Slow EMA, confirmed by trend EMA       |
//| Filter: ADX > threshold for trending market                     |
//+------------------------------------------------------------------+
#pragma once

struct EMAScalpSignal { int direction; }; // 1=BUY, -1=SELL, 0=NONE

EMAScalpSignal EMAScalping_GetSignal(
   string            symbol,
   ENUM_TIMEFRAMES   tf,
   int               fastPeriod    = 8,
   int               slowPeriod    = 21,
   int               trendPeriod   = 50,
   int               adxPeriod     = 14,
   double            adxThreshold  = 20.0,
   bool              useADXFilter  = true
)
{
   EMAScalpSignal sig = {0};

   double fastPrev  = EMA(symbol, tf, fastPeriod, 1);
   double fastCurr  = EMA(symbol, tf, fastPeriod, 0);
   double slowPrev  = EMA(symbol, tf, slowPeriod, 1);
   double slowCurr  = EMA(symbol, tf, slowPeriod, 0);
   double trend     = EMA(symbol, tf, trendPeriod, 0);
   double price     = iClose(symbol, tf, 0);

   if(fastCurr <= 0 || slowCurr <= 0 || trend <= 0) return sig;

   bool adxOk = !useADXFilter || (ADX(symbol, tf, adxPeriod) >= adxThreshold);
   if(!adxOk) return sig;

   // Bullish crossover: fast crosses above slow, price above trend EMA
   bool bullCross = (fastPrev <= slowPrev) && (fastCurr > slowCurr) && (price > trend);
   // Bearish crossover: fast crosses below slow, price below trend EMA
   bool bearCross = (fastPrev >= slowPrev) && (fastCurr < slowCurr) && (price < trend);

   if(bullCross) sig.direction =  1;
   if(bearCross) sig.direction = -1;

   return sig;
}

//--- Multi-timeframe EMA filter: checks higher TF for trend alignment
bool EMAScalping_HTFConfirm(string symbol, ENUM_TIMEFRAMES htf, int emaPeriod = 50)
{
   double ema   = EMA(symbol, htf, emaPeriod, 0);
   double price = iClose(symbol, htf, 0);
   return (price > ema); // true = bullish bias
}
