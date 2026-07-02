//+------------------------------------------------------------------+
//|                         GhostsBrigad_EA.mq5                     |
//|                    Multi-Strategy Scalping Bot                   |
//|              Compatible with Exness MT5 | MQL5 2024             |
//+------------------------------------------------------------------+
#property copyright "GhostsBrigad"
#property link      ""
#property version   "2.00"
#property strict

//--- Include utilities and risk
#include "Utils/TradeUtils.mqh"
#include "Utils/Indicators.mqh"
#include "Risk/RiskManager.mqh"
#include "Account/AccountProfile.mqh"
#include "News/NewsSentiment.mqh"
#include "Exit/ExitManager.mqh"
#include "Filters/ScalpFilters.mqh"
#include "Analysis/Confluence.mqh"

//--- Include strategies
#include "Strategies/EMA_Scalping.mqh"
#include "Strategies/RSI_Scalping.mqh"
#include "Strategies/BB_Scalping.mqh"
#include "Strategies/MACD_Scalping.mqh"
#include "Strategies/SR_Scalping.mqh"

//==================================================================
//  STRATEGY SELECTION
//==================================================================
enum ENUM_STRATEGY
{
   STRATEGY_EMA   = 0, // EMA Crossover Scalping
   STRATEGY_RSI   = 1, // RSI Mean-Reversion Scalping
   STRATEGY_BB    = 2, // Bollinger Bands Scalping
   STRATEGY_MACD  = 3, // MACD Momentum Scalping
   STRATEGY_SR    = 4, // Support/Resistance Price Action
   STRATEGY_COMBO = 5, // Combined (2+ strategies must agree)
};

//==================================================================
//  INPUT PARAMETERS
//==================================================================

//--- General Settings
input group "=== GENERAL SETTINGS ==="
input ENUM_STRATEGY  InpStrategy       = STRATEGY_COMBO;  // Active Strategy
input string         InpSymbol         = "";              // Symbol (blank = chart symbol)
input ENUM_TIMEFRAMES InpTimeframe     = PERIOD_M5;       // Main Timeframe
input long           InpMagicNumber    = 202401;          // Magic Number
input string         InpTradeComment   = "GhostsBrigad";  // Trade Comment

//--- Trading Hours (Exness 24/5 - best hours for scalping)
input group "=== TRADING HOURS (Server Time) ==="
input bool  InpUseTimeFilter  = true;    // Enable Time Filter
input int   InpStartHour      = 8;       // Start Hour (08:00 London open)
input int   InpEndHour        = 20;      // End Hour   (20:00 NY close)
input bool  InpNoTradeOnFriday = true;   // Close Positions Before Weekend

//--- Account Type & Fees (Exness)
input group "=== ACCOUNT TYPE & FEES (Exness) ==="
input ENUM_ACCOUNT_TYPE InpAccountType     = ACC_AUTO; // Account Type (Standard/Cent/Pro/Raw/Zero)
input double            InpCommissionPerLot = -1.0;    // Commission USD/lot/side (-1 = default for type)
input double            InpMaxTotalCostPips = 3.0;     // Max Total Cost: spread+commission (pips)
input double            InpCostTPMultiple   = 3.0;     // TP must be >= N x total cost

//--- Sentinel: news & Telegram sentiment feed
input group "=== SENTINEL (News + Telegram Sentiment) ==="
input bool   InpUseSentinel       = true;   // Use Sentinel Feed (if service running)
input int    InpSentinelMaxAgeMin = 30;     // Max Feed Age (minutes)
input double InpSentinelVetoLevel = 0.5;    // Veto Level (block trades against sentiment)
input double InpSentinelMinConf   = 0.3;    // Min Confidence to act on sentiment
input bool   InpUseNewsBlackout   = true;   // Block Entries Around High-Impact News
input int    InpBlackoutPreMin    = 30;     // Blackout Before Event (minutes)
input int    InpBlackoutPostMin   = 15;     // Blackout After Event (minutes)
input bool   InpCloseBeforeNews   = false;  // Close Positions Before High-Impact News

