#!/usr/bin/env python3
"""GhostsBrigad EA v2.0 - backtest replica (Python).

Replicates the EA's COMBO strategy (EMA + RSI + MACD, min 2 agree),
HTF filter, ATR SL/TP, break-even, trailing, partial close, chandelier
and time stop - on real Dukascopy M1 candles aggregated to M5, with
per-account-type costs (spread + commission).

Usage:
    python ghostsbrigad_backtest.py --symbol XAUUSD --account standard
    python ghostsbrigad_backtest.py --symbol BTCUSD --account raw \
        --start 2025-07-01 --end 2026-06-30
    python ghostsbrigad_backtest.py --selftest   # synthetic-data smoke test

Notes:
 - This is an approximation of the MT5 Strategy Tester (bar-level fills,
   conservative "SL first" intrabar rule, constant modeled spread).
   The MT5 tester on real ticks remains the authoritative test.
 - The Sentinel sentiment filter cannot be backtested (no historical
   Telegram/news feed), so results exclude its effect.
"""

from __future__ import annotations

import argparse
import io
import lzma
import struct
import sys
import time
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

# ----------------------------------------------------------------------
# Instrument presets (mirror the .set files in ../presets)
# ----------------------------------------------------------------------
# pip = 10 * point (same convention as the EA)
PRESETS = {
    "XAUUSD": dict(
        point=0.001, pip=0.01 * 10, pip_value_per_lot=10.0,  # 1 lot = 100 oz
        use_time_filter=True, start_hour=10, end_hour=20, friday_close=True,
        risk_percent=1.0, max_positions=2,
        atr_sl_mult=2.0, atr_tp_mult=3.0,
        trail_pips=15.0, trail_step=3.0,
        be_trigger=18.0, be_offset=2.0,
        partial_trigger_r=1.0, partial_pct=50.0, chandelier_mult=2.5,
        time_stop_bars=18, adx_threshold=22.0,
        max_total_cost_pips=4.0, cost_tp_multiple=3.0,
        spread_pips={"standard": 2.2, "pro": 1.4, "raw": 0.8, "zero": 0.1},
        commission_pips={"standard": 0.0, "pro": 0.0, "raw": 0.7, "zero": 0.7},
    ),
    "BTCUSD": dict(
        point=0.01, pip=0.01 * 10, pip_value_per_lot=0.1,  # 1 lot = 1 BTC
        use_time_filter=False, start_hour=0, end_hour=24, friday_close=False,
        risk_percent=0.5, max_positions=1,
        atr_sl_mult=2.0, atr_tp_mult=3.5,
        trail_pips=1500.0, trail_step=100.0,
        be_trigger=1800.0, be_offset=100.0,
        partial_trigger_r=1.0, partial_pct=50.0, chandelier_mult=2.5,
        time_stop_bars=24, adx_threshold=20.0,
        max_total_cost_pips=350.0, cost_tp_multiple=3.0,
        spread_pips={"standard": 180.0, "pro": 120.0, "raw": 80.0, "zero": 60.0},
        commission_pips={"standard": 0.0, "pro": 0.0, "raw": 70.0, "zero": 70.0},
    ),
    "EURUSD": dict(
        point=0.00001, pip=0.0001, pip_value_per_lot=10.0,
        use_time_filter=True, start_hour=8, end_hour=20, friday_close=True,
        risk_percent=1.0, max_positions=2,
        atr_sl_mult=1.5, atr_tp_mult=2.5,
        trail_pips=10.0, trail_step=2.0,
        be_trigger=12.0, be_offset=1.0,
        partial_trigger_r=1.0, partial_pct=50.0, chandelier_mult=2.0,
        time_stop_bars=24, adx_threshold=20.0,
        max_total_cost_pips=2.5, cost_tp_multiple=3.0,
        spread_pips={"standard": 1.0, "pro": 0.6, "raw": 0.1, "zero": 0.0},
        commission_pips={"standard": 0.0, "pro": 0.0, "raw": 0.7, "zero": 0.7},
    ),
}

DAILY_LOSS_LIMIT_PCT = 5.0
START_BALANCE = 10_000.0

# Scalping discipline filters (mirror Filters/ScalpFilters.mqh)
SCALP_FILTERS = dict(
    use_vol_regime=True, atr_base_period=100,
    min_atr_ratio=0.7, max_atr_ratio=2.0,
    use_exhaustion=True, exhaustion_mult=2.5,
    use_rollover=True, rollover_start=22, rollover_end=23,
    use_loss_cooldown=True, cooldown_losses=3, cooldown_minutes=120,
    max_trades_per_day=10,
    min_bars_between=3,
    use_adaptive_risk=True,
)


