//+------------------------------------------------------------------+
//| ExitManager.mqh - Smart position exits for GhostsBrigad EA      |
//|                                                                  |
//| Knows WHEN to close, not just where:                            |
//|   - Partial take-profit at N x initial risk (locks gains early) |
//|   - Cost-adjusted break-even (covers commission on Raw/Zero)    |
//|   - ATR chandelier trailing on the runner after partial close   |
//|   - Time stop: exit stagnant trades that only bleed swap/fees   |
//|   - Sentiment-flip exit: close winners when the news turns      |
//|   - Pre-news flat: close before high-impact announcements       |
//+------------------------------------------------------------------+
#pragma once

struct ExitParams
{
   // Partial take-profit
   bool   usePartialClose;
   double partialTriggerR;    // close part at N x initial risk (e.g. 1.0)
   double partialPercent;     // % of volume to close (e.g. 50)
   // Time stop
   bool   useTimeStop;
   int    timeStopBars;       // close if older than N bars AND not paying
   ENUM_TIMEFRAMES timeframe;
   // Chandelier trailing (applied to remainder after partial close)
   bool   useChandelier;
   int    atrPeriod;
   double chandelierMult;     // trail distance = mult x ATR
   // Sentiment flip
   bool   exitOnSentimentFlip;
   double flipLevel;          // |score| needed to force an exit
   double flipMinConfidence;
   int    sentimentMaxAgeMin;
   // News
   bool   closeBeforeNews;
   int    newsPreMinutes;
};

//--- Global-variable keys used to remember per-ticket state across ticks
string ExitGVKeyRisk(ulong ticket)    { return "GB_R0_" + (string)ticket; }
string ExitGVKeyPartial(ulong ticket) { return "GB_PC_" + (string)ticket; }

//--- Record the initial risk (entry -> SL distance) the first time we
//    see a position, before break-even / trailing moves the SL.
void Exit_RegisterPosition(ulong ticket, double openPrice, double sl)
{
   string key = ExitGVKeyRisk(ticket);
   if(GlobalVariableCheck(key)) return;
   double risk = MathAbs(openPrice - sl);
   if(risk > 0) GlobalVariableSet(key, risk);
}

//--- Remove stale per-ticket globals once a position is gone
void Exit_CleanupTicket(ulong ticket)
{
   GlobalVariableDel(ExitGVKeyRisk(ticket));
   GlobalVariableDel(ExitGVKeyPartial(ticket));
}

//--- Partial close at partialTriggerR x initial risk
void Exit_TryPartialClose(string symbol, const ExitParams &p)
{
   ulong  ticket = PositionInfo.Ticket();
   string pcKey  = ExitGVKeyPartial(ticket);
   if(GlobalVariableCheck(pcKey)) return; // already done

   string rKey = ExitGVKeyRisk(ticket);
   if(!GlobalVariableCheck(rKey)) return;
   double risk = GlobalVariableGet(rKey);
   if(risk <= 0) return;

   double open  = PositionInfo.PriceOpen();
   double price = PositionInfo.PriceCurrent();
   double gain  = (PositionInfo.PositionType() == POSITION_TYPE_BUY)
                     ? price - open : open - price;
   if(gain < risk * p.partialTriggerR) return;

   double volume  = PositionInfo.Volume();
   double partVol = NormalizeLot(volume * p.partialPercent / 100.0, symbol);
   double minLot  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);

   // Nothing sensible to split: keep the full position running
   if(partVol < minLot || volume - partVol < minLot)
   {
      GlobalVariableSet(pcKey, 1);
      return;
   }

   if(Trade.PositionClosePartial(ticket, partVol))
   {
      GlobalVariableSet(pcKey, 1);
      Print("Partial close | Ticket: ", ticket, " | Closed: ", partVol,
            " of ", volume, " at ", DoubleToString(p.partialTriggerR, 1), "R");
   }
}

