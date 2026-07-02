"""Economic calendar source: high-impact event blackout windows.

Pulls the free ForexFactory weekly calendar JSON and converts
selected-impact events into (start, end, currency, impact, title)
blackout windows for the EA.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import requests

log = logging.getLogger("sentinel.calendar")


@dataclass
class CalendarEvent:
    start: int      # unix timestamp
    end: int
    currency: str   # "USD", "EUR", ...
    impact: str     # "HIGH" / "MEDIUM"
    title: str


def fetch_events(cfg: dict) -> list[CalendarEvent]:
    if not cfg.get("enabled"):
        return []

    try:
        response = requests.get(cfg["url"], timeout=30)
        response.raise_for_status()
        items = response.json()
    except Exception as exc:
        log.warning("Calendar fetch failed: %s", exc)
        return []

    wanted = {i.lower() for i in cfg.get("impacts", ["High"])}
    duration = timedelta(minutes=cfg.get("event_duration_minutes", 15))
    horizon = datetime.now(timezone.utc) + timedelta(days=2)

    events: list[CalendarEvent] = []
    for item in items:
        impact = str(item.get("impact", "")).lower()
        if impact not in wanted:
            continue
        try:
            when = datetime.fromisoformat(item["date"])
        except (KeyError, ValueError):
            continue
        if when > horizon or when < datetime.now(timezone.utc) - duration:
            continue
        events.append(
            CalendarEvent(
                start=int(when.timestamp()),
                end=int((when + duration).timestamp()),
                currency=str(item.get("country", "ALL")).upper(),
                impact=impact.upper(),
                title=str(item.get("title", "Economic event")),
            )
        )

    log.info("Calendar: %d upcoming blackout events", len(events))
    return events