# ----------------------------------------------------------------------
# Data: Dukascopy M1 BID candles (cached locally)
# ----------------------------------------------------------------------
def fetch_day(symbol: str, day: date, cache: Path) -> pd.DataFrame | None:
    """Download one day of M1 candles (24-byte rows, LZMA 'alone')."""
    import requests

    cache_file = cache / f"{symbol}_{day:%Y%m%d}.parquet"
    if cache_file.exists():
        return pd.read_parquet(cache_file)

    # NB: Dukascopy months are 0-based in the URL
    url = (f"https://datafeed.dukascopy.com/datafeed/{symbol}/"
           f"{day.year}/{day.month - 1:02d}/{day.day:02d}/BID_candles_min_1.bi5")
    try:
        r = requests.get(url, timeout=30)
        if r.status_code != 200 or len(r.content) == 0:
            return None
        raw = lzma.decompress(r.content, format=lzma.FORMAT_ALONE)
    except Exception as exc:
        print(f"  ! {day}: {exc}", file=sys.stderr)
        return None

    n = len(raw) // 24
    rows = struct.unpack(f">{'IIIIIf' * n}", raw[: n * 24])
    arr = np.array(rows, dtype=np.float64).reshape(n, 6)
    base = pd.Timestamp(day, tz="UTC")
    df = pd.DataFrame({
        "time": base + pd.to_timedelta(arr[:, 0], unit="s"),
        "open": arr[:, 1], "close": arr[:, 2],
        "low": arr[:, 3], "high": arr[:, 4], "volume": arr[:, 5],
    })
    df.to_parquet(cache_file)
    return df


def detect_scale(df: pd.DataFrame, symbol: str) -> float:
    """Dukascopy stores prices as ints with per-instrument scaling."""
    plausible = {"XAUUSD": (500, 10_000), "BTCUSD": (1_000, 500_000),
                 "EURUSD": (0.5, 2.0)}
    lo, hi = plausible.get(symbol, (1e-9, 1e12))
    med = float(df["close"].median())
    for scale in (1, 10, 100, 1_000, 10_000, 100_000):
        if lo <= med / scale <= hi:
            return float(scale)
    raise SystemExit(f"Cannot detect price scale for {symbol} (median={med})")


def load_data(symbol: str, start: date, end: date, cache: Path) -> pd.DataFrame:
    cache.mkdir(parents=True, exist_ok=True)
    frames = []
    day, done, total = start, 0, (end - start).days + 1
    while day <= end:
        df = fetch_day(symbol, day, cache)
        if df is not None and len(df):
            frames.append(df)
        done += 1
        if done % 30 == 0:
            print(f"  ... {done}/{total} days downloaded")
        day += timedelta(days=1)
    if not frames:
        raise SystemExit("No data downloaded - check symbol/dates/network.")
    m1 = pd.concat(frames, ignore_index=True).sort_values("time")
    scale = detect_scale(m1, symbol)
    for col in ("open", "high", "low", "close"):
        m1[col] /= scale
    m1 = m1.set_index("time")
    return m1


def resample(m1: pd.DataFrame, rule: str) -> pd.DataFrame:
    o = m1["open"].resample(rule).first()
    h = m1["high"].resample(rule).max()
    l = m1["low"].resample(rule).min()
    c = m1["close"].resample(rule).last()
    out = pd.DataFrame({"open": o, "high": h, "low": l, "close": c}).dropna()
    return out


# ----------------------------------------------------------------------
# Indicators (match MT5 built-ins)
# ----------------------------------------------------------------------
def ema(s: pd.Series, n: int) -> pd.Series:
    return s.ewm(span=n, adjust=False).mean()


def rsi(close: pd.Series, n: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / n, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / n, adjust=False).mean()
    rs = gain / loss.replace(0, np.nan)
    return (100 - 100 / (1 + rs)).fillna(50.0)


def macd_hist(close: pd.Series, fast=12, slow=26, signal=9):
    line = ema(close, fast) - ema(close, slow)
    sig = line.ewm(span=signal, adjust=False).mean()
    return line, line - sig


def stochastic(df: pd.DataFrame, k=5, slowing=3) -> pd.Series:
    ll = df["low"].rolling(k).min()
    hh = df["high"].rolling(k).max()
    raw = 100 * (df["close"] - ll) / (hh - ll).replace(0, np.nan)
    return raw.rolling(slowing).mean().fillna(50.0)  # %K (main line)


