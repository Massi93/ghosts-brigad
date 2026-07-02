# GhostsBrigad Sentinel — Analyse des news & Telegram

Service Python qui alimente l'EA MT5 en **intelligence de marché** :

1. **Telegram** — lit les canaux publics que vous configurez (signaux, news)
2. **RSS financiers** — ForexLive, FXStreet, Cointelegraph, etc.
3. **Calendrier économique** — événements à fort impact (NFP, FOMC, CPI…)

Il en déduit, toutes les 5 minutes :

- un **score de sentiment** par symbole (−1.0 très baissier → +1.0 très haussier)
  avec un niveau de **confiance** (volume + accord entre les sources)
- des **fenêtres de blackout** autour des annonces à fort impact

Le tout est écrit dans un fichier que l'EA lit depuis le dossier
`Common/Files` de MetaTrader 5. L'EA s'en sert pour :

- **refuser d'ouvrir** une position contre un sentiment fort (veto)
- **bloquer les entrées** avant/après les annonces à fort impact
- **fermer une position** si le sentiment se retourne violemment contre elle
- (option) **se mettre à plat** avant les annonces majeures

> Si Sentinel est arrêté ou si le flux est trop vieux, l'EA continue de
> fonctionner normalement (fail-open) : le sentiment est un filtre, pas
> une dépendance.

---

## Installation

```bash
cd sentinel
python -m venv venv
venv/Scripts/activate        # Windows  (source venv/bin/activate sur Linux)
pip install -r requirements.txt
cp config.example.yaml config.yaml
```

### 1. Configurer la sortie

Dans `config.yaml`, pointez `output.file` vers le dossier **Common Files**
de MT5 :

- Windows : `C:/Users/<vous>/AppData/Roaming/MetaQuotes/Terminal/Common/Files/ghostsbrigad_sentinel.txt`

### 2. Configurer Telegram (optionnel mais recommandé)

1. Allez sur https://my.telegram.org → *API development tools*
2. Créez une application pour obtenir `api_id` et `api_hash`
3. Renseignez-les dans `config.yaml` et listez les canaux à suivre
4. Au premier lancement, Telethon demande votre numéro + code de connexion,
   puis mémorise la session

⚠️ Utilisez uniquement des canaux **publics** auxquels vous avez accès.
Ne partagez jamais votre `api_hash`.

### 3. Adapter les symboles

La section `symbols` associe chaque symbole MT5 à des mots-clés :

- `keywords` : texte positif ⇒ haussier pour le symbole
- `inverse_keywords` : texte positif ⇒ **baissier** pour le symbole
  (ex. « dollar fort » est baissier pour EURUSD)

Les noms doivent correspondre **exactement** aux symboles MT5
(attention aux suffixes type `EURUSDm` sur certains comptes Exness —
adaptez les clés en conséquence).

---

## Lancement

```bash
python -m sentinel                 # boucle continue (toutes les 5 min)
python -m sentinel --once          # un seul cycle (test)
python -m sentinel --config autre.yaml
```

Laissez le service tourner en permanence à côté de MT5 (même machine ou
VPS). Sous Windows, le plus simple est une tâche planifiée au démarrage.

## Vérifier que l'EA reçoit le flux

1. Lancez `python -m sentinel --once`
2. Ouvrez le fichier `ghostsbrigad_sentinel.txt` dans `Common/Files`
3. Dans MT5, l'onglet *Experts* affiche les vetos/blackouts quand ils
   s'appliquent (`Trade vetoed by sentiment`, `News blackout active…`)

## Format du flux

```
generated=1719930000                     # timestamp de génération
S,EURUSD,0.42,0.80,17                    # symbole, score, confiance, nb messages
B,1719931800,1719933600,USD,HIGH,NFP     # blackout: début, fin, devise, impact, titre
```

---

## Limites honnêtes

- Le sentiment agrégé de Telegram/news est un **indicateur d'ambiance**,
  pas une prédiction. C'est pourquoi l'EA l'utilise en **veto/filtre** et
  jamais comme signal d'entrée autonome.
- Les canaux de « signaux » Telegram sont de qualité très variable ;
  privilégiez les canaux de **news** plutôt que les vendeurs de signaux.
- Testez toujours l'ensemble (EA + Sentinel) sur **compte démo** avant
  tout argent réel.
