//+------------------------------------------------------------------+
//| Indicators.mqh - Indicator helper wrappers for GhostsBrigad EA  |
//+------------------------------------------------------------------+
#pragma once

//--- EMA value at shift
double EMA(string symbol, ENUM_TIMEFRAMES tf, int period, int shift = 0)
{
   int handle = iMA(symbol, tf, period, 0, MODE_EMA, PRICE_CLOSE);
   if(handle == INVALID_HANDLE) return 0;
   double buf[1];
   if(CopyBuffer(handle, 0, shift, 1, buf) <= 0) return 0;
   IndicatorRelease(handle);
   return buf[0];
}

//--- SMA value at shift
double SMA(string symbol, ENUM_TIMEFRAMES tf, int period, int shift = 0)
{
   int handle = iMA(symbol, tf, period, 0, MODE_SMA, PRICE_CLOSE);
   if(handle == INVALID_HANDLE) return 0;
   double buf[1];
   if(CopyBuffer(handle, 0, shift, 1, buf) <= 0) return 0;
   IndicatorRelease(handle);
   return buf[0];
}

//--- RSI value at shift
double RSI(string symbol, ENUM_TIMEFRAMES tf, int period, int shift = 0)
{
   int handle = iRSI(symbol, tf, period, PRICE_CLOSE);
   if(handle == INVALID_HANDLE) return 50;
   double buf[1];
   if(CopyBuffer(handle, 0, shift, 1, buf) <= 0) return 50;
   IndicatorRelease(handle);
   return buf[0];
}

//--- ATR value at shift
double ATR(string symbol, ENUM_TIMEFRAMES tf, int period, int shift = 0)
{
   int handle = iATR(symbol, tf, period);
   if(handle == INVALID_HANDLE) return 0;
   double buf[1];
   if(CopyBuffer(handle, 0, shift, 1, buf) <= 0) return 0;
   IndicatorRelease(handle);
   return buf[0];
}

//--- Bollinger Bands values
struct BBValues { double upper; double middle; double lower; };

BBValues BollingerBands(string symbol, ENUM_TIMEFRAMES tf, int period, double deviation, int shift = 0)
{
   BBValues result = {0, 0, 0};
   int handle = iBands(symbol, tf, period, 0, deviation, PRICE_CLOSE);
   if(handle == INVALID_HANDLE) return result;
   double upper[1], middle[1], lower[1];
   CopyBuffer(handle, 1, shift, 1, upper);
   CopyBuffer(handle, 0, shift, 1, middle);
   CopyBuffer(handle, 2, shift, 1, lower);
   IndicatorRelease(handle);
   result.upper  = upper[0];
   result.middle = middle[0];
   result.lower  = lower[0];
   return result;
}

//--- MACD values (main and signal)
struct MACDValues { double main; double signal; double histogram; };

MACDValues MACD(string symbol, ENUM_TIMEFRAMES tf, int fastEMA, int slowEMA, int signalPeriod, int shift = 0)
{
   MACDValues result = {0, 0, 0};
   int handle = iMACD(symbol, tf, fastEMA, slowEMA, signalPeriod, PRICE_CLOSE);
   if(handle == INVALID_HANDLE) return result;
   double main[1], signal[1];
   CopyBuffer(handle, 0, shift, 1, main);
   CopyBuffer(handle, 1, shift, 1, signal);
   IndicatorRelease(handle);
   result.main      = main[0];
   result.signal    = signal[0];
   result.histogram = main[0] - signal[0];
   return result;
}

//--- Stochastic values
struct StochValues { double main; double signal; };

StochValues Stochastic(string symbol, ENUM_TIMEFRAMES tf, int kPeriod, int dPeriod, int slowing, int shift = 0)
{
   StochValues result = {0, 0};
   int handle = iStochastic(symbol, tf, kPeriod, dPeriod, slowing, MODE_SMA, STO_LOWHIGH);
   if(handle == INVALID_HANDLE) return result;
   double main[1], signal[1];
   CopyBuffer(handle, 0, shift, 1, main);
   CopyBuffer(handle, 1, shift, 1, signal);
   IndicatorRelease(handle);
   result.main   = main[0];
   result.signal = signal[0];
   return result;
}

//--- CCI value
double CCI(string symbol, ENUM_TIMEFRAMES tf, int period, int shift = 0)
{
   int handle = iCCI(symbol, tf, period, PRICE_TYPICAL);
   if(handle == INVALID_HANDLE) return 0;
   double buf[1];
   if(CopyBuffer(handle, 0, shift, 1, buf) <= 0) return 0;
   IndicatorRelease(handle);
   return buf[0];
}

//--- ADX value and direction
double ADX(string symbol, ENUM_TIMEFRAMES tf, int period, int shift = 0)
{
   int handle = iADX(symbol, tf, period);
   if(handle == INVALID_HANDLE) return 0;
   double buf[1];
   if(CopyBuffer(handle, 0, shift, 1, buf) <= 0) return 0;
   IndicatorRelease(handle);
   return buf[0];
}

//--- Check if market is trending (ADX above threshold)
bool IsTrending(string symbol, ENUM_TIMEFRAMES tf, int adxPeriod, double threshold = 25.0)
{
   return ADX(symbol, tf, adxPeriod) >= threshold;
}

//--- Detect candlestick patterns
bool IsBullishEngulfing(string symbol, ENUM_TIMEFRAMES tf)
{
   double open1  = iOpen(symbol, tf, 1),  close1 = iClose(symbol, tf, 1);
   double open2  = iOpen(symbol, tf, 2),  close2 = iClose(symbol, tf, 2);
   return (close2 < open2) && (close1 > open1) && (close1 > open2) && (open1 < close2);
}

bool IsBearishEngulfing(string symbol, ENUM_TIMEFRAMES tf)
{
   double open1  = iOpen(symbol, tf, 1),  close1 = iClose(symbol, tf, 1);
   double open2  = iOpen(symbol, tf, 2),  close2 = iClose(symbol, tf, 2);
   return (close2 > open2) && (close1 < open1) && (close1 < open2) && (open1 > close2);
}

bool IsBullishPinBar(string symbol, ENUM_TIMEFRAMES tf, double ratio = 2.0)
{
   double open  = iOpen(symbol, tf, 1);
   double close = iClose(symbol, tf, 1);
   double high  = iHigh(symbol, tf, 1);
   double low   = iLow(symbol, tf, 1);
   double body  = MathAbs(close - open);
   double tail  = MathMin(open, close) - low;
   double wick  = high - MathMax(open, close);
   return (tail >= body * ratio) && (wick <= body);
}

bool IsBearishPinBar(string symbol, ENUM_TIMEFRAMES tf, double ratio = 2.0)
{
   double open  = iOpen(symbol, tf, 1);
   double close = iClose(symbol, tf, 1);
   double high  = iHigh(symbol, tf, 1);
   double low   = iLow(symbol, tf, 1);
   double body  = MathAbs(close - open);
   double wick  = high - MathMax(open, close);
   double tail  = MathMin(open, close) - low;
   return (wick >= body * ratio) && (tail <= body);
}
