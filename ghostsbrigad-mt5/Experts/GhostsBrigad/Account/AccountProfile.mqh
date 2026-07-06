//+------------------------------------------------------------------+
//| AccountProfile.mqh - Exness account type & trading cost model   |
//|                                                                  |
//| Models the real cost of a round-trip trade depending on the     |
//| Exness account type, so every entry / exit / lot-size decision  |
//| accounts for fees:                                              |
//|   - Standard / Standard Cent : spread only, no commission       |
//|   - Pro                      : tighter spread, no commission    |
//|   - Raw Spread               : spread ~0 + fixed commission/lot |
//|   - Zero                     : 0 spread on majors + commission  |
//+------------------------------------------------------------------+

enum ENUM_ACCOUNT_TYPE
{
   ACC_AUTO          = 0, // Auto-Detect (heuristic)
   ACC_STANDARD      = 1, // Exness Standard (spread only)
   ACC_STANDARD_CENT = 2, // Exness Standard Cent (spread only)
   ACC_PRO           = 3, // Exness Pro (tight spread, no commission)
   ACC_RAW_SPREAD    = 4, // Exness Raw Spread (commission per lot)
   ACC_ZERO          = 5, // Exness Zero (0 spread majors + commission)
};

struct AccountCostProfile
{
   ENUM_ACCOUNT_TYPE type;
   bool              commissionBased;      // true = Raw Spread / Zero
   double            commissionPerLotSide; // USD per 1.0 lot, per side
   string            label;
};

// Default commission per lot per side (USD), per Exness account type.
// Can be overridden by input parameter (broker terms change over time).
double AccountProfile_DefaultCommission(ENUM_ACCOUNT_TYPE type)
{
   switch(type)
   {
      case ACC_RAW_SPREAD: return 3.5;  // $3.5/lot/side = $7 round trip
      case ACC_ZERO:       return 3.5;  // from $0.05, ~$3.5 on majors
      default:             return 0.0;  // Standard / Cent / Pro
   }
}

string AccountProfile_Label(ENUM_ACCOUNT_TYPE type)
{
   switch(type)
   {
      case ACC_STANDARD:      return "Standard";
      case ACC_STANDARD_CENT: return "Standard Cent";
      case ACC_PRO:           return "Pro";
      case ACC_RAW_SPREAD:    return "Raw Spread";
      case ACC_ZERO:          return "Zero";
      default:                return "Auto";
   }
}

//--- Heuristic detection when user selects ACC_AUTO.
//    1. Any commission on recent closed deals -> commission account
//       (current spread ~0 pips -> Zero, otherwise Raw Spread)
//    2. No commission: cent account name/currency hints -> Standard Cent,
//       tight spread -> Pro, otherwise Standard.
//    Manual selection is always more reliable than this heuristic.
ENUM_ACCOUNT_TYPE AccountProfile_Detect(string symbol)
{
   bool sawCommission = false;
   if(HistorySelect(TimeCurrent() - 30 * 86400, TimeCurrent()))
   {
      int total = HistoryDealsTotal();
      for(int i = total - 1; i >= 0 && i >= total - 200; i--)
      {
         ulong ticket = HistoryDealGetTicket(i);
         if(HistoryDealGetDouble(ticket, DEAL_COMMISSION) != 0.0)
         {
            sawCommission = true;
            break;
         }
      }
   }

   double spreadPips = GetSpreadPips(symbol);

   if(sawCommission)
      return (spreadPips <= 0.2) ? ACC_ZERO : ACC_RAW_SPREAD;

   string accCurrency = AccountInfoString(ACCOUNT_CURRENCY);
   if(StringFind(accCurrency, "USC") >= 0 || StringFind(accCurrency, "EUC") >= 0)
      return ACC_STANDARD_CENT;

   return (spreadPips <= 0.7) ? ACC_PRO : ACC_STANDARD;
}