def atr_wilder(df: pd.DataFrame, n=14) -> pd.Series:
    prev_close = df["close"].shift()
    tr = pd.concat([
        df["high"] - df["low"],
        (df["high"] - prev_close).abs(),
        (df["low"] - prev_close).abs(),
    ], axis=1).max(axis=1)
    return tr.ewm(alpha=1 / n, adjust=False).mean()


def adx_wilder(df: pd.DataFrame, n=14) -> pd.Series:
    up = df["high"].diff()
    dn = -df["low"].diff()
    plus_dm = np.where((up > dn) & (up > 0), up, 0.0)
    minus_dm = np.where((dn > up) & (dn > 0), dn, 0.0)
    atr = atr_wilder(df, n)
    plus_di = 100 * pd.Series(plus_dm, index=df.index).ewm(
        alpha=1 / n, adjust=False).mean() / atr
    minus_di = 100 * pd.Series(minus_dm, index=df.index).ewm(
        alpha=1 / n, adjust=False).mean() / atr
    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
    return dx.ewm(alpha=1 / n, adjust=False).mean().fillna(0.0)


# ----------------------------------------------------------------------
# Strategy signals (COMBO: EMA + RSI + MACD, min 2 agree) - as in the EA
# ----------------------------------------------------------------------
def combo_signals(m5: pd.DataFrame, p: dict) -> pd.Series:
    c = m5["close"]
    e_fast, e_slow, e_trend = ema(c, 8), ema(c, 21), ema(c, 50)
    adx = adx_wilder(m5, 14)
    r = rsi(c, 14)
    st = stochastic(m5, 5, 3)
    _, hist = macd_hist(c)

    # EMA crossover + trend + ADX
    bull_x = (e_fast.shift() <= e_slow.shift()) & (e_fast > e_slow) & (c > e_trend)
    bear_x = (e_fast.shift() >= e_slow.shift()) & (e_fast < e_slow) & (c < e_trend)
    adx_ok = adx >= p["adx_threshold"]
    ema_vote = np.where(bull_x & adx_ok, 1, np.where(bear_x & adx_ok, -1, 0))

    # RSI exits oversold/overbought + stochastic confirmation
    rsi_buy = (r.shift() < 30) & (r >= 30) & (st < 20)
    rsi_sell = (r.shift() > 70) & (r <= 70) & (st > 80)
    rsi_vote = np.where(rsi_buy, 1, np.where(rsi_sell, -1, 0))

    # MACD histogram flip + trend EMA(50) filter
    macd_buy = (hist.shift() < 0) & (hist >= 0) & (c > e_trend)
    macd_sell = (hist.shift() > 0) & (hist <= 0) & (c < e_trend)
    macd_vote = np.where(macd_buy, 1, np.where(macd_sell, -1, 0))

    # A vote stays valid for `combo_window` bars (matches the EA's
    # InpComboWindowBars): momentum signals rarely fire on the exact
    # same bar even when they agree on the move.
    window = p.get("combo_window", 3)

    def sticky(vote: np.ndarray) -> pd.Series:
        s = pd.Series(vote, index=m5.index).replace(0, np.nan)
        return s.ffill(limit=window - 1).fillna(0)

    active = [sticky(v) for v in (ema_vote, rsi_vote, macd_vote)]
    buys = sum((a == 1).astype(int) for a in active)
    sells = sum((a == -1).astype(int) for a in active)
    sig = np.where((buys >= 2) & (sells == 0), 1,
                   np.where((sells >= 2) & (buys == 0), -1, 0))
    return pd.Series(sig, index=m5.index)


# ----------------------------------------------------------------------
# Trade engine
# ----------------------------------------------------------------------
@dataclass
class Position:
    direction: int          # +1 / -1
    entry: float            # fill price (incl. spread for buys)
    sl: float
    tp: float
    lots: float
    risk_dist: float        # initial |entry-sl| for the R multiple
    opened_idx: int
    partial_done: bool = False
    realized: float = 0.0   # USD banked by partial closes


@dataclass
class Result:
    trades: list = field(default_factory=list)  # (time, usd, pips)
    balance: float = START_BALANCE
    peak: float = START_BALANCE
    max_dd: float = 0.0

    def book(self, when, usd, pips):
        self.trades.append((when, usd, pips))
        self.balance += usd
        self.peak = max(self.peak, self.balance)
        dd = (self.peak - self.balance) / self.peak * 100
        self.max_dd = max(self.max_dd, dd)


