# GhostsBrigad — MT5 Multi-Strategy Scalping Bot

Expert Advisor for MetaTrader 5, optimized for **Exness** broker accounts.

**v2.0** adds three major capabilities:

| Capability | Module | What it does |
|---|---|---|
| 💰 **Account-type cost model** | `Account/AccountProfile.mqh` | Knows the difference between Exness **Standard / Standard Cent / Pro / Raw Spread / Zero** accounts and prices every trade with real fees (spread + commission) |
| 📡 **News & Telegram sentiment** | `News/NewsSentiment.mqh` + [`sentinel/`](sentinel/) | A Python service scans Telegram channels, financial RSS feeds and the economic calendar; the EA uses the resulting sentiment to veto bad-timing entries and block trading around high-impact news |
| 🚪 **Smart exits** | `Exit/ExitManager.mqh` | Partial take-profit at 1R, fee-aware break-even, ATR chandelier trailing, time stop for stagnant trades, sentiment-flip exit, optional pre-news flat |

---

## Features

### 5 Scalping Strategies (selectable individually or combined)

| Strategy | Description | Best For |
|----------|-------------|----------|
| **EMA Crossover** | Fast/slow EMA cross + trend filter + ADX | Trending markets |
| **RSI Mean-Reversion** | RSI oversold/overbought + Stochastic confirm | Ranging markets |
| **Bollinger Bands** | Reversal at bands or breakout from squeeze | Both |
| **MACD Momentum** | Histogram flip + zero-line cross + trend EMA | Trending markets |
| **S/R Price Action** | Daily pivots + swing levels + candle confirm | Key levels |
| **COMBO Mode** | Minimum N strategies must agree → higher accuracy | All |

### Risk Management
- Fixed lot, % of balance, or Kelly criterion lot sizing
- Daily loss limit (% of balance)
- Max drawdown protection with auto-stop
- Max concurrent positions limit
- Spread filter (critical for Exness low-spread accounts)

### Trade Management
- ATR-based dynamic SL/TP or fixed pip values
- Trailing stop with configurable distance and step
- Break-even with trigger and offset
- Optional Martingale (use carefully)

### Account Type & Fees (new in v2.0)
- Select your Exness account type (`InpAccountType`) or let the EA auto-detect it
- Commission accounts (Raw Spread / Zero) are priced correctly: round-trip
  commission is converted to pips and added to the spread
- Entry filter: a trade is skipped unless its TP clears **N× the total cost**
  (`InpCostTPMultiple`, default 3×)
- Total-cost spread filter (`InpMaxTotalCostPips`) — on Raw/Zero the raw
  spread looks tiny but commission still applies
- Break-even offset automatically covers commission (a "break-even" that
  loses $7/lot is not break-even)
- Risk-based lot sizing includes commission in the risked amount

### News & Sentiment — Sentinel (new in v2.0)
- Run the [`sentinel/`](sentinel/) Python service next to MT5 (see its README)
- Entry veto: never buy into strongly bearish sentiment or sell into
  strongly bullish sentiment (`InpSentinelVetoLevel`)
- News blackout: no new entries 30 min before → 15 min after high-impact
  events (NFP, FOMC, CPI…), configurable
- Optional: close all positions before high-impact news (`InpCloseBeforeNews`)
- Fail-open design: if Sentinel is down or the feed is stale, the EA keeps
  trading on its technical signals alone

### Smart Exits (new in v2.0)
- Partial close at `InpPartialTriggerR` × initial risk (default: 50% at 1R)
- Chandelier ATR trailing on the remaining runner
- Time stop: close stagnant trades that don't even cover their round-trip cost
- Sentiment-flip exit: strong opposite sentiment closes the position
- All exits log their reason in the Experts tab

### Filters
- Trading hours filter (server time)
- Higher timeframe trend alignment (HTF EMA)
- Friday auto-close before weekend gap risk
- ADX trend strength filter

---

## Installation

1. Copy the `Experts/GhostsBrigad/` folder to your MT5 `MQL5/Experts/` directory
2. Copy `Scripts/` folder content to `MQL5/Scripts/`
3. In MetaEditor, open `GhostsBrigad_EA.mq5` and press **F7** to compile
4. Attach to any chart on your Exness MT5 account

