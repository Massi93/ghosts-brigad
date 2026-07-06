//+------------------------------------------------------------------+
//| Confluence.mqh - Aggregates every analysis method into one view  |
//|                                                                  |
//| Each enabled method contributes a score in [-100, +100]; the     |
//| confluence score is their weighted average. The EA only takes a  |
//| trade when the confluence agrees with the technical signal:      |
//|   buy needs score >= +threshold, sell needs score <= -threshold. |
//+------------------------------------------------------------------+

#include "MarketStructure.mqh"
#include "SMC.mqh"
#include "VolumeAnalysis.mqh"

struct ConfluenceConfig
{
   bool useDow;         // Dow Theory market structure
   bool usePriceAction; // candles: pin bar, engulfing, inside bar
   bool useFibonacci;   // retracement of the last impulse leg
   bool useWyckoff;     // spring / upthrust
   bool useSMC;         // BOS/CHoCH, FVG, order blocks, sweeps
   bool useVWAP;        // session VWAP position
   bool useVolProfile;  // POC / value area acceptance
   bool useOrderFlow;   // tick-volume delta + divergence
   bool useElliott;     // simplified impulse context (experimental)
   bool useGann;        // simplified 1x1 angle (experimental)
};

struct ConfluenceResult
{
   double score;     // weighted average, [-100, +100]
   int    methods;   // how many methods produced a non-zero opinion
   string details;   // "Dow:+80 SMC:+55 VWAP:+31 ..." for the log
};

void Confluence_AddPart(ConfluenceResult &r, double &sum, int &n,
                        string name, double score)
{
   if(score == 0) return;
   sum += score;
   n++;
   r.details += StringFormat("%s:%+.0f ", name, score);
}

ConfluenceResult Confluence_Evaluate(string symbol, ENUM_TIMEFRAMES tf,
                                     const ConfluenceConfig &cfg)
{
   ConfluenceResult r;
   r.score = 0; r.methods = 0; r.details = "";

   SwingPoint swings[];
   MS_FindSwings(symbol, tf, swings);

   double sum = 0; int n = 0;
   if(cfg.useDow)
      Confluence_AddPart(r, sum, n, "Dow",   MS_DowScore(swings));
   if(cfg.usePriceAction)
      Confluence_AddPart(r, sum, n, "PA",    MS_PriceActionScore(symbol, tf));
   if(cfg.useFibonacci)
      Confluence_AddPart(r, sum, n, "Fib",   MS_FibonacciScore(symbol, tf, swings));
   if(cfg.useWyckoff)
      Confluence_AddPart(r, sum, n, "Wyck",  MS_WyckoffScore(symbol, tf));
   if(cfg.useSMC)
      Confluence_AddPart(r, sum, n, "SMC",   SMC_Score(symbol, tf, swings));
   if(cfg.useVWAP)
      Confluence_AddPart(r, sum, n, "VWAP",  VA_VWAPScore(symbol, tf));
   if(cfg.useVolProfile)
      Confluence_AddPart(r, sum, n, "VProf", VA_VolumeProfileScore(symbol, tf));
   if(cfg.useOrderFlow)
      Confluence_AddPart(r, sum, n, "Delta", VA_OrderFlowScore(symbol, tf));
   if(cfg.useElliott)
      Confluence_AddPart(r, sum, n, "Elliott", MS_ElliottScore(swings));
   if(cfg.useGann)
      Confluence_AddPart(r, sum, n, "Gann",  MS_GannScore(symbol, tf, swings));

   r.methods = n;
   r.score   = (n > 0) ? sum / n : 0;
   return r;
}

//--- Entry gate: does the confluence agree with the signal direction?
//    Fail-open when too few methods have an opinion (quiet market).
bool Confluence_AllowTrade(string symbol, ENUM_TIMEFRAMES tf,
                           const ConfluenceConfig &cfg,
                           int direction, double threshold,
                           int minMethods, string &logLine)
{
   ConfluenceResult r = Confluence_Evaluate(symbol, tf, cfg);
   logLine = StringFormat("Confluence %.0f (%d methodes) %s",
                          r.score, r.methods, r.details);
   if(r.methods < minMethods) return true;   // not enough evidence to veto
   if(direction > 0) return (r.score >=  threshold);
   if(direction < 0) return (r.score <= -threshold);
   return true;
}
