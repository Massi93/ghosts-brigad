//+------------------------------------------------------------------+
//| TradeUtils.mqh - Trade utility functions for GhostsBrigad EA    |
//+------------------------------------------------------------------+

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\OrderInfo.mqh>

// Global trade objects
CTrade        Trade;
CPositionInfo PositionInfo;
COrderInfo    OrderInfo;

//--- Normalizes lot size to broker constraints
double NormalizeLot(double lot, string symbol)
{
   double minLot  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
   lot = MathMax(minLot, MathMin(maxLot, MathRound(lot / lotStep) * lotStep));
   return NormalizeDouble(lot, 2);
}

//--- Returns pip value for the symbol
double GetPipValue(string symbol)
{
   double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
   double pipSize   = SymbolInfoDouble(symbol, SYMBOL_POINT) * 10;
   if(tickSize == 0) return 0;
   return tickValue * (pipSize / tickSize);
}

//--- Counts open positions for this EA (by magic number)
int CountPositions(string symbol, long magic)
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionInfo.SelectByIndex(i))
         if(PositionInfo.Symbol() == symbol && PositionInfo.Magic() == magic)
            count++;
   }
   return count;
}

//--- Counts open BUY positions
int CountBuyPositions(string symbol, long magic)
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionInfo.SelectByIndex(i))
         if(PositionInfo.Symbol() == symbol && PositionInfo.Magic() == magic &&
            PositionInfo.PositionType() == POSITION_TYPE_BUY)
            count++;
   }
   return count;
}

//--- Counts open SELL positions
int CountSellPositions(string symbol, long magic)
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionInfo.SelectByIndex(i))
         if(PositionInfo.Symbol() == symbol && PositionInfo.Magic() == magic &&
            PositionInfo.PositionType() == POSITION_TYPE_SELL)
            count++;
   }
   return count;
}

//--- Close all positions for this symbol and magic
void CloseAllPositions(string symbol, long magic)
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionInfo.SelectByIndex(i))
         if(PositionInfo.Symbol() == symbol && PositionInfo.Magic() == magic)
            Trade.PositionClose(PositionInfo.Ticket());
   }
}

//--- Apply trailing stop to all positions
void ApplyTrailingStop(string symbol, long magic, double trailPips, double stepPips)
{
   double point  = SymbolInfoDouble(symbol, SYMBOL_POINT);
   double trail  = trailPips * point * 10;
   double step   = stepPips  * point * 10;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!PositionInfo.SelectByIndex(i)) continue;
      if(PositionInfo.Symbol() != symbol || PositionInfo.Magic() != magic) continue;

      double sl      = PositionInfo.StopLoss();
      double price   = PositionInfo.PriceCurrent();
      double open    = PositionInfo.PriceOpen();

      if(PositionInfo.PositionType() == POSITION_TYPE_BUY)
      {
         double newSL = NormalizeDouble(price - trail, (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS));
         if(newSL > sl + step || sl == 0)
            Trade.PositionModify(PositionInfo.Ticket(), newSL, PositionInfo.TakeProfit());
      }
      else if(PositionInfo.PositionType() == POSITION_TYPE_SELL)
      {
         double newSL = NormalizeDouble(price + trail, (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS));
         if(newSL < sl - step || sl == 0)
            Trade.PositionModify(PositionInfo.Ticket(), newSL, PositionInfo.TakeProfit());
      }
   }
}

//--- Apply break-even to all positions
void ApplyBreakEven(string symbol, long magic, double triggerPips, double offsetPips)
{
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   double trigger = triggerPips * point * 10;
   double offset  = offsetPips  * point * 10;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!PositionInfo.SelectByIndex(i)) continue;
      if(PositionInfo.Symbol() != symbol || PositionInfo.Magic() != magic) continue;

      double sl    = PositionInfo.StopLoss();
      double price = PositionInfo.PriceCurrent();
      double open  = PositionInfo.PriceOpen();
      int    digits= (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

      if(PositionInfo.PositionType() == POSITION_TYPE_BUY)
      {
         if(price >= open + trigger)
         {
            double newSL = NormalizeDouble(open + offset, digits);
            if(newSL > sl)
               Trade.PositionModify(PositionInfo.Ticket(), newSL, PositionInfo.TakeProfit());
         }
      }
      else if(PositionInfo.PositionType() == POSITION_TYPE_SELL)
      {
         if(price <= open - trigger)
         {
            double newSL = NormalizeDouble(open - offset, digits);
            if(newSL < sl || sl == 0)
               Trade.PositionModify(PositionInfo.Ticket(), newSL, PositionInfo.TakeProfit());
         }
      }
   }
}

//--- Check if within allowed trading hours
bool IsWithinTradingHours(int startHour, int endHour)
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   if(startHour <= endHour)
      return (dt.hour >= startHour && dt.hour < endHour);
   else
      return (dt.hour >= startHour || dt.hour < endHour);
}

//--- Get current spread in pips
double GetSpreadPips(string symbol)
{
   long spread = SymbolInfoInteger(symbol, SYMBOL_SPREAD);
   return (double)spread / 10.0;
}

//--- Check if spread is acceptable
bool IsSpreadAcceptable(string symbol, double maxSpreadPips)
{
   return GetSpreadPips(symbol) <= maxSpreadPips;
}

//--- Calculate total floating profit/loss
double GetTotalFloatingPnL(string symbol, long magic)
{
   double total = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionInfo.SelectByIndex(i))
         if(PositionInfo.Symbol() == symbol && PositionInfo.Magic() == magic)
            total += PositionInfo.Profit() + PositionInfo.Swap() + PositionInfo.Commission();
   }
   return total;
}

//--- Check if a new bar has formed
bool IsNewBar(string symbol, ENUM_TIMEFRAMES tf)
{
   static datetime lastBar = 0;
   datetime currentBar = iTime(symbol, tf, 0);
   if(currentBar != lastBar)
   {
      lastBar = currentBar;
      return true;
   }
   return false;
}
