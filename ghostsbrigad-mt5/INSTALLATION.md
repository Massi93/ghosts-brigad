# 📥 Installation de GhostsBrigad EA v2.0 — guide pas-à-pas

Ce guide t'amène de zéro jusqu'au bot qui tourne sur ton MT5 Exness.
Durée : ~15 minutes (+ Sentinel en option, ~15 minutes de plus).

---

## Étape 1 — Télécharger le bot depuis GitHub

1. Va sur ton dépôt GitHub → https://github.com/Massi93/ghosts-brigad
2. En haut à gauche, clique sur le sélecteur de branche et choisis **`BrigadBot`**
3. Bouton vert **Code** → **Download ZIP**
4. Décompresse le ZIP sur ton PC

## Étape 2 — Copier les fichiers dans MetaTrader 5

1. Ouvre **MT5** (connecté à ton compte Exness)
2. Menu **Fichier → Ouvrir le dossier des données**
3. Ouvre le dossier **`MQL5`**
4. Copie depuis le ZIP :
   - `ghostsbrigad-mt5/Experts/GhostsBrigad/` → dans `MQL5/Experts/`
   - `ghostsbrigad-mt5/Scripts/GhostsBrigad_CloseAll.mq5` → dans `MQL5/Scripts/`
   - `ghostsbrigad-mt5/presets/GhostsBrigad_EURUSD_M5_Scalping.set` → dans `MQL5/Presets/`

## Étape 3 — Compiler

1. Dans MT5 : **Outils → Éditeur MetaQuotes** (ou touche **F4**)
2. Dans le navigateur de gauche : `Experts/GhostsBrigad/GhostsBrigad_EA.mq5`
3. Ouvre-le et appuie sur **F7** (Compiler)
4. En bas : **0 erreur** attendu (des *warnings* jaunes sont acceptables)

## Étape 4 — Lancer le bot

1. Retourne dans MT5, ouvre un graphique **EURUSD** en **M5**
2. Dans le Navigateur (Ctrl+N) → Experts → **GhostsBrigad_EA** → glisse-le sur le graphique
3. Dans la fenêtre qui s'ouvre :
   - Onglet **Commun** : coche ✅ **Autoriser le trading algorithmique**
   - Onglet **Paramètres d'entrée** : bouton **Charger** →
     `GhostsBrigad_EURUSD_M5_Scalping.set`
   - **Important** : règle `InpAccountType` selon ton compte Exness :
     | Ton compte | Valeur |
     |---|---|
     | Auto-détection | `ACC_AUTO` |
     | Standard | `ACC_STANDARD` |
     | Standard Cent | `ACC_STANDARD_CENT` |
     | Pro | `ACC_PRO` |
     | Raw Spread | `ACC_RAW_SPREAD` |
     | Zero | `ACC_ZERO` |
4. Clique **OK**
5. Active le bouton **Algo Trading** dans la barre d'outils MT5 (il doit être vert)
6. Vérifie l'onglet **Experts** (en bas) : tu dois voir
   `GhostsBrigad EA v2.0 initialized ...` et la ligne de coûts
   `Account=... | Spread=... | Commission=...`

Le bot n'ouvre des trades que pendant les heures configurées (8h–20h,
heure du serveur) et seulement quand ses filtres sont tous au vert —
c'est normal qu'il ne trade pas immédiatement.

## Étape 5 (recommandé) — Backtest AVANT le réel

1. MT5 : **Affichage → Testeur de stratégie** (Ctrl+R)
2. Expert : `GhostsBrigad_EA` | Symbole : EURUSD | Période : M5
3. Modélisation : **« Chaque tick basé sur des ticks réels »**
4. Dates : les 12 derniers mois minimum
5. Charge le même preset, lance, et regarde :
   - **Facteur de profit > 1.3** ✅
   - **Drawdown max < 20 %** ✅
   - **Au moins ~200 trades** (sinon pas significatif)

Si ces critères ne passent pas sur ton backtest, ne mets pas d'argent
réel : optimise d'abord (ou demande-moi d'ajuster les réglages).

## Étape 6 (optionnel) — Activer Sentinel (news + Telegram)

Le bot fonctionne sans, mais avec Sentinel il évite les annonces à fort
impact et le sentiment contraire. Installation complète dans
[`sentinel/README.md`](sentinel/README.md). Résumé :