//--- Scalping Discipline Filters
input group "=== SCALPING FILTERS ==="
input bool   InpUseVolRegime     = true;   // Volatility Regime Filter
input int    InpAtrBasePeriod    = 100;    // ATR Baseline Period
input double InpMinAtrRatio      = 0.7;    // Min ATR / Baseline Ratio
input double InpMaxAtrRatio      = 2.0;    // Max ATR / Baseline Ratio
input bool   InpUseExhaustionFlt = true;   // Skip After Exhaustion Bar
input double InpExhaustionMult   = 2.5;    // Exhaustion Bar (x ATR)
input bool   InpUseRolloverFlt   = true;   // Rollover Blackout (spread spike)
input int    InpRolloverStart    = 22;     // Rollover Start Hour (server)
input int    InpRolloverEnd      = 23;     // Rollover End Hour (server)
input bool   InpUseLossCooldown  = true;   // Cooldown After Loss Streak
input int    InpCooldownLosses   = 3;      // Losses to Trigger Cooldown
input int    InpCooldownMinutes  = 120;    // Cooldown Duration (minutes)
input int    InpMaxTradesPerDay  = 10;     // Max Trades Per Day (0 = off)
input int    InpMinBarsBetween   = 3;      // Min Bars Between Entries
input bool   InpUseAdaptiveRisk  = true;   // Adaptive Risk (anti-martingale)

//--- Advanced Analysis (confluence of institutional methods)
input group "=== ANALYSE AVANCEE (CONFLUENCE) ==="
input bool   InpUseConfluence    = true;   // Enable Confluence Gate
input double InpConfluenceMin    = 20.0;   // Min Score to Confirm Signal (0-100)
input int    InpConfluenceMinN   = 2;      // Min Methods With an Opinion
input bool   InpConfDow          = true;   // Dow Theory (market structure)
input bool   InpConfPriceAction  = true;   // Price Action (pin/engulfing/inside)
input bool   InpConfFibonacci    = true;   // Fibonacci Retracement
input bool   InpConfWyckoff      = true;   // Wyckoff (spring/upthrust)
input bool   InpConfSMC          = true;   // Smart Money Concepts
input bool   InpConfVWAP         = true;   // VWAP (session)
input bool   InpConfVolProfile   = true;   // Volume Profile (POC/VA)
input bool   InpConfOrderFlow    = true;   // Order Flow (tick-volume delta)
input bool   InpConfElliott      = false;  // Elliott Wave (experimental)
input bool   InpConfGann         = false;  // Gann 1x1 (experimental)

//--- Smart Exits
input group "=== SMART EXITS ==="
input bool   InpUsePartialClose   = true;   // Partial Close at Trigger
input double InpPartialTriggerR   = 1.0;    // Partial Trigger (x initial risk)
input double InpPartialPercent    = 50.0;   // Partial Close (%)
input bool   InpUseChandelier     = true;   // Chandelier Trail After Partial
input double InpChandelierMult    = 2.0;    // Chandelier ATR Multiplier
input bool   InpUseTimeStop       = true;   // Time Stop for Stagnant Trades
input int    InpTimeStopBars      = 24;     // Time Stop (bars)
input bool   InpExitSentimentFlip = true;   // Exit on Strong Sentiment Flip
input double InpFlipLevel         = 0.6;    // Flip Level (|score|)

//--- Risk Management
input group "=== RISK MANAGEMENT ==="
input ENUM_LOT_MODE  InpLotMode        = LOT_PERCENT;     // Lot Calculation Mode
input double         InpFixedLot       = 0.01;            // Fixed Lot Size
input double         InpRiskPercent    = 1.0;             // Risk % per Trade
input double         InpMaxSpreadPips  = 3.0;             // Max Spread (pips)
input int            InpMaxPositions   = 3;               // Max Concurrent Positions
input double         InpDailyLossLimit = 5.0;             // Daily Loss Limit (%)
input double         InpMaxDrawdown    = 15.0;            // Max Drawdown (%)

