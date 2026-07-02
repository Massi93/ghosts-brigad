"""RSS source: financial news headlines and summaries."""

from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone

import feedparser

log = logging.getLogger("sentinel.rss")


def fetch_articles(cfg: dict) -> list[str]:
    """Return 'title. summary' texts from all feeds within lookback."""
    if not cfg.get("enabled"):
        return []

    since = datetime.now(timezone.utc) - timedelta(
        minutes=cfg.get("lookback_minutes", 180)
    )
    texts: list[str] = []

    for url in cfg.get("feeds", []):
        try:
            feed = feedparser.parse(url)
            count = 0
            for entry in feed.entries:
                published = entry.get("published_parsed") or entry.get(
                    "updated_parsed"
                )
                if published:
                    when = datetime.fromtimestamp(
                        time.mktime(published), tz=timezone.utc
                    )
                    if when < since:
                        continue
                title = entry.get("title", "")
                summary = entry.get("summary", "")
                if title:
                    texts.append(f"{title}. {summary}"[:1000])
                    count += 1
            log.info("RSS %s: %d articles", url, count)
        except Exception as exc:
            log.warning("RSS %s failed: %s", url, exc)

    return texts