```bash
cd sentinel
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
copy config.example.yaml config.yaml
# éditer config.yaml : chemin Common Files MT5 + clés Telegram (my.telegram.org)
python -m sentinel
```

---

## 🥇🪙 Trader XAUUSD (or) et BTCUSD (Bitcoin)

Deux presets dédiés sont fournis dans `presets/` :

| Fichier | Instrument | Points clés |
|---|---|---|
| `GhostsBrigad_XAUUSD_M5_Scalping.set` | Or | Heures 10h–20h (Londres+NY), SL/TP ATR élargis (2.0×/3.0×), fermeture avant les news à fort impact activée, magic 202402 |
| `GhostsBrigad_BTCUSD_M15_Scalping.set` | Bitcoin (M15) | 24h/7j (filtre horaire OFF, pas de fermeture vendredi), risque réduit à 0.5 %, 1 position max, seuils en pips adaptés à l'échelle BTC, magic 202403 |

### ⚠️ L'échelle des « pips » n'est pas la même !

Le bot compte en « pips » = 10 points du symbole :

| Symbole | 1 pip du bot vaut | Spread typique Exness | ATR M5 typique |
|---|---|---|---|
| EURUSD | 0.0001 | ~1 pip | 3–8 pips |
| XAUUSD | 0.10 $/oz | ~2–3 pips | 15–30 pips |
| BTCUSD | 0.10 $ | ~150–250 pips | 1500–4000 pips |

C'est pour ça que le preset BTC a des valeurs comme `InpMaxSpreadPips=300` :
c'est normal, ne les « corrige » pas à la baisse sinon le bot ne tradera
jamais. Le mode **ATR** (activé dans les deux presets) adapte automatiquement
SL/TP à la volatilité du moment — c'est lui qui fait le vrai travail.

### Conseils spécifiques

- **Or** : très sensible au dollar et aux annonces Fed. Garde
  `InpCloseBeforeNews=true` (activé dans le preset) — un NFP peut faire
  bouger l'or de 20 $ en une minute.
- **Bitcoin** : volatilité extrême le week-end avec liquidité réduite ;
  le preset limite à 1 position et 0.5 % de risque. Si tu veux éviter
  les week-ends, remets `InpUseTimeFilter=true` + `InpNoTradeOnFriday=true`.
- **Suffixes de symboles** : sur certains comptes Exness les symboles
  s'appellent `XAUUSDm` ou `BTCUSDm`. Dans ce cas, adapte aussi les clés
  de la section `symbols:` du `config.yaml` de Sentinel pour qu'elles
  correspondent exactement.
- **Vérifie la ligne de coûts** au démarrage de l'EA (onglet Experts) :
  elle affiche le spread + commission réels de TON compte sur le symbole.
  Si le coût total dépasse `InpMaxTotalCostPips`, le bot attendra des
  conditions meilleures — c'est voulu.
- Le fichier de sentiment (`sentinel/config.example.yaml`) inclut des
  mots-clés spécialisés or (safe haven, taux réels, banques centrales…)
  et crypto (flux ETF, SEC, halving, liquidations…) plus les flux RSS
  Kitco (or) et CoinDesk (crypto).

---

## 🎛️ Contrôler et communiquer avec le bot

### Surveiller ce qu'il fait (en direct)

- **Onglet Experts** (bas de MT5, Ctrl+T) : le journal de bord du bot.
  Chaque décision y est expliquée — coûts au démarrage, signaux, vetos
  de confluence (`Confluence 42 (5 methodes) Dow:+80 SMC:+55...`),
  vetos de sentiment, trades refusés pour frais, ouvertures/fermetures.
- **Onglet Trade** : les positions ouvertes (magic 202402 = or,
  202403 = BTC). **Onglet Historique** : les trades fermés.

### Le contrôler

| Action | Comment |
|---|---|
| ⏸️ Tout mettre en pause | Bouton **Algo Trading** de la barre d'outils (rouge = stop). Les positions restent gérées à la reprise |
| ⚙️ Changer un réglage | Clic droit sur le graphique → **Liste des Experts** → sélectionner → **Propriétés** (F7) |
| 🛑 Fermeture d'urgence | Glisser le script **GhostsBrigad_CloseAll** sur le graphique (Magic 0 = tout fermer) |
| ❌ Retirer le bot | Clic droit sur le graphique → Liste des Experts → **Supprimer** |
| 🚫 Bloquer avant une annonce | Rien à faire : blackout automatique si Sentinel tourne |