//--- Stop Loss / Take Profit
input group "=== SL / TP ==="
input bool   InpUseATRSLTP    = true;    // Use ATR for SL/TP
input int    InpATRPeriod     = 14;      // ATR Period
input double InpATRSLMult     = 1.5;     // ATR Multiplier for SL
input double InpATRTPMult     = 2.5;     // ATR Multiplier for TP
input double InpFixedSLPips   = 15.0;   // Fixed SL (pips) if ATR disabled
input double InpFixedTPPips   = 25.0;   // Fixed TP (pips) if ATR disabled

//--- Trailing Stop
input group "=== TRAILING STOP ==="
input bool   InpUseTrailing    = true;   // Enable Trailing Stop
input double InpTrailPips      = 10.0;  // Trailing Distance (pips)
input double InpTrailStep      = 2.0;   // Trailing Step (pips)

//--- Break Even
input group "=== BREAK EVEN ==="
input bool   InpUseBreakEven   = true;  // Enable Break Even
input double InpBEtriggerPips  = 12.0; // Trigger Distance (pips)
input double InpBEoffsetPips   = 1.0;  // BE Offset (pips)

//--- Martingale (use with caution)
input group "=== MARTINGALE (Advanced - Risky) ==="
input bool   InpUseMartingale  = false;  // Enable Martingale
input double InpMartMultiplier = 2.0;    // Lot Multiplier on Loss
input int    InpMartMaxLevels  = 3;      // Max Martingale Levels

//--- EMA Strategy Parameters
input group "=== EMA SCALPING PARAMETERS ==="
input int    InpEMAFast        = 8;     // Fast EMA Period
input int    InpEMASlow        = 21;    // Slow EMA Period
input int    InpEMATrend       = 50;    // Trend EMA Period
input int    InpADXPeriod      = 14;    // ADX Period
input double InpADXThreshold   = 20.0; // ADX Minimum (trend strength)

//--- RSI Strategy Parameters
input group "=== RSI SCALPING PARAMETERS ==="
input int    InpRSIPeriod      = 14;    // RSI Period
input double InpRSIOversold    = 30.0; // RSI Oversold Level
input double InpRSIOverbought  = 70.0; // RSI Overbought Level
input int    InpStochK         = 5;    // Stochastic %K
input int    InpStochD         = 3;    // Stochastic %D
input int    InpStochSlowing   = 3;    // Stochastic Slowing

//--- BB Strategy Parameters
input group "=== BOLLINGER BANDS PARAMETERS ==="
input int    InpBBPeriod       = 20;    // BB Period
input double InpBBDeviation    = 2.0;  // BB Deviation
input BB_MODE InpBBMode        = BB_REVERSAL; // BB Mode

//--- MACD Strategy Parameters
input group "=== MACD SCALPING PARAMETERS ==="
input int    InpMACDFast       = 12;   // MACD Fast EMA
input int    InpMACDSlow       = 26;   // MACD Slow EMA
input int    InpMACDSignal     = 9;    // MACD Signal Period
input bool   InpMACDZeroCross  = false; // Use Zero-Line Cross

//--- S/R Strategy Parameters
input group "=== S/R SCALPING PARAMETERS ==="
input double InpSRZonePips     = 5.0;  // S/R Zone Width (pips)
input int    InpSRLookback     = 30;   // Lookback Bars for Swings
input int    InpSRLeftBars     = 3;    // Left Bars for Swing Detection
input bool   InpSRUsePivots    = true; // Use Daily Pivots
input bool   InpSRUseSwings    = true; // Use Swing Highs/Lows

//--- Higher Timeframe Filter
input group "=== HTF TREND FILTER ==="
input bool            InpUseHTF   = true;          // Enable HTF Filter
input ENUM_TIMEFRAMES InpHTF      = PERIOD_H1;     // Higher Timeframe
input int             InpHTFEMA   = 50;            // HTF EMA Period

