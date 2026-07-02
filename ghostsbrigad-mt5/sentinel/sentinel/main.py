"""Sentinel main loop: gather -> score -> write, forever."""

from __future__ import annotations

import argparse
import asyncio
import logging

from .config import load_config
from .sentiment import aggregate
from .sources.calendar import fetch_events
from .sources.rss import fetch_articles
from .sources.telegram import fetch_messages
from .writer import write_feed

log = logging.getLogger("sentinel")


async def run_once(cfg: dict) -> None:
    texts: list[str] = []

    texts += await fetch_messages(cfg["telegram"])
    texts += fetch_articles(cfg["rss"])
    events = fetch_events(cfg["calendar"])

    sentiments = aggregate(texts, cfg["symbols"])
    for s in sentiments:
        log.info(
            "%s: score=%+.2f confidence=%.2f (%d messages)",
            s.symbol, s.score, s.confidence, s.messages,
        )

    write_feed(cfg["output"]["file"], sentiments, events)


async def run_forever(cfg: dict) -> None:
    interval = int(cfg.get("refresh_seconds", 300))
    while True:
        try:
            await run_once(cfg)
        except Exception:
            log.exception("Cycle failed; retrying at next interval")
        await asyncio.sleep(interval)


def main() -> None:
    parser = argparse.ArgumentParser(description="GhostsBrigad Sentinel")
    parser.add_argument("--config", default="config.yaml", help="config file path")
    parser.add_argument("--once", action="store_true", help="run one cycle and exit")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    cfg = load_config(args.config)
    if args.once:
        asyncio.run(run_once(cfg))
    else:
        asyncio.run(run_forever(cfg))


if __name__ == "__main__":
    main()
