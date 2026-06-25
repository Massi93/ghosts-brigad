//+------------------------------------------------------------------+
//| GhostsBrigad_CloseAll.mq5 - Emergency close all positions       |
//+------------------------------------------------------------------+
#property copyright "GhostsBrigad"
#property version   "1.00"
#property script_show_inputs

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>

input long InpMagicFilter = 0; // Magic Number (0 = close ALL positions)

void OnStart()
{
   CTrade        trade;
   CPositionInfo pos;

   int closed = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!pos.SelectByIndex(i)) continue;
      if(InpMagicFilter != 0 && pos.Magic() != InpMagicFilter) continue;
      if(trade.PositionClose(pos.Ticket()))
         closed++;
      else
         Print("Failed to close ticket ", pos.Ticket(), " | ", trade.ResultRetcodeDescription());
   }
   Print("GhostsBrigad CloseAll: ", closed, " position(s) closed.");
}
