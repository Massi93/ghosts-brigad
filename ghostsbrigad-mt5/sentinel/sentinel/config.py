"""Configuration loading for Sentinel."""

from __future__ import annotations

import sys
from pathlib import Path

import yaml

DEFAULTS = {
    "refresh_seconds": 300,
    "telegram": {"enabled": False, "channels": [], "lookback_minutes": 120,
                 "session": "sentinel"},
    "rss": {"enabled": True, "feeds": [], "lookback_minutes": 180},
    "calendar": {
        "enabled": True,
        "url": "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
        "impacts": ["High"],
        "event_duration_minutes": 15,
    },
    "symbols": {},
}


def load_config(path: str | Path = "config.yaml") -> dict:
    path = Path(path)
    if not path.exists():
        sys.exit(
            f"Config file not found: {path}\n"
            "Copy config.example.yaml to config.yaml and edit it."
        )
    with open(path, encoding="utf-8") as fh:
        cfg = yaml.safe_load(fh) or {}

    merged = dict(DEFAULTS)
    for key, value in cfg.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = {**merged[key], **value}
        else:
            merged[key] = value

    if not merged.get("output", {}).get("file"):
        sys.exit("Config error: output.file must point to the MT5 Common Files path.")
    if not merged["symbols"]:
        sys.exit("Config error: define at least one symbol with keywords.")
    return merged
