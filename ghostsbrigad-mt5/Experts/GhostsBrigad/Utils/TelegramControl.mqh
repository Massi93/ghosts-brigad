//+------------------------------------------------------------------+
//| TelegramControl.mqh - Full remote control of the EA via Telegram|
//|                                                                  |
//| The EA polls the Telegram Bot API (getUpdates) every few seconds |
//| and executes commands coming ONLY from the configured chat id.   |
//| Commands:                                                        |
//|   /status /positions /help                                       |
//|   /pause /resume /close                                          |
//|   /buy [lot] /sell [lot]                                         |
//|   /risk X  /sl X  /tp X  /atr  /maxspread X  /confluence X       |
//| NOTE: this file must be #included AFTER the EA's inputs and      |
//| global variables (it references them directly).                  |
//+------------------------------------------------------------------+

//--- offset persisted so a restart never replays old commands
string TG_OffsetKey() { return "GB_TG_OFFSET_" + (string)InpMagicNumber; }

//--- crude JSON field extraction (Telegram responses are predictable)
long TG_ExtractLong(string src, string key, int from)
{
   int p = StringFind(src, key, from);
   if(p < 0) return LONG_MIN;
   p += StringLen(key);
   int e = p;
   while(e < StringLen(src))
   {
      ushort c = StringGetCharacter(src, e);
      if((c < '0' || c > '9') && c != '-') break;
      e++;
   }
   return StringToInteger(StringSubstr(src, p, e - p));
}

string TG_ExtractText(string src, int from)
{
   int p = StringFind(src, "\"text\":\"", from);
   if(p < 0) return "";
   p += 8;
   int e = p;
   while(e < StringLen(src) && StringGetCharacter(src, e) != '"')
   {
      if(StringGetCharacter(src, e) == '\\') e++; // skip escaped char
      e++;
   }
   return StringSubstr(src, p, e - p);
}

//--- manual market order using the EA's own SL/TP + sizing logic
void TG_ManualTrade(int dir, double lotOverride)
{
   ENUM_ORDER_TYPE type = (dir > 0) ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   double sl, tp, slPips;
   double pipSize = SymbolInfoDouble(gSymbol, SYMBOL_POINT) * 10;
   if(gRtUseATR)
   {
      sl = GetATRSLPrice(gSymbol, InpTimeframe, type, InpATRPeriod, InpATRSLMult);
      tp = GetATRTPPrice(gSymbol, InpTimeframe, type, InpATRPeriod, InpATRTPMult);
      slPips = ATR(gSymbol, InpTimeframe, InpATRPeriod) * InpATRSLMult / pipSize;
   }
   else
   {
      sl = GetSLPrice(gSymbol, type, gRtFixedSL);
      tp = GetTPPrice(gSymbol, type, gRtFixedTP);
      slPips = gRtFixedSL;
   }

   double lot = (lotOverride > 0)
      ? NormalizeLot(lotOverride, gSymbol)
      : (gCostProfile.commissionBased
           ? Cost_AwareLotSize(gSymbol, gCostProfile, gRtRiskPercent, slPips)
           : CalculateLotSize(gSymbol, LOT_PERCENT, InpFixedLot, gRtRiskPercent, slPips));

   bool ok = (dir > 0)
      ? Trade.Buy(lot, gSymbol, 0, sl, tp, "GhostsBrigad-TG")
      : Trade.Sell(lot, gSymbol, 0, sl, tp, "GhostsBrigad-TG");

   if(ok) Notifier_SendTelegram(StringFormat(
      "Ordre manuel execute: %s %s %.2f lot | SL %.2f | TP %.2f",
      (dir > 0 ? "ACHAT" : "VENTE"), gSymbol, lot, sl, tp));
   else Notifier_SendTelegram("Echec ordre manuel: " +
      Trade.ResultRetcodeDescription());
}

string TG_StatusText()
{
   int    n   = CountPositions(gSymbol, InpMagicNumber);
   double flo = GetTotalFloatingPnL(gSymbol, InpMagicNumber);
   return StringFormat(
      "%s | %s\nSolde: %.2f | Equity: %.2f\nPositions: %d (flottant %+.2f)\n"
      "Risque/trade: %.2f%% | SL/TP: %s\nSpread: %.1f pips (cout total %.1f)\n"
      "Confluence min: %.0f | Sentinel: %s",
      gSymbol, (gRtPaused ? "EN PAUSE" : (gTradingEnabled ? "ACTIF" : "STOPPE (drawdown)")),
      AccountInfoDouble(ACCOUNT_BALANCE), AccountInfoDouble(ACCOUNT_EQUITY),
      n, flo, gRtRiskPercent,
      (gRtUseATR ? "ATR auto" : StringFormat("fixe %.0f/%.0f pips", gRtFixedSL, gRtFixedTP)),
      GetSpreadPips(gSymbol), Cost_RoundTripPips(gSymbol, gCostProfile),
      gRtConfluenceMin, (InpUseSentinel ? "ON" : "OFF"));
}

string TG_PositionsText()
{
   string out = "";
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!PositionInfo.SelectByIndex(i)) continue;
      if(PositionInfo.Symbol() != gSymbol || PositionInfo.Magic() != InpMagicNumber) continue;
      out += StringFormat("#%I64u %s %.2f lot @ %.2f | SL %.2f | P&L %+.2f\n",
         PositionInfo.Ticket(),
         (PositionInfo.PositionType() == POSITION_TYPE_BUY ? "ACHAT" : "VENTE"),
         PositionInfo.Volume(), PositionInfo.PriceOpen(),
         PositionInfo.StopLoss(), PositionInfo.Profit());
   }
   return (out == "") ? "Aucune position ouverte sur " + gSymbol : out;
}