//--- Chandelier trailing stop: SL follows extreme price minus N x ATR.
//    Only tightens, never loosens.
void Exit_ApplyChandelier(string symbol, const ExitParams &p)
{
   double atr = ATR(symbol, p.timeframe, p.atrPeriod);
   if(atr <= 0) return;

   double trail  = atr * p.chandelierMult;
   int    digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   double sl     = PositionInfo.StopLoss();
   double price  = PositionInfo.PriceCurrent();

   if(PositionInfo.PositionType() == POSITION_TYPE_BUY)
   {
      double newSL = NormalizeDouble(price - trail, digits);
      if(newSL > sl)
         Trade.PositionModify(PositionInfo.Ticket(), newSL, PositionInfo.TakeProfit());
   }
   else
   {
      double newSL = NormalizeDouble(price + trail, digits);
      if(newSL < sl || sl == 0)
         Trade.PositionModify(PositionInfo.Ticket(), newSL, PositionInfo.TakeProfit());
   }
}

//--- Time stop: a scalp that goes nowhere for N bars is dead capital;
//    close it unless it at least covers the round-trip cost.
bool Exit_TimeStopHit(string symbol, const ExitParams &p, double costPips)
{
   datetime opened  = (datetime)PositionInfo.Time();
   int      barSecs = PeriodSeconds(p.timeframe);
   if(barSecs <= 0) return false;
   int barsOpen = (int)((TimeCurrent() - opened) / barSecs);
   if(barsOpen < p.timeStopBars) return false;

   double open  = PositionInfo.PriceOpen();
   double price = PositionInfo.PriceCurrent();
   double gain  = (PositionInfo.PositionType() == POSITION_TYPE_BUY)
                     ? price - open : open - price;
   double gainPips = gain / (SymbolInfoDouble(symbol, SYMBOL_POINT) * 10);
   return (gainPips < costPips);
}

//--- Sentiment flip: strong, confident sentiment against an open
//    position closes it (only when the position is not deep red,
//    to avoid panic-closing at the worst tick).
bool Exit_SentimentFlipHit(string symbol, const ExitParams &p)
{
   SentimentInfo s = Sentinel_GetSentiment(symbol, p.sentimentMaxAgeMin);
   if(!s.valid || s.confidence < p.flipMinConfidence) return false;

   if(PositionInfo.PositionType() == POSITION_TYPE_BUY  && s.score <= -p.flipLevel) return true;
   if(PositionInfo.PositionType() == POSITION_TYPE_SELL && s.score >=  p.flipLevel) return true;
   return false;
}

//--- Main loop: manage every open position of this EA
void Exit_ManageAll(
   string symbol,
   long   magic,
   const ExitParams &p,
   double costPips // current round-trip cost from AccountProfile
)
{
   // Pre-news flat: close everything before high-impact events
   if(p.closeBeforeNews)
   {
      string eventTitle;
      if(Sentinel_InBlackout(symbol, p.newsPreMinutes, 0, true, eventTitle))
      {
         if(CountPositions(symbol, magic) > 0)
         {
            Print("Closing positions before high-impact news: ", eventTitle);
            CloseAllPositions(symbol, magic);
         }
         return;
      }
   }

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!PositionInfo.SelectByIndex(i)) continue;
      if(PositionInfo.Symbol() != symbol || PositionInfo.Magic() != magic) continue;

      ulong ticket = PositionInfo.Ticket();
      Exit_RegisterPosition(ticket, PositionInfo.PriceOpen(), PositionInfo.StopLoss());

      // 1. Sentiment flipped hard against us -> get out
      if(p.exitOnSentimentFlip && Exit_SentimentFlipHit(symbol, p))
      {
         Print("Sentiment flip exit | Ticket: ", ticket);
         Trade.PositionClose(ticket);
         Exit_CleanupTicket(ticket);
         continue;
      }

      // 2. Stagnant trade -> free the margin
      if(p.useTimeStop && Exit_TimeStopHit(symbol, p, costPips))
      {
         Print("Time stop exit | Ticket: ", ticket);
         Trade.PositionClose(ticket);
         Exit_CleanupTicket(ticket);
         continue;
      }

      // 3. Lock in gains
      if(p.usePartialClose)
         Exit_TryPartialClose(symbol, p);

      // 4. Trail the (remaining) position
      if(p.useChandelier && GlobalVariableCheck(ExitGVKeyPartial(ticket)))
         Exit_ApplyChandelier(symbol, p);
   }
}