//--- Combo Mode
input group "=== COMBO MODE ==="
input bool InpComboEMA   = true;  // Include EMA in Combo
input bool InpComboRSI   = true;  // Include RSI in Combo
input bool InpComboBB    = false; // Include BB in Combo
input bool InpComboMACD  = true;  // Include MACD in Combo
input bool InpComboSR    = false; // Include S/R in Combo
input int  InpComboMinAgree = 2;  // Min Strategies to Agree
input int  InpComboWindowBars = 3; // Vote Validity Window (bars)

//==================================================================
//  GLOBAL VARIABLES
//==================================================================
string             gSymbol;
bool               gTradingEnabled = true;
AccountCostProfile gCostProfile;
ExitParams         gExitParams;
ConfluenceConfig   gConfluence;

//==================================================================
//  EA INITIALIZATION
//==================================================================
int OnInit()
{
   gSymbol = (StringLen(InpSymbol) > 0) ? InpSymbol : _Symbol;

   Trade.SetExpertMagicNumber(InpMagicNumber);
   Trade.SetDeviationInPoints(30); // 3 pips slippage tolerance (Exness)
   Trade.SetTypeFilling(ORDER_FILLING_IOC); // Exness uses IOC or FOK

   // Validate inputs
   if(InpFixedSLPips <= 0 && !InpUseATRSLTP)
   {
      Print("ERROR: SL must be > 0 when ATR SL is disabled.");
      return INIT_PARAMETERS_INCORRECT;
   }

   // Account type & cost model (spread + commission per account type)
   AccountProfile_Init(gCostProfile, InpAccountType, InpCommissionPerLot, gSymbol);
   Print("GhostsBrigad cost model | ", Cost_Summary(gSymbol, gCostProfile));

   // Smart-exit parameters
   gExitParams.usePartialClose     = InpUsePartialClose;
   gExitParams.partialTriggerR     = InpPartialTriggerR;
   gExitParams.partialPercent      = InpPartialPercent;
   gExitParams.useTimeStop         = InpUseTimeStop;
   gExitParams.timeStopBars        = InpTimeStopBars;
   gExitParams.timeframe           = InpTimeframe;
   gExitParams.useChandelier       = InpUseChandelier;
   gExitParams.atrPeriod           = InpATRPeriod;
   gExitParams.chandelierMult      = InpChandelierMult;
   gExitParams.exitOnSentimentFlip = InpUseSentinel && InpExitSentimentFlip;
   gExitParams.flipLevel           = InpFlipLevel;
   gExitParams.flipMinConfidence   = InpSentinelMinConf;
   gExitParams.sentimentMaxAgeMin  = InpSentinelMaxAgeMin;
   gExitParams.closeBeforeNews     = InpUseSentinel && InpCloseBeforeNews;
   gExitParams.newsPreMinutes      = InpBlackoutPreMin;

   // Confluence engine configuration
   gConfluence.useDow         = InpConfDow;
   gConfluence.usePriceAction = InpConfPriceAction;
   gConfluence.useFibonacci   = InpConfFibonacci;
   gConfluence.useWyckoff     = InpConfWyckoff;
   gConfluence.useSMC         = InpConfSMC;
   gConfluence.useVWAP        = InpConfVWAP;
   gConfluence.useVolProfile  = InpConfVolProfile;
   gConfluence.useOrderFlow   = InpConfOrderFlow;
   gConfluence.useElliott     = InpConfElliott;
   gConfluence.useGann        = InpConfGann;

   Print("GhostsBrigad EA v2.0 initialized | Symbol: ", gSymbol,
         " | Strategy: ", EnumToString(InpStrategy),
         " | Magic: ", InpMagicNumber,
         " | Sentinel: ", (InpUseSentinel ? "ON" : "OFF"),
         " | Confluence: ", (InpUseConfluence ? "ON" : "OFF"));

   return INIT_SUCCEEDED;
}

//==================================================================
//  EA DE-INITIALIZATION
//==================================================================
void OnDeinit(const int reason)
{
   Print("GhostsBrigad EA stopped. Reason: ", reason);
}