### Recevoir ses messages sur ton téléphone 📱

Le bot envoie maintenant : démarrage, chaque ouverture (`ACHAT XAUUSD
0.10 lot @ 3305.20 | SL... | TP...`), chaque fermeture (`FERME XAUUSD :
+42.50 USD | Solde 10542.50`), et les protections (limite de perte
journalière, drawdown max).

**Option A — App mobile MT5 (le plus simple)** :
1. Installe l'app MetaTrader 5 (iOS/Android) → Paramètres → Chat et
   Messages → note ton **MetaQuotes ID** (8 caractères)
2. Sur le PC : **Outils → Options → Notifications** → coche Activer,
   colle ton MetaQuotes ID
3. Dans l'EA : `InpNotifyPush = true`

**Option B — Telegram (recommandé : contrôle complet à distance)** :
1. Dans Telegram, parle à **@BotFather** → `/newbot` → note le **token**
2. Parle à **@userinfobot** → note ton **chat id**
3. MT5 : **Outils → Options → Expert Advisors** → coche « Autoriser
   WebRequest pour les URL listées » → ajoute `https://api.telegram.org`
4. Dans l'EA : `InpTgToken` = le token, `InpTgChatID` = ton chat id
5. Ouvre la conversation avec ton bot Telegram et envoie `/help`

### 🎮 Piloter le bot depuis Telegram

Une fois le token/chat id configurés, le bot obéit à tes commandes
(uniquement depuis TON chat id — toute autre personne est ignorée) :

| Commande | Effet |
|---|---|
| `/status` | État complet : solde, equity, positions, risque, spread, mode SL/TP |
| `/positions` | Liste des positions ouvertes avec P&L |
| `/pause` | Suspend les nouvelles entrées (les positions restent gérées) |
| `/resume` | Reprend le trading |
| `/close` | Ferme toutes les positions de ce bot |
| `/buy 0.05` / `/sell` | Ordre manuel (lot optionnel, sinon taille au risque) |
| `/risk 1.5` | Change le % de risque par trade |
| `/sl 30` / `/tp 50` | SL/TP fixes en pips (désactive le mode ATR) |
| `/atr` | Revient au SL/TP automatique (ATR) |
| `/maxspread 3` | Change le spread maximum accepté |
| `/confluence 30` | Change le score de confluence minimum |
| `/help` | Rappel de toutes les commandes |

Chaque instance de l'EA (or, BTC…) a son propre magic number : si tu
utilises **le même bot Telegram** pour les deux graphiques, chaque
commande est exécutée par chaque instance sur SON symbole (un `/close`
ferme l'or ET le BTC). Pour les contrôler séparément, crée **deux bots**
via @BotFather (un token par graphique).

⚠️ **Important** : le bot vit dans le terminal MT5 de ton **PC**. Si le
PC s'éteint ou MT5 se ferme, le bot s'arrête (les SL/TP des positions
restent actifs côté serveur Exness). L'app mobile permet de **voir** et
**fermer** les positions à la main, pas de faire tourner le bot. Pour
un fonctionnement 24h/24, utilise un **VPS** (Exness en offre un
gratuit sous conditions, sinon ~5 $/mois).

## ⚠️ Ordre de mise en route conseillé

1. **Backtest** (étape 5) — gratuit, sans risque
2. **Compte démo Exness** pendant 4 à 8 semaines
3. **Réel avec petit capital** (compte Standard Cent idéal) seulement si
   la démo est positive
4. Ne touche jamais au Martingale (`InpUseMartingale=false`)

## 🆘 Problèmes courants

| Symptôme | Cause probable |
|---|---|
| « Trading algorithmique désactivé » | Bouton **Algo Trading** de la barre d'outils éteint |
| Le bot ne trade jamais | Hors heures 8h–20h serveur, spread trop élevé, ou filtres pas au vert — regarde l'onglet Experts |
| `Trade skipped: TP … does not cover …` | Normal : le trade ne couvrait pas les frais, le bot l'a refusé |
| Erreurs de compilation | Vérifie que TOUT le dossier `GhostsBrigad/` a été copié (sous-dossiers inclus) |
| Sentinel ignoré | Fichier feed absent/trop vieux : vérifie que `python -m sentinel` tourne et le chemin `output.file` |
