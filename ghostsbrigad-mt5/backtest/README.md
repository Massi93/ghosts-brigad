# 📊 Backtest — mesurer la performance du bot sur XAUUSD / BTCUSD

Outil Python qui **réplique la stratégie COMBO de l'EA** (EMA + RSI +
MACD, fenêtre de votes, filtre H1, SL/TP ATR, break-even, trailing,
prise partielle, chandelier, stop temporel) sur des **données réelles
Dukascopy** (M1 → M5), avec les frais de ton type de compte Exness.

> Le testeur de stratégie **MT5** (ticks réels) reste la référence : cet
> outil est une approximation bougie-par-bougie, pratique pour comparer
> rapidement des instruments et des types de compte sans MT5.
> Le filtre de sentiment Sentinel n'est pas simulable (pas d'historique
> Telegram/news).

## Installation

```bash
cd backtest
python -m venv venv
venv\Scripts\activate          # Windows (source venv/bin/activate sur Linux)
pip install -r requirements.txt
```

## Utilisation

```bash
# Or, 12 derniers mois, compte Standard
python ghostsbrigad_backtest.py --symbol XAUUSD --account standard

# Bitcoin, compte Raw Spread, periode precise
python ghostsbrigad_backtest.py --symbol BTCUSD --account raw \
    --start 2025-07-01 --end 2026-06-30

# Verifier que le moteur fonctionne (sans reseau)
python ghostsbrigad_backtest.py --selftest
```

Le premier lancement télécharge ~1 an de bougies M1 (quelques minutes) ;
elles sont mises en cache dans `data/`, les lancements suivants sont
instantanés.

## Lire les résultats

```
Trades          : 412
Win rate        : 58.3%
Profit factor   : 1.41   (cible > 1.3)
Resultat net    : +1,830 USD (+18.3% sur 10,000)
Drawdown max    : 9.2%   (cible < 20%)
```

- **Profit factor > 1.3** et **drawdown < 20 %** avec **200+ trades** :
  la config vaut la peine d'être validée en démo.
- Profit factor < 1.0 : la config perd sur cette période — ne pas
  utiliser en réel telle quelle ; compare `--account standard` vs `raw`
  (souvent, seuls les frais font la différence) ou change de timeframe.
- Compare toujours **plusieurs périodes** (12 mois, 6 mois, 3 mois) :
  une stratégie honnête reste correcte sur toutes, pas seulement une.

## Ce que ça teste / ne teste pas

| Testé ✅ | Non testé ❌ |
|---|---|
| Signaux COMBO + fenêtre de votes | Sentiment Sentinel (pas d'historique) |
| Filtre H1, heures, vendredi | Slippage et requotes |
| SL/TP ATR, BE, trailing, partiels | Spread variable en temps réel (modélisé constant) |
| Frais par type de compte | Exécution intra-bougie exacte (règle conservatrice « SL d'abord ») |