def run_backtest(m5: pd.DataFrame, h1: pd.DataFrame, p: dict, account: str,
                 filters: dict | None = None) -> Result:
    f = filters if filters is not None else SCALP_FILTERS
    pip = p["pip"]
    pip_val = p["pip_value_per_lot"]
    spread = p["spread_pips"][account] * pip
    comm_pips_rt = p["commission_pips"][account]
    cost_pips = p["spread_pips"][account] + comm_pips_rt
    be_offset_pips = max(p["be_offset"], comm_pips_rt + 0.2)

    sig = combo_signals(m5, p).shift().fillna(0)      # act at next bar open
    atr = atr_wilder(m5, 14).shift()
    atr_base = atr_wilder(m5, f["atr_base_period"]).shift()
    prev_range = (m5["high"] - m5["low"]).shift()
    h1_ema = ema(h1["close"], 50)
    # last completed H1 value known at each M5 bar
    h1_ema_on_m5 = h1_ema.reindex(m5.index, method="ffill")
    h1_close_on_m5 = h1["close"].reindex(m5.index, method="ffill")

    res = Result()
    positions: list[Position] = []
    day_start_balance, cur_day = res.balance, None
    # scalping-discipline state
    loss_streak = 0
    cooldown_until = None
    trades_today = 0
    last_entry_idx = -10_000

    o = m5["open"].values
    hi = m5["high"].values
    lo = m5["low"].values
    cl = m5["close"].values
    idx = m5.index
    sig_v = sig.values
    atr_v = atr.values
    atr_base_v = atr_base.values
    prev_range_v = prev_range.values
    htf_bull_v = (h1_close_on_m5 > h1_ema_on_m5).values

    def close_pos(pos: Position, price: float, i: int, reason: str):
        nonlocal loss_streak, cooldown_until
        gross = (price - pos.entry) * pos.direction * pos.lots / pip * pip_val
        comm = comm_pips_rt * pip_val * pos.lots
        usd = gross - comm + pos.realized
        pips = (price - pos.entry) * pos.direction / pip
        res.book(idx[i], usd, pips)
        # loss-streak tracking for cooldown & adaptive risk
        if usd < 0:
            loss_streak += 1
            if (f["use_loss_cooldown"]
                    and loss_streak >= f["cooldown_losses"]):
                cooldown_until = idx[i] + pd.Timedelta(
                    minutes=f["cooldown_minutes"])
        else:
            loss_streak = 0

    for i in range(120, len(m5)):
        t = idx[i]
        if cur_day != t.date():
            cur_day = t.date()
            day_start_balance = res.balance
            trades_today = 0

        # --- manage open positions ---------------------------------
        still_open = []
        for pos in positions:
            price_open = o[i]
            gain = (price_open - pos.entry) * pos.direction
            gain_pips = gain / pip
            bars_open = i - pos.opened_idx

            # time stop
            if bars_open >= p["time_stop_bars"] and gain_pips < cost_pips:
                close_pos(pos, price_open, i, "time")
                continue
            # partial close at N x R
            if (not pos.partial_done and pos.risk_dist > 0
                    and gain >= pos.risk_dist * p["partial_trigger_r"]):
                part = pos.lots * p["partial_pct"] / 100.0
                gross = gain * part / pip * pip_val
                pos.realized += gross - comm_pips_rt * pip_val * part
                pos.lots -= part
                pos.partial_done = True
            # break-even
            if gain_pips >= p["be_trigger"]:
                be = pos.entry + pos.direction * be_offset_pips * pip
                if (be - pos.sl) * pos.direction > 0:
                    pos.sl = be
            # classic trailing
            new_sl = price_open - pos.direction * p["trail_pips"] * pip
            if (new_sl - pos.sl) * pos.direction > p["trail_step"] * pip:
                pos.sl = new_sl
            # chandelier after partial
            if pos.partial_done and not np.isnan(atr_v[i]):
                ch = price_open - pos.direction * atr_v[i] * p["chandelier_mult"]
                if (ch - pos.sl) * pos.direction > 0:
                    pos.sl = ch

            # intrabar SL/TP (conservative: SL first)
            if pos.direction == 1:
                if lo[i] <= pos.sl:
                    close_pos(pos, pos.sl, i, "sl"); continue
                if hi[i] >= pos.tp:
                    close_pos(pos, pos.tp, i, "tp"); continue
            else:
                if hi[i] + spread >= pos.sl:
                    close_pos(pos, pos.sl, i, "sl"); continue
                if lo[i] + spread <= pos.tp:
                    close_pos(pos, pos.tp, i, "tp"); continue
            still_open.append(pos)
        positions = still_open

        # --- Friday close -------------------------------------------
        if p["friday_close"] and t.dayofweek == 4 and t.hour >= 20:
            for pos in positions:
                close_pos(pos, o[i], i, "friday")
            positions = []
            continue

        # --- entry filters ------------------------------------------
        if p["use_time_filter"] and not (p["start_hour"] <= t.hour < p["end_hour"]):
            continue
        if (day_start_balance - res.balance) / day_start_balance * 100 >= DAILY_LOSS_LIMIT_PCT:
            continue
        if len(positions) >= p["max_positions"]:
            continue

        # --- scalping discipline filters (ScalpFilters.mqh) ----------
        if f["use_rollover"] and f["rollover_start"] <= t.hour < f["rollover_end"]:
            continue
        if f["use_vol_regime"]:
            if np.isnan(atr_base_v[i]) or atr_base_v[i] <= 0 or np.isnan(atr_v[i]):
                continue
            ratio = atr_v[i] / atr_base_v[i]
            if not (f["min_atr_ratio"] <= ratio <= f["max_atr_ratio"]):
                continue
        if (f["use_exhaustion"] and not np.isnan(prev_range_v[i])
                and not np.isnan(atr_v[i])
                and prev_range_v[i] > atr_v[i] * f["exhaustion_mult"]):
            continue
        if cooldown_until is not None and t < cooldown_until:
            continue
        if f["max_trades_per_day"] > 0 and trades_today >= f["max_trades_per_day"]:
            continue
        if i - last_entry_idx < f["min_bars_between"]:
            continue

        direction = int(sig_v[i])
        if direction == 0 or np.isnan(atr_v[i]):
            continue
        if direction == 1 and not htf_bull_v[i]:
            continue
        if direction == -1 and htf_bull_v[i]:
            continue

        tp_pips = atr_v[i] * p["atr_tp_mult"] / pip
        if cost_pips > 0 and tp_pips < cost_pips * p["cost_tp_multiple"]:
            continue
        if p["spread_pips"][account] + comm_pips_rt > p["max_total_cost_pips"]:
            continue

        # --- open ----------------------------------------------------
        # adaptive risk: half size after 2 straight losses, third after 4
        risk_pct = p["risk_percent"]
        if f["use_adaptive_risk"]:
            if loss_streak >= 4:
                risk_pct /= 3.0
            elif loss_streak >= 2:
                risk_pct /= 2.0

        sl_dist = atr_v[i] * p["atr_sl_mult"]
        entry = o[i] + spread if direction == 1 else o[i]
        sl = entry - direction * sl_dist - (spread if direction == -1 else 0)
        tp = entry + direction * atr_v[i] * p["atr_tp_mult"]
        sl_pips = abs(entry - sl) / pip
        risk_usd = res.balance * risk_pct / 100.0
        denom = sl_pips * pip_val + comm_pips_rt * pip_val
        lots = max(0.01, round(risk_usd / denom, 2)) if denom > 0 else 0.01
        positions.append(Position(direction, entry, sl, tp, lots,
                                  abs(entry - sl), i))
        trades_today += 1
        last_entry_idx = i

    # close anything still open at the end
    for pos in positions:
        close_pos(pos, cl[-1], len(m5) - 1, "end")
    return res


