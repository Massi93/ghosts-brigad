"""Telegram source: read recent messages from public channels.

Uses your own Telegram account through the official MTProto API
(Telethon). Only reads channels you can already access; respects
Telegram rate limits via Telethon's built-in flood-wait handling.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from telethon import TelegramClient

log = logging.getLogger("sentinel.telegram")


async def fetch_messages(cfg: dict) -> list[str]:
    """Return message texts from all configured channels within the
    lookback window. Failures on one channel don't stop the others."""
    if not cfg.get("enabled"):
        return []

    since = datetime.now(timezone.utc) - timedelta(
        minutes=cfg.get("lookback_minutes", 120)
    )
    texts: list[str] = []

    client = TelegramClient(
        cfg.get("session", "sentinel"), cfg["api_id"], cfg["api_hash"]
    )
    async with client:
        for channel in cfg.get("channels", []):
            try:
                count = 0
                async for message in client.iter_messages(channel, limit=200):
                    if message.date < since:
                        break
                    if message.text:
                        texts.append(message.text)
                        count += 1
                log.info("Telegram @%s: %d messages", channel, count)
            except Exception as exc:  # channel gone, private, flood...
                log.warning("Telegram @%s failed: %s", channel, exc)

    return texts
