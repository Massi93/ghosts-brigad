# Reprise — EA GhostsBrigad, version TEST (note de passation)

Session du 28/10/2026. Étape 0 terminée (lecture intégrale du code), **aucun
code modifié**. En attente du OK de Massi et de ses réponses aux 5 questions
ci-dessous avant toute modification.

## Objectif de la mission

Amener l'EA à une version **testable** (pas finale). Critère de « terminé » :
compile sans warning, tourne 6 mois en Strategy Tester sans erreur runtime,
lançable sur un compte démo Exness. Instruments : XAUUSD et BTCUSD (CFD).

Règles imposées :
- Branche `feature/version-test`, commits petits, un par étape.
- Jamais d'ordre sur compte réel : `AccountInfoInteger(ACCOUNT_TRADE_MODE)`
  doit être DEMO ou CONTEST, sinon blocage, sauf input explicite `AllowLive=true`.
- Continuer le code existant (style, structure), pas de réécriture, pas de
  nouvelle stratégie. Si ambigu : poser la question.
- Expliquer en 2-3 lignes chaque modification structurante avant de la faire.

## État des lieux (lecture du 28/10)

1. EA v2.0 scalping multi-stratégies : 5 stratégies (EMA, RSI, BB, MACD, S/R)
   agrégées en COMBO par votes (fenêtre 3 barres), filtre H1, porte de
   confluence 10 méthodes, veto sentiment + blackout news via fichier Sentinel
   (service Python), filtres de discipline (régime ATR, épuisement, rollover,
   cooldown, plafond/jour, espacement, risque adaptatif).
2. Risque/sorties déjà présents : lot fixe / % / Kelly / cost-aware
   (TICK_VALUE/TICK_SIZE déjà utilisé), SL/TP ATR ou fixes, BE, trailing,
   partiel 1R, chandelier, time stop, limite perte/jour, max positions par
   symbole+magic, modèle de frais Exness par type de compte.
3. Presets : XAUUSD M5 (magic 202402), BTCUSD M15 (202403, seul validé
   hors-échantillon par le backtest Python), EURUSD M5 (non validé).
4. Compile sur `main` (workflow « Compile EA », Windows + MetaEditor) :
   0 erreur, 1 warning (`OrderCalcMargin` non vérifié, RiskManager.mqh:82).
5. Manquant/bloquant : pas de garde-fou compte réel (et `/buy` `/sell`
   Telegram sans filtre), pas de limite d'exposition totale, pas d'anti-doublon
   de signal (preset or : `InpMinBarsBetween=0`, vote valide 3 barres), pas de
   journal CSV, retcode non loggé à l'ouverture.
6. Fragile : SL/TP non vérifiés contre STOPS_LEVEL/freeze ni alignés sur le
   tick size ; filling IOC codé en dur (lire SYMBOL_FILLING_MODE) ; lot
   arrondi à 2 décimales.
7. Dette n°1 : `Utils/Indicators.mqh` crée puis libère un handle à chaque
   appel → lent, et handle neuf peut renvoyer 0 barre. À créer dans OnInit.
8. Incohérence : stratégies sur barre 0 (en formation) vs confluence et
   backtest Python sur barre 1 clôturée.
9. Divers : « drawdown max » = flottant (balance − equity), pas pic-à-creux ;
   division par zéro si solde nul (limite journalière) ; martingale présent
   (off) ; convention « 1 pip = 10 points » codée en dur.
10. Le Strategy Tester MT5 n'a jamais été lancé sur ce code (seul le
    backtest Python existe).

## Questions ouvertes (réponses attendues)

| # | Question | Recommandation |
|---|---|---|
| 1 | Signaux sur barre clôturée (shift 1/2) au lieu de la barre 0 ? | Oui |
| 2 | Exposition totale : toutes les positions du compte ou seulement ce magic ? | Toutes, plafond 3 % du solde |
| 3 | Anti-doublon : 1 position par sens et par symbole, pas de ré-entrée dans la fenêtre de votes ? | Oui |
| 4 | Martingale / Kelly : retirer du chemin d'exécution ou garder désactivés ? | Retirer le martingale, garder Kelly off |
| 5 | `/buy` `/sell` Telegram : soumis au garde-fou démo + plafond d'exposition, pas aux filtres de signal ? | Oui |

## Plan prévu (un commit par étape)

1. **Compilation** : corriger le warning `OrderCalcMargin` ; ajouter
   `feature/**` au déclencheur de `.github/workflows/compile.yml` pour que
   chaque push soit compilé ; viser 0 warning.
2. **Risque** : garde-fou `ACCOUNT_TRADE_MODE` + input `InpAllowLive=false` ;
   SL/TP obligatoires, alignés tick size, vérifiés contre STOPS_LEVEL/freeze ;
   lot = risque % via TICK_VALUE/TICK_SIZE (existant) + retour
   `OrderCalcMargin` vérifié ; plafond d'exposition totale (input, 3 %) ;
   filtre spread (existant) ; anti-doublon par magic ; filling mode lu sur le
   symbole.
3. **Logique** : signaux sur barre clôturée (si OK), handles d'indicateurs
   créés dans OnInit, drawdown pic-à-creux, retrait martingale (si OK).
4. **Inputs** : ajouter `InpAllowLive`, `InpMaxTotalRiskPercent`, options de
   journal ; le reste (risque %, ATR/SL/TP, spread max, magic, horaires,
   symbole) est déjà exposé.
5. **Logging** : CSV dans `MQL5/Files` (signal, ordre envoyé, retcode, PnL à
   la clôture) + Print.
6. **Test** : `.set` Strategy Tester XAUUSD et BTCUSD (Sentinel/Telegram
   off), procédure pas à pas backtest 6 mois + démo.

## Infos pratiques

- `main` contient le dernier `.ex5` commité par CI (commit
  « EA compile automatiquement »). `feature/version-test` part de là.
- Compilation de référence : workflow « Compile EA » (Actions GitHub, runner
  Windows, log MetaEditor affiché avec le nombre d'erreurs/warnings).
- Backtest Python : `cd ghostsbrigad-mt5/backtest && python
  ghostsbrigad_backtest.py --symbol BTCUSD --tf 15 --confluence on`.

## Autres chantiers en attente (même session)

- FitFlow : l'historique extrait est sur la branche `fitflow-standalone` de
  ce dépôt. Massi doit créer le dépôt vide public `Massi93/fitflow`, puis
  pousser `fitflow-standalone` vers `fitflow:main` (ou me le demander).
- Branche par défaut de `ghosts-brigad` encore sur
  `claude/fitflow-fitness-app-hv497p` : à passer sur `main` (Settings →
  Branches), ou avance rapide à faire après création du dépôt FitFlow.