# ----------------------------------------------------------------------
# Reporting
# ----------------------------------------------------------------------
def report(res: Result, symbol: str, account: str, start: date, end: date):
    if not res.trades:
        print("No trades taken - filters may be too strict for this data.")
        return
    df = pd.DataFrame(res.trades, columns=["time", "usd", "pips"])
    wins = df[df.usd > 0]
    losses = df[df.usd <= 0]
    pf = wins.usd.sum() / abs(losses.usd.sum()) if len(losses) and losses.usd.sum() != 0 else float("inf")
    ret = (res.balance / START_BALANCE - 1) * 100

    print()
    print(f"=== GhostsBrigad backtest | {symbol} COMBO | compte {account.upper()} ===")
    print(f"Periode         : {start} -> {end}")
    print(f"Trades          : {len(df)}")
    print(f"Win rate        : {len(wins) / len(df) * 100:.1f}%")
    print(f"Profit factor   : {pf:.2f}   (cible > 1.3)")
    print(f"Resultat net    : {res.balance - START_BALANCE:+,.0f} USD "
          f"({ret:+.1f}% sur {START_BALANCE:,.0f})")
    print(f"Drawdown max    : {res.max_dd:.1f}%   (cible < 20%)")
    print(f"Gain moyen      : {wins.usd.mean() if len(wins) else 0:+.2f} USD | "
          f"Perte moyenne : {losses.usd.mean() if len(losses) else 0:+.2f} USD")
    print()
    monthly = df.set_index("time").usd.resample("ME").sum()
    print("Mois         P&L (USD)")
    for when, usd in monthly.items():
        bar = "#" * min(40, int(abs(usd) / max(1, abs(monthly).max()) * 40))
        print(f"{when:%Y-%m}   {usd:+10,.0f}  {bar}")
    print()
    verdict_pf = "OK" if pf >= 1.3 else "INSUFFISANT"
    verdict_dd = "OK" if res.max_dd < 20 else "TROP ELEVE"
    verdict_n = "OK" if len(df) >= 200 else "ECHANTILLON FAIBLE"
    print(f"Verdict: profit factor {verdict_pf} | drawdown {verdict_dd} | "
          f"nombre de trades {verdict_n}")
    print("Rappel : approximation bar-par-bar; le testeur MT5 en ticks reels")
    print("reste la reference. Sentiment Sentinel non simule.")


