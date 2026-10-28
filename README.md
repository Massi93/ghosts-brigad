# 🤖 BOT MT5 — Ghosts Brigad (Expert Advisor MetaTrader 5)

Bot scalping **MetaTrader 5** multi-stratégies pour le broker **Exness** :
modèle de frais par type de compte (Standard / Cent / Pro / Raw Spread / Zero),
analyse de sentiment news + Telegram (service Python Sentinel), sorties
intelligentes, presets XAUUSD / BTCUSD / EURUSD, backtest et compilation
cloud de l'EA (`.ex5` prêt à l'emploi).

→ [Documentation complète](ghostsbrigad-mt5/README.md)
→ [Installation pas à pas (Windows / macOS / VPS)](ghostsbrigad-mt5/INSTALLATION.md)
→ [Service Sentinel (news & Telegram)](ghostsbrigad-mt5/sentinel/README.md)
→ [Backtest XAUUSD / BTCUSD](ghostsbrigad-mt5/backtest/README.md)

## 🔁 Reprendre le développement

- **Travail en cours** : version **TEST** de l'EA (compile sans warning,
  6 mois de Strategy Tester sans erreur, lançable en démo Exness), sur la
  branche [`feature/version-test`](https://github.com/Massi93/ghosts-brigad/tree/feature/version-test).
- **Note de reprise** (état des lieux, questions ouvertes, plan en 6 étapes) :
  [`ghostsbrigad-mt5/REPRISE-VERSION-TEST.md`](https://github.com/Massi93/ghosts-brigad/blob/feature/version-test/ghostsbrigad-mt5/REPRISE-VERSION-TEST.md)
  sur cette branche.
- **Pour relancer l'assistant** : dire « **récupérer BOT MT5** » (le fichier
  `CLAUDE.md` à la racine lui indique quoi faire), ou « Reprends le travail
  décrit dans `ghostsbrigad-mt5/REPRISE-VERSION-TEST.md` (branche
  `feature/version-test`) ».
- **Compilation de référence** : workflow GitHub Actions « Compile EA »
  (runner Windows + MetaEditor) ; son log affiche le nombre d'erreurs et de
  warnings.

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
| 💪 FitFlow (app fitness, Flutter) | dépôt dédié `Massi93/fitflow` à créer ; historique complet prêt sur la branche `fitflow-standalone` de ce dépôt |
| 🌐 Dani Inmigración (site) | branches `dani` / `feature/live` de ce dépôt |
| 🛒 Das Shop | branche `das-shop` de ce dépôt |
