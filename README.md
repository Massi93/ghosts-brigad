# 🤖 Ghosts Brigad — Bot de trading MT5

Bot scalping **MetaTrader 5** multi-stratégies pour le broker **Exness** :
modèle de frais par type de compte (Standard / Cent / Pro / Raw Spread / Zero),
analyse de sentiment news + Telegram (service Python Sentinel), sorties
intelligentes, presets XAUUSD / BTCUSD / EURUSD, backtest et compilation
cloud de l'EA (`.ex5` prêt à l'emploi).

→ [Documentation complète](ghostsbrigad-mt5/README.md)
→ [Installation pas à pas (Windows / macOS / VPS)](ghostsbrigad-mt5/INSTALLATION.md)
→ [Service Sentinel (news & Telegram)](ghostsbrigad-mt5/sentinel/README.md)
→ [Backtest XAUUSD / BTCUSD](ghostsbrigad-mt5/backtest/README.md)

## Arborescence

```
ghostsbrigad-mt5/
├── Experts/GhostsBrigad/   # EA MQL5 (stratégies, risque, news, Telegram, utils)
├── Scripts/                # Scripts MQL5 utilitaires (ex. CloseAll)
├── presets/                # Fichiers .set par instrument / timeframe
├── backtest/               # Backtest Python (données Dukascopy) + résultats
├── sentinel/               # Service Python news & sentiment Telegram
└── INSTALL.bat / INSTALL.ps1 / INSTALL_MAC.command
```

## CI / CD

- `.github/workflows/compile.yml` — compile l'EA sur un runner Windows (MetaEditor)
  et publie le `.ex5` sur la branche.
- `.github/workflows/backtest.yml` — backtest XAUUSD / BTCUSD à la demande.

## Autres projets

Ce dépôt ne contient plus que le bot de trading.

| Projet | Emplacement |
|---|---|
| 💪 FitFlow (app fitness, Flutter) | dépôt dédié → https://github.com/Massi93/fitflow |
| 🌐 Dani Inmigración (site) | branches `dani` / `feature/live` de ce dépôt |
| 🛒 Das Shop | branche `das-shop` de ce dépôt |
