//+------------------------------------------------------------------+
//| Notifier.mqh - Outbound notifications (MT5 push + Telegram)     |
//|                                                                  |
//| Two channels, both optional:                                    |
//|  1. MT5 push -> the MetaTrader mobile app (needs your MetaQuotes|
//|     ID in Tools > Options > Notifications)                      |
//|  2. Telegram -> your own bot (create one with @BotFather, put   |
//|     the token + your chat id in the EA inputs, and whitelist    |
//|     https://api.telegram.org in Tools > Options > Expert        |
//|     Advisors > Allow WebRequest for listed URL)                 |
//| Failures are logged once and never block trading.               |
//+------------------------------------------------------------------+
#pragma once

bool   gNotifyPush       = false;
string gNotifyTgToken    = "";
string gNotifyTgChatID   = "";
bool   gNotifyTgWarned   = false;

void Notifier_Init(bool push, string tgToken, string tgChatID)
{
   gNotifyPush     = push;
   gNotifyTgToken  = tgToken;
   gNotifyTgChatID = tgChatID;
}

void Notifier_SendTelegram(string text)
{
   if(StringLen(gNotifyTgToken) == 0 || StringLen(gNotifyTgChatID) == 0) return;

   string url = "https://api.telegram.org/bot" + gNotifyTgToken + "/sendMessage";
   string body = "chat_id=" + gNotifyTgChatID + "&text=" + text;

   char post[], result[];
   StringToCharArray(body, post, 0, StringLen(body));
   string headers = "Content-Type: application/x-www-form-urlencoded\r\n";
   string resultHeaders;

   ResetLastError();
   int status = WebRequest("POST", url, headers, 5000, post, result, resultHeaders);
   if(status == -1 && !gNotifyTgWarned)
   {
      Print("Notifier: Telegram indisponible (erreur ", GetLastError(),
            "). Ajoute https://api.telegram.org dans Outils > Options > ",
            "Expert Advisors > Autoriser WebRequest.");
      gNotifyTgWarned = true;
   }
}

//--- Send to every enabled channel (plus the Experts log)
void Notify(string message)
{
   Print("NOTIFY: ", message);
   if(gNotifyPush) SendNotification(message);
   Notifier_SendTelegram(message);
}
