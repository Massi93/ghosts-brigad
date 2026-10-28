# BOT MT5 — Ghosts Brigad (Expert Advisor MetaTrader 5, broker Exness)

Ce dépôt EST le projet « BOT MT5 ». Propriétaire : Massi (GitHub `Massi93`).
Langue de travail : français, réponses directes et concises.

## Mot-clé de reprise : « récupérer BOT MT5 »

Quand l'utilisateur dit « récupérer BOT MT5 », « reprendre BOT MT5 » ou un
équivalent, faire dans l'ordre :

1. `git fetch origin && git checkout feature/version-test` — branche de
   travail en cours. Si elle a déjà été fusionnée dans `main`, repartir de
   `main` et lire le dernier `REPRISE-*.md` présent.
2. Lire `ghostsbrigad-mt5/REPRISE-VERSION-TEST.md` (état des lieux, questions
   ouvertes, plan en 6 étapes) puis `git log --oneline main..feature/version-test`
   pour voir ce qui a déjà été fait depuis la note.
3. Résumer en 5 lignes max où en est le travail et ce qui reste, puis
   **attendre le OK** de l'utilisateur avant de modifier du code.

## Où est le code complet

| Quoi | Où |
|---|---|
| EA MQL5 | `ghostsbrigad-mt5/Experts/GhostsBrigad/GhostsBrigad_EA.mq5` + includes `Account/ Analysis/ Exit/ Filters/ News/ Risk/ Strategies/ Utils/` |
| Script d'urgence | `ghostsbrigad-mt5/Scripts/GhostsBrigad_CloseAll.mq5` |
| Presets Strategy Tester / démo | `ghostsbrigad-mt5/presets/*.set` (XAUUSD M5, BTCUSD M15, EURUSD M5) |
| Backtest Python (Dukascopy) | `ghostsbrigad-mt5/backtest/` |
| Service news/sentiment | `ghostsbrigad-mt5/sentinel/` |
| Installateurs | `ghostsbrigad-mt5/INSTALL.bat`, `INSTALL.ps1`, `INSTALL_MAC.command`, guide `INSTALLATION.md` |
| CI | `.github/workflows/compile.yml` (compilation Windows + MetaEditor, publie le `.ex5`), `backtest.yml` |

Les autres branches (`fitflow`, `fitflow-standalone`, `dani`, `feature/live`,
`das-shop`, `BrigadBot`, `claude/*`) sont d'autres projets ou de l'historique :
ne pas y toucher pour le bot.

## Règles imposées par le propriétaire (non négociables)

- **Jamais d'ordre sur compte réel** : `AccountInfoInteger(ACCOUNT_TRADE_MODE)`
  doit être `ACCOUNT_TRADE_MODE_DEMO` ou `_CONTEST`, sinon l'EA refuse de
  trader, sauf input explicite `InpAllowLive=true`.
- Risque max **1 % du capital par trade**, **3 % d'exposition totale**, SL
  obligatoire sur chaque ordre, lot calculé depuis le SL en points et
  `SYMBOL_TRADE_TICK_VALUE / SYMBOL_TRADE_TICK_SIZE`. Pas de martingale, pas
  de moyennage à la baisse.
- Continuer le code existant (style, structure), ne pas réécrire depuis zéro,
  ne pas ajouter de stratégie non prévue. Si une partie est ambiguë : poser la
  question au lieu de deviner.
- Commits petits et explicites, un par étape. Branche de travail :
  `feature/version-test`.
- Avant chaque modification structurante : expliquer en 2-3 lignes ce qui va
  être fait et pourquoi.
- Objectif de l'étape en cours : une version **TEST** (compile sans warning,
  6 mois de Strategy Tester sans erreur runtime, lançable en démo Exness),
  pas une version finale.

## Compiler et tester

- Pas de MetaEditor dans le conteneur. Compilation de référence = workflow
  GitHub Actions « Compile EA » : pousser sur une branche couverte par son
  déclencheur (`compile.yml`, clé `branches:`) et lire le log du job
  (`Result: N errors, M warnings`).
- Backtest Python :
  `cd ghostsbrigad-mt5/backtest && pip install -r requirements.txt && python ghostsbrigad_backtest.py --symbol BTCUSD --tf 15 --confluence on`
- Strategy Tester et démo : sur le PC Windows de l'utilisateur, voir
  `ghostsbrigad-mt5/INSTALLATION.md` (étapes 3 à 5).