//==================================================================
//  MAIN TICK FUNCTION
//==================================================================
void OnTick()
{
   // Only process on new bar
   if(!IsNewBar(gSymbol, InpTimeframe)) return;

   // Safety checks
   if(!gTradingEnabled)      return;
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED)) return;
   if(!MQLInfoInteger(MQL_TRADE_ALLOWED)) return;

   // Friday close positions before weekend
   if(InpNoTradeOnFriday)
   {
      MqlDateTime dt;
      TimeToStruct(TimeCurrent(), dt);
      if(dt.day_of_week == 5 && dt.hour >= 20)
      {
         CloseAllPositions(gSymbol, InpMagicNumber);
         return;
      }
   }

   // Risk checks
   if(IsDailyLossLimitReached(InpDailyLossLimit))
   {
      static bool warned = false;
      if(!warned) { Print("Daily loss limit reached. No new trades."); warned = true; }
      ManageOpenPositions();
      return;
   }

   if(IsMaxDrawdownReached(InpMaxDrawdown))
   {
      static bool warnedDD = false;
      if(!warnedDD) { Print("Max drawdown reached. Closing all positions."); warnedDD = true; }
      CloseAllPositions(gSymbol, InpMagicNumber);
      gTradingEnabled = false;
      return;
   }

   // Time filter
   if(InpUseTimeFilter && !IsWithinTradingHours(InpStartHour, InpEndHour))
   {
      ManageOpenPositions();
      return;
   }

   // Spread filter (raw spread) + total cost filter (spread + commission)
   if(!IsSpreadAcceptable(gSymbol, InpMaxSpreadPips) ||
      !Cost_IsSpreadAcceptable(gSymbol, gCostProfile, InpMaxTotalCostPips))
   {
      ManageOpenPositions();
      return;
   }

   // News blackout: no NEW entries around high-impact events
   if(InpUseSentinel && InpUseNewsBlackout)
   {
      string eventTitle;
      if(Sentinel_InBlackout(gSymbol, InpBlackoutPreMin, InpBlackoutPostMin, true, eventTitle))
      {
         static string lastEvent = "";
         if(eventTitle != lastEvent)
         {
            Print("News blackout active, no new entries: ", eventTitle);
            lastEvent = eventTitle;
         }
         ManageOpenPositions();
         return;
      }
   }

   // Max positions check
   if(CountPositions(gSymbol, InpMagicNumber) >= InpMaxPositions)
   {
      ManageOpenPositions();
      return;
   }

   // Scalping discipline filters (see Filters/ScalpFilters.mqh)
   if(!PassScalpFilters())
   {
      ManageOpenPositions();
      return;
   }

   // Get trade signal
   int signal = GetSignal();
   if(signal == 0)
   {
      ManageOpenPositions();
      return;
   }

   // HTF filter
   if(InpUseHTF)
   {
      bool htfBull = EMAScalping_HTFConfirm(gSymbol, InpHTF, InpHTFEMA);
      if(signal == 1 && !htfBull)  { ManageOpenPositions(); return; }
      if(signal == -1 && htfBull)  { ManageOpenPositions(); return; }
   }

   // Sentiment gate: never fight strong, confident market sentiment
   if(InpUseSentinel &&
      !Sentinel_AllowTrade(gSymbol, signal, InpSentinelMaxAgeMin,
                           InpSentinelVetoLevel, InpSentinelMinConf))
   {
      Print("Trade vetoed by sentiment | Direction: ", signal);
      ManageOpenPositions();
      return;
   }

   // Confluence gate: the institutional-analysis methods (Dow, Price
   // Action, Fibonacci, Wyckoff, SMC, VWAP, Volume Profile, Order
   // Flow...) must agree with the signal direction.
   if(InpUseConfluence)
   {
      string confLog;
      if(!Confluence_AllowTrade(gSymbol, InpTimeframe, gConfluence,
                                signal, InpConfluenceMin,
                                InpConfluenceMinN, confLog))
      {
         Print("Trade vetoed by confluence | Direction: ", signal, " | ", confLog);
         ManageOpenPositions();
         return;
      }
      Print("Confluence confirms | Direction: ", signal, " | ", confLog);
   }

   // Calculate SL/TP
   ENUM_ORDER_TYPE orderType = (signal == 1) ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   double sl, tp;

   if(InpUseATRSLTP)
   {
      sl = GetATRSLPrice(gSymbol, InpTimeframe, orderType, InpATRPeriod, InpATRSLMult);
      tp = GetATRTPPrice(gSymbol, InpTimeframe, orderType, InpATRPeriod, InpATRTPMult);
   }
   else
   {
      sl = GetSLPrice(gSymbol, orderType, InpFixedSLPips);
      tp = GetTPPrice(gSymbol, orderType, InpFixedTPPips);
   }

   // Calculate SL/TP distances in pips
   double pipSize = SymbolInfoDouble(gSymbol, SYMBOL_POINT) * 10;
   double slPips  = InpUseATRSLTP
      ? (ATR(gSymbol, InpTimeframe, InpATRPeriod) * InpATRSLMult) / pipSize
      : InpFixedSLPips;
   double tpPips  = InpUseATRSLTP
      ? (ATR(gSymbol, InpTimeframe, InpATRPeriod) * InpATRTPMult) / pipSize
      : InpFixedTPPips;

   // Cost viability: skip trades whose TP does not clear the total
   // round-trip cost (spread + commission) by a safe multiple.
   if(!Cost_IsTradeViable(gSymbol, gCostProfile, tpPips, InpCostTPMultiple))
   {
      Print("Trade skipped: TP ", DoubleToString(tpPips, 1),
            " pips does not cover ", DoubleToString(InpCostTPMultiple, 1),
            "x cost (", DoubleToString(Cost_RoundTripPips(gSymbol, gCostProfile), 1), " pips)");
      ManageOpenPositions();
      return;
   }

   // Calculate lot size (commission included in risked amount).
   // Adaptive risk shrinks position size during a losing streak.
   double effRisk = InpUseAdaptiveRisk
      ? Scalp_AdaptiveRiskPercent(gSymbol, InpMagicNumber, InpRiskPercent)
      : InpRiskPercent;

   double lot;
   if(InpUseMartingale)
      lot = GetMartingaleLot(gSymbol, InpMagicNumber, InpFixedLot, InpMartMultiplier, InpMartMaxLevels);
   else if(InpLotMode == LOT_PERCENT && gCostProfile.commissionBased)
      lot = Cost_AwareLotSize(gSymbol, gCostProfile, effRisk, slPips);
   else
      lot = CalculateLotSize(gSymbol, InpLotMode, InpFixedLot, effRisk, slPips);

   if(!HasSufficientMargin(gSymbol, lot)) return;

   // Place trade
   bool result = false;
   if(orderType == ORDER_TYPE_BUY)
      result = Trade.Buy(lot, gSymbol, 0, sl, tp, InpTradeComment);
   else
      result = Trade.Sell(lot, gSymbol, 0, sl, tp, InpTradeComment);

   if(result)
      Print("Trade opened | ", EnumToString(orderType), " | Lot: ", lot,
            " | SL: ", sl, " | TP: ", tp,
            " | Signal: ", EnumToString(InpStrategy));
   else
      Print("Trade failed | Error: ", Trade.ResultRetcode(), " | ", Trade.ResultRetcodeDescription());

   ManageOpenPositions();
}