```
MT5 Data Folder/
└── MQL5/
    ├── Experts/
    │   └── GhostsBrigad/
    │       ├── GhostsBrigad_EA.mq5      ← Main EA
    │       ├── Account/
    │       │   └── AccountProfile.mqh   ← Exness account types & fees
    │       ├── News/
    │       │   └── NewsSentiment.mqh    ← Sentinel feed reader
    │       ├── Exit/
    │       │   └── ExitManager.mqh      ← Smart exits
    │       ├── Strategies/
    │       │   ├── EMA_Scalping.mqh
    │       │   ├── RSI_Scalping.mqh
    │       │   ├── BB_Scalping.mqh
    │       │   ├── MACD_Scalping.mqh
    │       │   └── SR_Scalping.mqh
    │       ├── Risk/
    │       │   └── RiskManager.mqh
    │       └── Utils/
    │           ├── TradeUtils.mqh
    │           └── Indicators.mqh
    └── Scripts/
        └── GhostsBrigad_CloseAll.mq5
```

To enable news/Telegram sentiment, also set up the [`sentinel/`](sentinel/)
Python service (runs outside MT5, same machine or VPS).

---

## Recommended Exness Settings

### Account Type
- **Standard Cent** or **Standard** account for testing
- **Pro** or **Raw Spread** account for live trading (tighter spreads)

Set `InpAccountType` to match your account so the cost model is exact:

| Exness account | `InpAccountType` | Fees modeled |
|---|---|---|
| Standard | `ACC_STANDARD` | spread only (~1.0 pip EURUSD) |
| Standard Cent | `ACC_STANDARD_CENT` | spread only, cent lots |
| Pro | `ACC_PRO` | tight spread, no commission |
| Raw Spread | `ACC_RAW_SPREAD` | spread ~0 + **$3.5/lot/side** commission |
| Zero | `ACC_ZERO` | 0 spread on majors + commission per pair |

`ACC_AUTO` guesses from recent deal history and current spread; manual
selection is always more reliable. If Exness changes its commission,
override it with `InpCommissionPerLot` (USD per lot per side).

### Recommended Pairs & Timeframes
| Pair | Timeframe | Strategy |
|------|-----------|----------|
| EURUSD | M5 | COMBO |
| GBPUSD | M5 | EMA or MACD |
| XAUUSD (Gold) | M1/M5 | BB or S/R |
| US30 | M5 | MACD or EMA |
| USDJPY | M5 | RSI or COMBO |

### Key Parameters for Exness
- **Max Spread**: 3 pips (Exness Pro typically < 1 pip)
- **Slippage**: 30 points (pre-set in code)
- **Order Filling**: IOC (pre-set in code)
- **Leverage**: Use 1:100–1:200 for scalping

---

## Parameter Groups

### General Settings
- `InpStrategy` — Choose which strategy to run
- `InpTimeframe` — M1, M5 (recommended), M15
- `InpMagicNumber` — Unique ID; change if running multiple instances

### Risk Management
- `InpLotMode` — `LOT_PERCENT` recommended (1–2% risk per trade)
- `InpRiskPercent` — Risk percentage per trade
- `InpMaxSpreadPips` — Reject trades when spread is too high
- `InpDailyLossLimit` — Stop trading for the day after X% loss

### SL/TP
- `InpUseATRSLTP = true` — Adaptive SL/TP based on volatility (recommended)
- `InpATRSLMult = 1.5` — SL = 1.5 × ATR
- `InpATRTPMult = 2.5` — TP = 2.5 × ATR (R:R ≈ 1:1.67)

### Combo Mode
Enable at least 2–3 strategies for vote-based confirmation:
```
InpStrategy      = STRATEGY_COMBO
InpComboEMA      = true
InpComboRSI      = true
InpComboMACD     = true
InpComboMinAgree = 2     // 2 out of 3 must agree
```

---

## Scripts

### GhostsBrigad_CloseAll.mq5
Emergency script to close all open positions.
- Run with `Magic = 0` to close everything
- Run with `Magic = 202401` to close only GhostsBrigad positions

---

## Backtesting Tips

1. Use **MT5 Strategy Tester** with tick data (every tick based on real ticks)
2. Test period: minimum 6 months
3. Optimize parameters per symbol (avoid curve-fitting on < 1 year)
4. Check: profit factor > 1.3, max drawdown < 20%, Sharpe ratio > 1

---

## Risk Disclaimer

Trading forex and CFDs involves significant risk. This EA is provided for
educational and research purposes. Past performance does not guarantee future
results. Always test on a demo account before using real money. Never risk
capital you cannot afford to lose.
