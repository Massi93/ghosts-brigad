"""Atomic writer for the EA feed file.

The EA polls this file from the MT5 COMMON Files folder, so the write
must be atomic (temp file + replace) to avoid the EA reading a
half-written feed.
"""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path

from .sentiment import SymbolSentiment
from .sources.calendar import CalendarEvent

log = logging.getLogger("sentinel.writer")


def write_feed(
    path: str,
    sentiments: list[SymbolSentiment],
    events: list[CalendarEvent],
) -> None:
    lines = [
        "# GhostsBrigad Sentinel feed v1",
        f"generated={int(time.time())}",
    ]
    for s in sentiments:
        lines.append(f"S,{s.symbol},{s.score:.2f},{s.confidence:.2f},{s.messages}")
    for e in events:
        # Commas are the field separator; strip them from the title.
        title = e.title.replace(",", ";")
        lines.append(f"B,{e.start},{e.end},{e.currency},{e.impact},{title}")

    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(".tmp")
    tmp.write_text("\n".join(lines) + "\n", encoding="ascii", errors="replace")
    os.replace(tmp, target)
    log.info(
        "Feed written: %d symbols, %d events -> %s",
        len(sentiments), len(events), target,
    )