//==================================================================
//  SCALPING DISCIPLINE FILTERS
//==================================================================
bool PassScalpFilters()
{
   if(InpUseRolloverFlt &&
      !Scalp_OutsideRollover(InpRolloverStart, InpRolloverEnd))
      return false;

   if(InpUseVolRegime &&
      !Scalp_VolRegimeOK(gSymbol, InpTimeframe, InpATRPeriod,
                         InpAtrBasePeriod, InpMinAtrRatio, InpMaxAtrRatio))
      return false;

   if(InpUseExhaustionFlt &&
      !Scalp_NoExhaustionBar(gSymbol, InpTimeframe, InpATRPeriod,
                             InpExhaustionMult))
      return false;

   if(InpUseLossCooldown &&
      Scalp_LossCooldownActive(gSymbol, InpMagicNumber,
                               InpCooldownLosses, InpCooldownMinutes))
   {
      static datetime lastLog = 0;
      if(TimeCurrent() - lastLog > 1800)
      {
         Print("Loss cooldown active: pausing after ",
               InpCooldownLosses, " consecutive losses");
         lastLog = TimeCurrent();
      }
      return false;
   }

   if(!Scalp_DailyTradesOK(gSymbol, InpMagicNumber, InpMaxTradesPerDay))
      return false;

   if(!Scalp_EntrySpacingOK(gSymbol, InpMagicNumber, InpTimeframe,
                            InpMinBarsBetween))
      return false;

   return true;
}