//--- Build the active cost profile from inputs
void AccountProfile_Init(
   AccountCostProfile &profile,
   ENUM_ACCOUNT_TYPE   inputType,
   double              inputCommissionPerLotSide, // < 0 = use default
   string              symbol
)
{
   ENUM_ACCOUNT_TYPE type = inputType;
   if(type == ACC_AUTO)
   {
      type = AccountProfile_Detect(symbol);
      Print("AccountProfile: auto-detected account type = ",
            AccountProfile_Label(type),
            " (set InpAccountType manually for full accuracy)");
   }

   profile.type            = type;
   profile.commissionBased = (type == ACC_RAW_SPREAD || type == ACC_ZERO);
   profile.commissionPerLotSide =
      (inputCommissionPerLotSide >= 0)
         ? inputCommissionPerLotSide
         : AccountProfile_DefaultCommission(type);
   profile.label = AccountProfile_Label(type);
}

//==================================================================
//  COST FUNCTIONS (all results in pips, per 1.0 lot)
//==================================================================

//--- Round-trip commission converted to pips for this symbol
double Cost_CommissionPips(string symbol, const AccountCostProfile &profile)
{
   if(!profile.commissionBased || profile.commissionPerLotSide <= 0) return 0.0;
   double pipValue = GetPipValue(symbol); // USD per pip per 1.0 lot
   if(pipValue <= 0) return 0.0;
   return (profile.commissionPerLotSide * 2.0) / pipValue;
}

//--- Total round-trip cost in pips: current spread + commission
double Cost_RoundTripPips(string symbol, const AccountCostProfile &profile)
{
   return GetSpreadPips(symbol) + Cost_CommissionPips(symbol, profile);
}

//--- A trade is only worth taking if the expected TP distance clears
//    the total cost by a comfortable multiple.
bool Cost_IsTradeViable(
   string symbol,
   const AccountCostProfile &profile,
   double tpPips,
   double minCostMultiple // e.g. 3.0 -> TP must be >= 3x total cost
)
{
   double cost = Cost_RoundTripPips(symbol, profile);
   if(cost <= 0) return true;
   return (tpPips >= cost * minCostMultiple);
}

//--- Break-even offset that actually covers fees. On commission
//    accounts, "entry price + 1 pip" still loses money; the offset
//    must at least cover the round-trip commission.
double Cost_BreakEvenOffsetPips(
   string symbol,
   const AccountCostProfile &profile,
   double userOffsetPips
)
{
   return MathMax(userOffsetPips, Cost_CommissionPips(symbol, profile) + 0.2);
}

//--- Effective max-spread filter: on Raw/Zero the raw spread is tiny
//    but commission still applies, so the filter compares TOTAL cost.
bool Cost_IsSpreadAcceptable(
   string symbol,
   const AccountCostProfile &profile,
   double maxTotalCostPips
)
{
   return Cost_RoundTripPips(symbol, profile) <= maxTotalCostPips;
}

//--- Risk-based lot size where the amount risked includes commission:
//    risk = lots * (slPips * pipValue + commissionRoundTrip)
double Cost_AwareLotSize(
   string symbol,
   const AccountCostProfile &profile,
   double riskPercent,
   double stopLossPips
)
{
   double balance  = AccountInfoDouble(ACCOUNT_BALANCE);
   double pipValue = GetPipValue(symbol);
   if(pipValue <= 0 || stopLossPips <= 0) return 0.0;

   double riskAmt      = balance * riskPercent / 100.0;
   double costPerLot   = stopLossPips * pipValue
                       + profile.commissionPerLotSide * 2.0;
   if(costPerLot <= 0) return 0.0;

   return NormalizeLot(riskAmt / costPerLot, symbol);
}

//--- Human-readable cost summary for logs / dashboard
string Cost_Summary(string symbol, const AccountCostProfile &profile)
{
   double spread = GetSpreadPips(symbol);
   double comm   = Cost_CommissionPips(symbol, profile);
   return StringFormat(
      "Account=%s | Spread=%.1f pips | Commission=%.1f pips RT ($%.2f/lot/side) | Total cost=%.1f pips",
      profile.label, spread, comm, profile.commissionPerLotSide, spread + comm);
}