//--- execute one command line
void TG_HandleCommand(string text)
{
   StringTrimLeft(text); StringTrimRight(text);
   string parts[];
   int n = StringSplit(text, ' ', parts);
   if(n == 0) return;
   string cmd = parts[0];
   StringToLower(cmd);
   double arg = (n > 1) ? StringToDouble(parts[1]) : 0;

   if(cmd == "/status")      { Notifier_SendTelegram(TG_StatusText()); }
   else if(cmd == "/positions") { Notifier_SendTelegram(TG_PositionsText()); }
   else if(cmd == "/pause")
   {
      gRtPaused = true;
      Notifier_SendTelegram("Bot EN PAUSE sur " + gSymbol +
         ": plus de nouveaux trades. Positions toujours gerees. /resume pour reprendre.");
   }
   else if(cmd == "/resume")
   {
      gRtPaused = false; gTradingEnabled = true;
      Notifier_SendTelegram("Bot ACTIF sur " + gSymbol + ".");
   }
   else if(cmd == "/close")
   {
      int before = CountPositions(gSymbol, InpMagicNumber);
      CloseAllPositions(gSymbol, InpMagicNumber);
      Notifier_SendTelegram(StringFormat("%d position(s) fermee(s) sur %s.", before, gSymbol));
   }
   else if(cmd == "/buy")  { TG_ManualTrade( 1, arg); }
   else if(cmd == "/sell") { TG_ManualTrade(-1, arg); }
   else if(cmd == "/risk" && arg > 0 && arg <= 5)
   {
      gRtRiskPercent = arg;
      Notifier_SendTelegram(StringFormat("Risque par trade: %.2f%%", gRtRiskPercent));
   }
   else if(cmd == "/sl" && arg > 0)
   {
      gRtFixedSL = arg; gRtUseATR = false;
      Notifier_SendTelegram(StringFormat("SL fixe: %.0f pips (mode ATR desactive)", arg));
   }
   else if(cmd == "/tp" && arg > 0)
   {
      gRtFixedTP = arg; gRtUseATR = false;
      Notifier_SendTelegram(StringFormat("TP fixe: %.0f pips (mode ATR desactive)", arg));
   }
   else if(cmd == "/atr")
   {
      gRtUseATR = true;
      Notifier_SendTelegram("SL/TP en mode ATR automatique.");
   }
   else if(cmd == "/maxspread" && arg > 0)
   {
      gRtMaxSpread = arg;
      Notifier_SendTelegram(StringFormat("Spread max: %.1f pips", arg));
   }
   else if(cmd == "/confluence" && n > 1)
   {
      gRtConfluenceMin = arg;
      Notifier_SendTelegram(StringFormat("Score de confluence minimum: %.0f", arg));
   }
   else if(cmd == "/help" || cmd == "/start")
   {
      Notifier_SendTelegram(
         "Commandes GhostsBrigad (" + gSymbol + "):\n"
         "/status - etat complet\n/positions - positions ouvertes\n"
         "/pause /resume - suspendre/reprendre\n/close - tout fermer\n"
         "/buy [lot] /sell [lot] - ordre manuel\n"
         "/risk 1.0 - % risque par trade\n"
         "/sl 30 /tp 50 - SL/TP fixes en pips\n/atr - SL/TP auto (ATR)\n"
         "/maxspread 3 - spread max\n/confluence 20 - score min");
   }
   else Notifier_SendTelegram("Commande inconnue: " + cmd + " (essaie /help)");
}

//--- poll getUpdates; execute commands from the authorized chat only
void TG_Poll()
{
   if(StringLen(gNotifyTgToken) == 0 || StringLen(gNotifyTgChatID) == 0) return;

   long offset = GlobalVariableCheck(TG_OffsetKey())
      ? (long)GlobalVariableGet(TG_OffsetKey()) : 0;

   string url = "https://api.telegram.org/bot" + gNotifyTgToken +
                "/getUpdates?timeout=0&offset=" + (string)offset;
   char post[], result[];
   string resultHeaders;
   int status = WebRequest("GET", url, "", 4000, post, result, resultHeaders);
   if(status != 200) return;

   string body = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   long authorizedChat = StringToInteger(gNotifyTgChatID);

   int pos = 0;
   while(true)
   {
      int u = StringFind(body, "\"update_id\":", pos);
      if(u < 0) break;
      long updateId = TG_ExtractLong(body, "\"update_id\":", pos);
      int next = StringFind(body, "\"update_id\":", u + 12);
      int blockEnd = (next < 0) ? StringLen(body) : next;

      long chatId = TG_ExtractLong(StringSubstr(body, u, blockEnd - u), "\"chat\":{\"id\":", 0);
      string text = TG_ExtractText(StringSubstr(body, u, blockEnd - u), 0);

      if(updateId != LONG_MIN)
         GlobalVariableSet(TG_OffsetKey(), (double)(updateId + 1));

      // security: only the configured chat can control the bot
      if(chatId == authorizedChat && StringLen(text) > 0)
         TG_HandleCommand(text);
      else if(chatId != LONG_MIN && chatId != authorizedChat)
         Print("TelegramControl: commande ignoree d'un chat non autorise (", chatId, ")");

      pos = blockEnd;
   }
}