//==================================================================
//  SIGNAL AGGREGATION
//==================================================================
int GetSignal()
{
   int direction = 0;

   switch(InpStrategy)
   {
      case STRATEGY_EMA:
      {
         EMAScalpSignal s = EMAScalping_GetSignal(
            gSymbol, InpTimeframe,
            InpEMAFast, InpEMASlow, InpEMATrend,
            InpADXPeriod, InpADXThreshold, true);
         direction = s.direction;
         break;
      }
      case STRATEGY_RSI:
      {
         RSIScalpSignal s = RSIScalping_GetSignal(
            gSymbol, InpTimeframe,
            InpRSIPeriod, InpRSIOversold, InpRSIOverbought,
            InpStochK, InpStochD, InpStochSlowing, 20.0, 80.0, true);
         direction = s.direction;
         break;
      }
      case STRATEGY_BB:
      {
         BBScalpSignal s = BBScalping_GetSignal(
            gSymbol, InpTimeframe, InpBBMode,
            InpBBPeriod, InpBBDeviation,
            InpRSIPeriod, 40.0, 60.0);
         direction = s.direction;
         break;
      }
      case STRATEGY_MACD:
      {
         MACDScalpSignal s = MACDScalping_GetSignal(
            gSymbol, InpTimeframe,
            InpMACDFast, InpMACDSlow, InpMACDSignal,
            InpEMATrend, InpMACDZeroCross, true, true);
         direction = s.direction;
         break;
      }
      case STRATEGY_SR:
      {
         SRScalpSignal s = SRScalping_GetSignal(
            gSymbol, InpTimeframe,
            InpSRZonePips, InpSRUsePivots, InpSRUseSwings,
            InpSRLookback, InpSRLeftBars);
         direction = s.direction;
         break;
      }
      case STRATEGY_COMBO:
      {
         direction = GetComboSignal();
         break;
      }
   }

   return direction;
}

//--- Combo vote memory: momentum signals (EMA cross, MACD flip, RSI
//    exit) rarely fire on the exact same bar even when they agree on
//    the move. Each strategy's last vote therefore stays valid for
//    InpComboWindowBars bars, and votes are counted over that window.
datetime gVoteTime[5] = {0, 0, 0, 0, 0}; // EMA, RSI, BB, MACD, SR
int      gVoteDir[5]  = {0, 0, 0, 0, 0};

void ComboRecordVote(int slot, int direction)
{
   if(direction == 0) return;
   gVoteDir[slot]  = direction;
   gVoteTime[slot] = iTime(gSymbol, InpTimeframe, 0);
}

bool ComboVoteActive(int slot)
{
   if(gVoteDir[slot] == 0 || gVoteTime[slot] == 0) return false;
   int windowSec = InpComboWindowBars * PeriodSeconds(InpTimeframe);
   return (iTime(gSymbol, InpTimeframe, 0) - gVoteTime[slot]) < windowSec;
}

