//+------------------------------------------------------------------+
//| NewsSentiment.mqh - Sentinel feed reader (news + Telegram)      |
//|                                                                  |
//| Reads the feed file written by the Python "Sentinel" service    |
//| (sentinel/ folder of this repo) into the MT5 COMMON Files       |
//| directory. The service aggregates Telegram channels, financial  |
//| RSS feeds and the economic calendar into:                       |
//|   - a sentiment score per symbol  (-1.0 .. +1.0)                |
//|   - high-impact news blackout windows per currency              |
//|                                                                  |
//| Feed file format (ghostsbrigad_sentinel.txt, one item per line):|
//|   generated=1719930000                                          |
//|   S,EURUSD,0.42,0.80,17          <- symbol,score,confidence,msgs|
//|   B,1719931800,1719933600,USD,HIGH,Non-Farm Payrolls            |
//+------------------------------------------------------------------+
#pragma once

#define SENTINEL_FILE      "ghostsbrigad_sentinel.txt"
#define SENTINEL_MAX_ROWS  128

struct SentimentInfo
{
   bool     valid;       // feed present, fresh, and symbol found
   double   score;       // -1.0 (very bearish) .. +1.0 (very bullish)
   double   confidence;  // 0.0 .. 1.0 (source agreement & volume)
   int      messages;    // number of messages/articles aggregated
   datetime generated;   // when the feed was produced
};

struct BlackoutEvent
{
   datetime start;
   datetime end;
   string   currency;   // "USD", "EUR", ... or "ALL"
   string   impact;     // "HIGH" / "MEDIUM"
   string   title;
};

//--- module cache (re-read the file at most every N seconds)
datetime      gSentinelLastRead   = 0;
datetime      gSentinelGenerated  = 0;
string        gSentinelSymbols[SENTINEL_MAX_ROWS];
double        gSentinelScores[SENTINEL_MAX_ROWS];
double        gSentinelConf[SENTINEL_MAX_ROWS];
int           gSentinelMsgs[SENTINEL_MAX_ROWS];
int           gSentinelCount      = 0;
BlackoutEvent gSentinelEvents[SENTINEL_MAX_ROWS];
int           gSentinelEventCount = 0;

//--- (Re)load the feed file from the COMMON Files folder
void Sentinel_Refresh(int cacheSeconds = 60)
{
   if(TimeCurrent() - gSentinelLastRead < cacheSeconds) return;
   gSentinelLastRead = TimeCurrent();

   int handle = FileOpen(SENTINEL_FILE, FILE_READ | FILE_TXT | FILE_ANSI | FILE_COMMON);
   if(handle == INVALID_HANDLE) { gSentinelCount = 0; gSentinelEventCount = 0; return; }

   gSentinelCount      = 0;
   gSentinelEventCount = 0;
   gSentinelGenerated  = 0;

   while(!FileIsEnding(handle))
   {
      string line = FileReadString(handle);
      StringTrimLeft(line);
      StringTrimRight(line);
      if(StringLen(line) == 0 || StringGetCharacter(line, 0) == '#') continue;

      if(StringFind(line, "generated=") == 0)
      {
         gSentinelGenerated = (datetime)StringToInteger(StringSubstr(line, 10));
         continue;
      }

      string parts[];
      int n = StringSplit(line, ',', parts);

      // S,SYMBOL,score,confidence,messages
      if(n >= 5 && parts[0] == "S" && gSentinelCount < SENTINEL_MAX_ROWS)
      {
         gSentinelSymbols[gSentinelCount] = parts[1];
         gSentinelScores[gSentinelCount]  = StringToDouble(parts[2]);
         gSentinelConf[gSentinelCount]    = StringToDouble(parts[3]);
         gSentinelMsgs[gSentinelCount]    = (int)StringToInteger(parts[4]);
         gSentinelCount++;
      }
      // B,start,end,currency,impact,title
      else if(n >= 6 && parts[0] == "B" && gSentinelEventCount < SENTINEL_MAX_ROWS)
      {
         gSentinelEvents[gSentinelEventCount].start    = (datetime)StringToInteger(parts[1]);
         gSentinelEvents[gSentinelEventCount].end      = (datetime)StringToInteger(parts[2]);
         gSentinelEvents[gSentinelEventCount].currency = parts[3];
         gSentinelEvents[gSentinelEventCount].impact   = parts[4];
         gSentinelEvents[gSentinelEventCount].title    = parts[5];
         gSentinelEventCount++;
      }
   }
   FileClose(handle);
}

//--- Get sentiment for a symbol. Stale feeds are treated as invalid
//    so the EA never acts on outdated information.
SentimentInfo Sentinel_GetSentiment(string symbol, int maxAgeMinutes)
{
   SentimentInfo info;
   info.valid = false; info.score = 0; info.confidence = 0;
   info.messages = 0;  info.generated = 0;

   Sentinel_Refresh();

   if(gSentinelGenerated == 0) return info;
   if(TimeCurrent() - gSentinelGenerated > maxAgeMinutes * 60) return info;

   for(int i = 0; i < gSentinelCount; i++)
   {
      if(gSentinelSymbols[i] == symbol)
      {
         info.valid      = true;
         info.score      = gSentinelScores[i];
         info.confidence = gSentinelConf[i];
         info.messages   = gSentinelMsgs[i];
         info.generated  = gSentinelGenerated;
         return info;
      }
   }
   return info;
}

//--- True if a currency string is relevant to the symbol
//    (matches base or profit currency, or "ALL")
bool Sentinel_CurrencyMatches(string symbol, string currency)
{
   if(currency == "ALL") return true;
   string base   = SymbolInfoString(symbol, SYMBOL_CURRENCY_BASE);
   string profit = SymbolInfoString(symbol, SYMBOL_CURRENCY_PROFIT);
   return (currency == base || currency == profit);
}

//--- True if we are inside a news blackout window for this symbol.
//    preMinutes/postMinutes extend the window on both sides.
bool Sentinel_InBlackout(
   string symbol,
   int    preMinutes,
   int    postMinutes,
   bool   highImpactOnly,
   string &eventTitle // out: which event triggered the blackout
)
{
   Sentinel_Refresh();
   eventTitle = "";

   datetime now = TimeCurrent();
   for(int i = 0; i < gSentinelEventCount; i++)
   {
      if(highImpactOnly && gSentinelEvents[i].impact != "HIGH") continue;
      if(!Sentinel_CurrencyMatches(symbol, gSentinelEvents[i].currency)) continue;

      datetime from = gSentinelEvents[i].start - preMinutes  * 60;
      datetime to   = gSentinelEvents[i].end   + postMinutes * 60;
      if(now >= from && now <= to)
      {
         eventTitle = gSentinelEvents[i].title + " (" + gSentinelEvents[i].currency + ")";
         return true;
      }
   }
   return false;
}

//--- Entry gate: veto trades that fight strong sentiment.
//    direction: +1 buy / -1 sell. Returns false = do NOT trade.
//    A missing/stale feed never blocks trading (fail-open) so the
//    EA keeps working if the Sentinel service is down.
bool Sentinel_AllowTrade(
   string symbol,
   int    direction,
   int    maxAgeMinutes,
   double vetoLevel,      // e.g. 0.5: block buy if score <= -0.5
   double minConfidence   // ignore weak/low-volume readings
)
{
   SentimentInfo s = Sentinel_GetSentiment(symbol, maxAgeMinutes);
   if(!s.valid || s.confidence < minConfidence) return true;

   if(direction > 0 && s.score <= -vetoLevel) return false;
   if(direction < 0 && s.score >=  vetoLevel) return false;
   return true;
}
