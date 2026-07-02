"""Sentiment scoring: map raw messages/articles to per-symbol scores.

Each text is scored with VADER, boosted by a small finance lexicon,
then routed to symbols via keyword matching. Texts that match a
symbol's *inverse* keywords (e.g. "strong dollar" for EURUSD) have
their score sign flipped, because good news for the quote currency
is bad news for the pair.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Finance-specific vocabulary VADER does not know about.
FINANCE_LEXICON = {
    "bullish": 2.5, "bearish": -2.5,
    "long": 1.2, "short": -1.2,
    "buy": 1.5, "sell": -1.5,
    "breakout": 1.5, "breakdown": -1.8,
    "rally": 2.0, "selloff": -2.2, "sell-off": -2.2,
    "surge": 2.0, "plunge": -2.4, "crash": -3.0, "collapse": -2.8,
    "hawkish": -1.0, "dovish": 1.0,
    "rate hike": -1.2, "rate cut": 1.2,
    "support": 0.6, "resistance": -0.4,
    "overbought": -1.0, "oversold": 1.0,
    "pump": 1.5, "dump": -2.0,
    "ath": 1.8, "all-time high": 1.8,
    "liquidation": -1.8, "margin call": -2.0,
    "recession": -2.0, "inflation": -0.8,
    "beat expectations": 1.8, "missed expectations": -1.8,
}

_analyzer = SentimentIntensityAnalyzer()
_analyzer.lexicon.update(
    {k: v for k, v in FINANCE_LEXICON.items() if " " not in k}
)


def score_text(text: str) -> float:
    """Score one text in [-1, 1]. Multi-word finance phrases are added
    on top of the VADER compound score."""
    compound = _analyzer.polarity_scores(text)["compound"]
    lower = text.lower()
    phrase_boost = sum(
        weight / 4.0
        for phrase, weight in FINANCE_LEXICON.items()
        if " " in phrase and phrase in lower
    )
    return max(-1.0, min(1.0, compound + phrase_boost))


@dataclass
class SymbolSentiment:
    symbol: str
    score: float        # -1 .. +1
    confidence: float   # 0 .. 1
    messages: int


def aggregate(
    texts: list[str],
    symbol_config: dict[str, dict],
) -> list[SymbolSentiment]:
    """Route each text to matching symbols and aggregate scores.

    Confidence grows with message volume and agreement between
    messages: many messages all pointing the same way = high
    confidence; few or conflicting messages = low confidence.
    """
    results: list[SymbolSentiment] = []

    for symbol, rules in symbol_config.items():
        keywords = [k.lower() for k in rules.get("keywords", [])]
        inverse = [k.lower() for k in rules.get("inverse_keywords", [])]

        scores: list[float] = []
        for text in texts:
            lower = text.lower()
            direct = any(k in lower for k in keywords)
            indirect = any(k in lower for k in inverse)
            if not direct and not indirect:
                continue

            s = score_text(text)
            if s == 0.0:
                continue
            # Text only about the counter-side (e.g. USD news for
            # EURUSD): positive news there is negative for the pair.
            if indirect and not direct:
                s = -s
            scores.append(s)

        if not scores:
            continue

        mean = sum(scores) / len(scores)
        # Agreement: 1.0 when every message has the same sign as the
        # mean, lower when the sample is split.
        same_sign = sum(1 for s in scores if s * mean > 0)
        agreement = same_sign / len(scores) if mean != 0 else 0.0
        volume = 1.0 - math.exp(-len(scores) / 8.0)  # saturates ~20 msgs
        confidence = round(agreement * volume, 2)

        results.append(
            SymbolSentiment(
                symbol=symbol,
                score=round(max(-1.0, min(1.0, mean)), 2),
                confidence=confidence,
                messages=len(scores),
            )
        )

    return results
