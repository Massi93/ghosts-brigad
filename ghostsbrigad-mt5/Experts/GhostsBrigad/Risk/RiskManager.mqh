//+------------------------------------------------------------------+
//| RiskManager.mqh - Risk & money management for GhostsBrigad EA   |
//+------------------------------------------------------------------+

enum ENUM_LOT_MODE
{
   LOT_FIXED      = 0,  // Fixed lot size
   LOT_PERCENT    = 1,  // % of balance per trade
   LOT_KELLY      = 2,  // Kelly criterion approximation
};

//--- Calculate lot size based on selected mode
double CalculateLotSize(
   string        symbol,
   ENUM_LOT_MODE mode,
   double        fixedLot,
   double        riskPercent,
   double        stopLossPips,
   double        winRate = 0.55,   // used for Kelly
   double        rr     = 1.5      // risk:reward, used for Kelly
)
{
   double balance  = AccountInfoDouble(ACCOUNT_BALANCE);
   double lotSize  = fixedLot;

   if(mode == LOT_PERCENT && stopLossPips > 0)
   {
      double pipVal   = GetPipValue(symbol);
      if(pipVal <= 0) return NormalizeLot(fixedLot, symbol);
      double riskAmt  = balance * riskPercent / 100.0;
      lotSize = riskAmt / (stopLossPips * pipVal);
   }
   else if(mode == LOT_KELLY && stopLossPips > 0)
   {
      double pipVal   = GetPipValue(symbol);
      if(pipVal <= 0) return NormalizeLot(fixedLot, symbol);
      // Kelly fraction: f = W - (1-W)/R  where W=winRate, R=risk:reward
      double kelly    = winRate - (1.0 - winRate) / rr;
      kelly           = MathMax(0, MathMin(0.25, kelly)); // cap at 25%
      double riskAmt  = balance * kelly;
      lotSize         = riskAmt / (stopLossPips * pipVal);
   }

   return NormalizeLot(lotSize, symbol);
}

//--- Daily loss limit check (returns true if limit reached)
bool IsDailyLossLimitReached(double limitPercent)
{
   static double startDayBalance = 0;
   static int    lastDay         = -1;

   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);

   if(dt.day != lastDay)
   {
      lastDay         = dt.day;
      startDayBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   }

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double loss    = (startDayBalance - equity) / startDayBalance * 100.0;
   return (loss >= limitPercent);
}

//--- Max drawdown check
bool IsMaxDrawdownReached(double maxDrawdownPercent)
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   if(balance <= 0) return false;
   double dd = (balance - equity) / balance * 100.0;
   return (dd >= maxDrawdownPercent);
}

//--- Check free margin is sufficient
bool HasSufficientMargin(string symbol, double lot, double safetyFactor = 1.5)
{
   double margin = 0;
   OrderCalcMargin(ORDER_TYPE_BUY, symbol, lot,
                   SymbolInfoDouble(symbol, SYMBOL_ASK), margin);
   return (AccountInfoDouble(ACCOUNT_MARGIN_FREE) >= margin * safetyFactor);
}

//--- Martingale lot multiplier (tracks last trade result)
double GetMartingaleLot(
   string  symbol,
   long    magic,
   double  baseLot,
   double  multiplier,
   int     maxLevels
)
{
   static int    martLevel  = 0;
   static bool   lastWasLoss = false;

   // Scan closed deals to detect last result
   if(HistorySelect(TimeCurrent() - 86400, TimeCurrent()))
   {
      int total = HistoryDealsTotal();
      for(int i = total - 1; i >= 0; i--)
      {
         ulong ticket = HistoryDealGetTicket(i);
         if(HistoryDealGetInteger(ticket, DEAL_MAGIC) != magic) continue;
         if(HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;
         double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
         if(profit < 0) { lastWasLoss = true;  martLevel = MathMin(martLevel + 1, maxLevels); }
         else           { lastWasLoss = false; martLevel = 0; }
         break;
      }
   }

   double lot = baseLot * MathPow(multiplier, martLevel);
   return NormalizeLot(lot, symbol);
}

//--- Get SL price from pips
double GetSLPrice(string symbol, ENUM_ORDER_TYPE type, double slPips)
{
   double point  = SymbolInfoDouble(symbol, SYMBOL_POINT) * 10;
   double ask    = SymbolInfoDouble(symbol, SYMBOL_ASK);
   double bid    = SymbolInfoDouble(symbol, SYMBOL_BID);
   int    digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

   if(type == ORDER_TYPE_BUY)
      return NormalizeDouble(bid - slPips * point, digits);
   else
      return NormalizeDouble(ask + slPips * point, digits);
}

//--- Get TP price from pips
double GetTPPrice(string symbol, ENUM_ORDER_TYPE type, double tpPips)
{
   double point  = SymbolInfoDouble(symbol, SYMBOL_POINT) * 10;
   double ask    = SymbolInfoDouble(symbol, SYMBOL_ASK);
   double bid    = SymbolInfoDouble(symbol, SYMBOL_BID);
   int    digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

   if(type == ORDER_TYPE_BUY)
      return NormalizeDouble(ask + tpPips * point, digits);
   else
      return NormalizeDouble(bid - tpPips * point, digits);
}

//--- SL based on ATR multiple
double GetATRSLPrice(string symbol, ENUM_TIMEFRAMES tf, ENUM_ORDER_TYPE type,
                     int atrPeriod, double atrMult)
{
   double atr     = ATR(symbol, tf, atrPeriod);
   double ask     = SymbolInfoDouble(symbol, SYMBOL_ASK);
   double bid     = SymbolInfoDouble(symbol, SYMBOL_BID);
   int    digits  = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

   if(type == ORDER_TYPE_BUY)
      return NormalizeDouble(bid - atr * atrMult, digits);
   else
      return NormalizeDouble(ask + atr * atrMult, digits);
}

//--- TP based on ATR multiple
double GetATRTPPrice(string symbol, ENUM_TIMEFRAMES tf, ENUM_ORDER_TYPE type,
                     int atrPeriod, double atrMult)
{
   double atr     = ATR(symbol, tf, atrPeriod);
   double ask     = SymbolInfoDouble(symbol, SYMBOL_ASK);
   double bid     = SymbolInfoDouble(symbol, SYMBOL_BID);
   int    digits  = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

   if(type == ORDER_TYPE_BUY)
      return NormalizeDouble(ask + atr * atrMult, digits);
   else
      return NormalizeDouble(bid - atr * atrMult, digits);
}