# ----------------------------------------------------------------------
# Self-test on synthetic data (no network needed)
# ----------------------------------------------------------------------
def selftest():
    rng = np.random.default_rng(42)
    n = 40_000  # ~5 months of M5
    t = pd.date_range("2025-07-01", periods=n, freq="5min", tz="UTC")
    steps = rng.normal(0, 2.2, n) + 0.35 * np.sin(np.arange(n) / 300)
    close = 3300 + np.cumsum(steps)
    high = close + np.abs(rng.normal(0, 1.2, n))
    low = close - np.abs(rng.normal(0, 1.2, n))
    open_ = np.roll(close, 1); open_[0] = close[0]
    m5 = pd.DataFrame({"open": open_, "high": high, "low": low, "close": close},
                      index=t)
    h1 = resample(m5, "1h")
    res = run_backtest(m5, h1, PRESETS["XAUUSD"], "standard")
    report(res, "XAUUSD(synthetique)", "standard",
           t[0].date(), t[-1].date())
    print("\nSELF-TEST OK : le moteur tourne de bout en bout.")
    print("(Donnees aleatoires -> le P&L ci-dessus n'a AUCUNE signification.)")


def main():
    ap = argparse.ArgumentParser(description="GhostsBrigad EA backtest replica")
    ap.add_argument("--symbol", default="XAUUSD", choices=list(PRESETS))
    ap.add_argument("--account", default="standard",
                    choices=["standard", "pro", "raw", "zero"])
    ap.add_argument("--tf", default="5", choices=["5", "15", "30"],
                    help="timeframe en minutes (defaut: 5)")
    ap.add_argument("--no-filters", action="store_true",
                    help="desactive les filtres de discipline scalping")
    ap.add_argument("--start", default=None, help="YYYY-MM-DD (defaut: -12 mois)")
    ap.add_argument("--end", default=None, help="YYYY-MM-DD (defaut: hier)")
    ap.add_argument("--cache", default="data", help="dossier cache donnees")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        selftest()
        return

    end = date.fromisoformat(args.end) if args.end else date.today() - timedelta(days=1)
    start = date.fromisoformat(args.start) if args.start else end - timedelta(days=365)

    print(f"Telechargement {args.symbol} M1 {start} -> {end} (Dukascopy)...")
    m1 = load_data(args.symbol, start, end, Path(args.cache))
    bars = resample(m1, f"{args.tf}min")
    h1 = resample(m1, "1h")
    print(f"{len(bars):,} bougies M{args.tf} chargees.")

    filters = dict(SCALP_FILTERS)
    if args.no_filters:
        filters.update(use_vol_regime=False, use_exhaustion=False,
                       use_rollover=False, use_loss_cooldown=False,
                       max_trades_per_day=0, min_bars_between=0,
                       use_adaptive_risk=False)

    res = run_backtest(bars, h1, PRESETS[args.symbol], args.account, filters)
    label = f"{args.symbol} M{args.tf}" + (" sans filtres" if args.no_filters else "")
    report(res, label, args.account, start, end)


if __name__ == "__main__":
    main()
