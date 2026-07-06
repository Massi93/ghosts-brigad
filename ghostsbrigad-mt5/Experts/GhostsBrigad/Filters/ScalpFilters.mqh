//+------------------------------------------------------------------+
//| ScalpFilters.mqh - Professional scalping discipline filters     |
//|                                                                  |
//| The difference between a losing and a surviving scalper is      |
//| rarely the entry signal - it is WHEN they refuse to trade:      |
//|   - Volatility regime : no edge in dead markets, no control in  |
//|     exploding ones. Trade only when ATR is in its normal band.  |
//|   - Exhaustion bar    : never chase a bar 2.5x bigger than      |
//|     normal - that move already happened.                        |
//|   - Rollover blackout : spreads triple around swap time (~22h   |
//|     server) - a scalper has nothing to win there.               |
//|   - Loss cooldown     : after N straight losses, the market is  |
//|     telling you the regime changed. Step away, don't revenge.   |
//|   - Daily trade cap   : overtrading is the #1 scalper killer.   |
//|   - Entry spacing     : no stacking entries on the same move.   |
//|   - Adaptive risk     : half size after 2 straight losses,      |
//|     back to full size after a win (anti-martingale).            |
//+------------------------------------------------------------------+

//==================================================================
//  VOLATILITY REGIME
//==================================================================
//--- Current ATR vs its long-run level. Below minRatio the market
//    is dead (TP would take hours, fees eat the tiny range); above
//    maxRatio something abnormal is happening (news, flash move).
bool Scalp_VolRegimeOK(
   string symbol, ENUM_TIMEFRAMES tf,
   int atrPeriod, int atrBasePeriod,
   double minRatio, double maxRatio
)
{
   double atrNow  = ATR(symbol, tf, atrPeriod);
   double atrBase = ATR(symbol, tf, atrBasePeriod);
   if(atrNow <= 0 || atrBase <= 0) return false;
   double ratio = atrNow / atrBase;
   return (ratio >= minRatio && ratio <= maxRatio);
}

//--- Previous bar must not be an exhaustion bar (range > mult x ATR)
bool Scalp_NoExhaustionBar(
   string symbol, ENUM_TIMEFRAMES tf, int atrPeriod, double maxAtrMult
)
{
   double atr = ATR(symbol, tf, atrPeriod);
   if(atr <= 0) return true;
   double range = iHigh(symbol, tf, 1) - iLow(symbol, tf, 1);
   return (range <= atr * maxAtrMult);
}

//==================================================================
//  ROLLOVER / SWAP-TIME BLACKOUT
//==================================================================
bool Scalp_OutsideRollover(int startHour, int endHour)
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   if(startHour <= endHour)
      return !(dt.hour >= startHour && dt.hour < endHour);
   return !(dt.hour >= startHour || dt.hour < endHour);
}

//==================================================================
//  TRADE HISTORY HELPERS (this EA's closed deals, most recent first)
//==================================================================
//--- Fill profits[] with the last `count` closed-deal profits.
//    Returns how many were found; lastCloseTime = most recent close.
int Scalp_RecentResults(
   string symbol, long magic, int count,
   double &profits[], datetime &lastCloseTime
)
{
   lastCloseTime = 0;
   ArrayResize(profits, 0);
   if(!HistorySelect(TimeCurrent() - 7 * 86400, TimeCurrent())) return 0;

   int total = HistoryDealsTotal();
   for(int i = total - 1; i >= 0 && ArraySize(profits) < count; i--)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) != magic) continue;
      if(HistoryDealGetString(ticket, DEAL_SYMBOL) != symbol) continue;
      if(HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;

      int n = ArraySize(profits);
      ArrayResize(profits, n + 1);
      profits[n] = HistoryDealGetDouble(ticket, DEAL_PROFIT)
                 + HistoryDealGetDouble(ticket, DEAL_COMMISSION)
                 + HistoryDealGetDouble(ticket, DEAL_SWAP);
      if(lastCloseTime == 0)
         lastCloseTime = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
   }
   return ArraySize(profits);
}

//--- Number of consecutive losses ending at the most recent deal
int Scalp_ConsecutiveLosses(string symbol, long magic, int lookback = 10)
{
   double profits[];
   datetime lastClose;
   int n = Scalp_RecentResults(symbol, magic, lookback, profits, lastClose);
   int streak = 0;
   for(int i = 0; i < n; i++)
   {
      if(profits[i] < 0) streak++;
      else break;
   }
   return streak;
}

//--- After N straight losses, pause for `cooldownMinutes`
bool Scalp_LossCooldownActive(
   string symbol, long magic, int lossesToTrigger, int cooldownMinutes
)
{
   if(lossesToTrigger <= 0) return false;
   double profits[];
   datetime lastClose;
   int n = Scalp_RecentResults(symbol, magic, lossesToTrigger, profits, lastClose);
   if(n < lossesToTrigger || lastClose == 0) return false;

   for(int i = 0; i < lossesToTrigger; i++)
      if(profits[i] >= 0) return false;

   return (TimeCurrent() - lastClose) < cooldownMinutes * 60;
}

//--- Cap the number of entries per day
bool Scalp_DailyTradesOK(string symbol, long magic, int maxPerDay)
{
   if(maxPerDay <= 0) return true;

   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   dt.hour = 0; dt.min = 0; dt.sec = 0;
   datetime dayStart = StructToTime(dt);

   if(!HistorySelect(dayStart, TimeCurrent())) return true;
   int entries = 0;
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) != magic) continue;
      if(HistoryDealGetString(ticket, DEAL_SYMBOL) != symbol) continue;
      if(HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_IN) entries++;
   }
   // open positions also count against the cap
   entries += CountPositions(symbol, magic);
   return (entries < maxPerDay);
}

//--- Minimum bars between two entries (no stacking on one move)
bool Scalp_EntrySpacingOK(
   string symbol, long magic, ENUM_TIMEFRAMES tf, int minBars
)
{
   if(minBars <= 0) return true;

   datetime lastEntry = 0;
   if(HistorySelect(TimeCurrent() - 3 * 86400, TimeCurrent()))
   {
      int total = HistoryDealsTotal();
      for(int i = total - 1; i >= 0; i--)
      {
         ulong ticket = HistoryDealGetTicket(i);
         if(HistoryDealGetInteger(ticket, DEAL_MAGIC) != magic) continue;
         if(HistoryDealGetString(ticket, DEAL_SYMBOL) != symbol) continue;
         if(HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_IN) continue;
         lastEntry = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
         break;
      }
   }
   // open positions may be newer than the last history deal
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!PositionInfo.SelectByIndex(i)) continue;
      if(PositionInfo.Symbol() != symbol || PositionInfo.Magic() != magic) continue;
      datetime t = (datetime)PositionInfo.Time();
      if(t > lastEntry) lastEntry = t;
   }
   if(lastEntry == 0) return true;
   return (TimeCurrent() - lastEntry) >= minBars * PeriodSeconds(tf);
}

//==================================================================
//  ADAPTIVE RISK (anti-martingale)
//==================================================================
//--- Half risk after 2 straight losses, third after 4+.
//    A win restores full size. The exact opposite of martingale:
//    smaller when wrong, full size when in tune with the market.
double Scalp_AdaptiveRiskPercent(
   string symbol, long magic, double baseRiskPercent
)
{
   int streak = Scalp_ConsecutiveLosses(symbol, magic);
   if(streak >= 4) return baseRiskPercent / 3.0;
   if(streak >= 2) return baseRiskPercent / 2.0;
   return baseRiskPercent;
}