//--- Combo: count strategies agreeing within the vote window
int GetComboSignal()
{
   if(InpComboEMA)
   {
      EMAScalpSignal s = EMAScalping_GetSignal(
         gSymbol, InpTimeframe,
         InpEMAFast, InpEMASlow, InpEMATrend,
         InpADXPeriod, InpADXThreshold, true);
      ComboRecordVote(0, s.direction);
   }

   if(InpComboRSI)
   {
      RSIScalpSignal s = RSIScalping_GetSignal(
         gSymbol, InpTimeframe,
         InpRSIPeriod, InpRSIOversold, InpRSIOverbought,
         InpStochK, InpStochD, InpStochSlowing, 20.0, 80.0, true);
      ComboRecordVote(1, s.direction);
   }

   if(InpComboBB)
   {
      BBScalpSignal s = BBScalping_GetSignal(
         gSymbol, InpTimeframe, InpBBMode,
         InpBBPeriod, InpBBDeviation,
         InpRSIPeriod, 40.0, 60.0);
      ComboRecordVote(2, s.direction);
   }

   if(InpComboMACD)
   {
      MACDScalpSignal s = MACDScalping_GetSignal(
         gSymbol, InpTimeframe,
         InpMACDFast, InpMACDSlow, InpMACDSignal,
         InpEMATrend, InpMACDZeroCross, true, true);
      ComboRecordVote(3, s.direction);
   }

   if(InpComboSR)
   {
      SRScalpSignal s = SRScalping_GetSignal(
         gSymbol, InpTimeframe,
         InpSRZonePips, InpSRUsePivots, InpSRUseSwings,
         InpSRLookback, InpSRLeftBars);
      ComboRecordVote(4, s.direction);
   }

   int buyVotes = 0, sellVotes = 0;
   for(int i = 0; i < 5; i++)
   {
      if(!ComboVoteActive(i)) continue;
      if(gVoteDir[i] ==  1) buyVotes++;
      if(gVoteDir[i] == -1) sellVotes++;
   }

   if(buyVotes  >= InpComboMinAgree && sellVotes == 0) return  1;
   if(sellVotes >= InpComboMinAgree && buyVotes == 0)  return -1;
   return 0;
}

//==================================================================
//  MANAGE OPEN POSITIONS (Trailing, Break-Even)
//==================================================================
void ManageOpenPositions()
{
   // Break-even offset must cover commission on Raw/Zero accounts,
   // otherwise "break-even" still loses money after fees.
   if(InpUseBreakEven)
   {
      double beOffset = Cost_BreakEvenOffsetPips(gSymbol, gCostProfile, InpBEoffsetPips);
      ApplyBreakEven(gSymbol, InpMagicNumber, InpBEtriggerPips, beOffset);
   }

   if(InpUseTrailing)
      ApplyTrailingStop(gSymbol, InpMagicNumber, InpTrailPips, InpTrailStep);

   // Smart exits: partial close, chandelier trail, time stop,
   // sentiment-flip exit, pre-news flat
   Exit_ManageAll(gSymbol, InpMagicNumber, gExitParams,
                  Cost_RoundTripPips(gSymbol, gCostProfile));
}

//==================================================================
//  TRADE TRANSACTION HANDLER
//==================================================================
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest&     request,
                        const MqlTradeResult&      result)
{
   // Log closed trades
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      if(HistoryDealSelect(trans.deal))
      {
         long magic = HistoryDealGetInteger(trans.deal, DEAL_MAGIC);
         if(magic == InpMagicNumber)
         {
            double profit = HistoryDealGetDouble(trans.deal, DEAL_PROFIT);
            string symbol = HistoryDealGetString(trans.deal, DEAL_SYMBOL);
            long   entry  = HistoryDealGetInteger(trans.deal, DEAL_ENTRY);
            if(entry == DEAL_ENTRY_OUT)
            {
               Print("Deal closed | Symbol: ", symbol,
                     " | Profit: ", DoubleToString(profit, 2),
                     " | Magic: ", magic);
               // Drop per-ticket exit-manager state once fully closed
               ulong posId = (ulong)HistoryDealGetInteger(trans.deal, DEAL_POSITION_ID);
               if(!PositionSelectByTicket(posId))
                  Exit_CleanupTicket(posId);
            }
         }
      }
   }
}
