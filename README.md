# 🌐 Dani Inmigración (branche `dani`)

Cette branche contient uniquement le site **daniinmigracion** :
redesign mobile en React + Vite + Tailwind CSS + Framer Motion,
avec la fonctionnalité **Live** (voir plus bas).

## Démarrage rapide

```bash
cd daniinmigracion
npm install
npm run dev      # site + API + cockpit sur http://localhost:3000 (rechargement à chaud)
npm run build    # build de production (dist/)
npm start        # sert la version compilée
```

| Page | URL locale |
|---|---|
| 🌐 Site | http://localhost:3000 |
| 🔴 Page du live (viewers) | http://localhost:3000/live |
| 🎛️ Cockpit (Dani) | http://localhost:3000/cockpit — identifiant `dani` / mot de passe `daniinmigracion` |

## 🔴 Live

### Ce que fait la fonctionnalité

- **Cockpit sécurisé `/cockpit`** (connexion obligatoire, sinon redirection vers `/cockpit/login`) :
  - démarrer / arrêter un live avec la webcam et le micro (WebRTC) ;
  - programmer un live (date + heure), le modifier ou l'annuler ;
  - suivre en temps réel : viewers connectés et leur localisation approximative (ville / pays via l'IP), nombre de ❤️, durée, pic de viewers ;
  - enregistrement automatique : chaque live est sauvegardé, lisible et téléchargeable dans « Grabaciones » ;
  - liste des inscrits (nom, prénom, email, date d'inscription), export CSV, suppression ;
  - notification manuelle par email : cases à cocher, bouton « Enviar », statut d'envoi en direct pour chaque inscrit ;
  - réglages du site (afficher / masquer la rubrique « Próximo live », textes) et email de test.
- **Site** : rubrique « Próximo live » avec formulaire d'inscription (nom, prénom, email), compte à rebours, et bouton **LIVE** rouge clignotant dans l'en-tête dès qu'un live est programmé. Pendant les 5 dernières minutes, un chronomètre 05:00 → 00:00 s'affiche à côté ; à 00:00 (ou dès que Dani est en direct), le bouton devient actif et ouvre `/live`.
- **Page `/live`** : plein écran, mobile d'abord. Le viewer regarde seulement (ni chat, ni commentaires, ni micro). Il peut envoyer des « me gusta » : bouton cœur ou double-tap sur la vidéo. Les cœurs animés montent à l'écran façon TikTok, sont visibles par tous les viewers et comptés dans le cockpit.
- **Emails automatiques** : confirmation à l'inscription, rappel **3 h avant** et **5 min avant** chaque live programmé. Chaque email contient un lien de désinscription, et Gmail / Outlook affichent leur bouton natif « Se désabonner ».

L'interface publique et le cockpit sont en espagnol, comme le reste du site ; le code est commenté en français.

### Lancer en local

Prérequis : **Node.js 22 ou plus récent** et un navigateur récent (Chrome, Edge, Firefox ou Safari).

```bash
cd daniinmigracion
npm install
cp .env.example .env      # optionnel : sans .env, tout fonctionne avec les valeurs par défaut
npm run dev
```

Puis :

1. Ouvrir http://localhost:3000/cockpit et se connecter (`dani` / `daniinmigracion`).
2. Onglet **Programación** : programmer un live. Le bouton LIVE apparaît aussitôt sur le site.
3. Onglet **Directo** : « Iniciar live » (le navigateur demande l'accès à la caméra et au micro).
4. Dans un autre onglet ou navigateur, ouvrir http://localhost:3000/live pour regarder et envoyer des cœurs.

> **Caméra** : les navigateurs n'autorisent la webcam que sur `https://` ou `http://localhost`. Le cockpit doit donc être ouvert sur l'ordinateur qui fait tourner le serveur.
> **Tester sur un téléphone** du même réseau Wi-Fi : lancer avec `HOST=0.0.0.0` (dans `.env`) puis ouvrir `http://<IP-de-l-ordinateur>:3000/live` sur le téléphone (la page viewer n'a pas besoin de caméra).

Changer le mot de passe du cockpit (il est stocké hashé avec bcrypt) :

```bash
npm run cockpit:password -- "nouveau-mot-de-passe"
```

### Configurer l'email

Tout se règle dans `daniinmigracion/.env` (modèle commenté : `.env.example`).

| Mode | Usage |
|---|---|
| `MAIL_MODE=console` (défaut) | **Aucun email réel.** Chaque email est résumé dans le terminal et enregistré en `.eml` dans `storage/mails/` (s'ouvre avec Thunderbird, Outlook ou Apple Mail). Idéal pour tester. |
| `MAIL_MODE=smtp` | Envoi via SMTP. Avec **Mailtrap**, les emails sont capturés dans une boîte de test et jamais délivrés ; avec Brevo, OVH, Gmail…, ils sont réellement envoyés. |

Exemple Mailtrap (Email Testing → Inboxes → SMTP Settings) :

```ini
MAIL_MODE=smtp
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=xxxxxxxx
SMTP_PASS=xxxxxxxx
MAIL_FROM="Dani Inmigración <no-reply@daniinmigracion.com>"
```

Redémarrer le serveur, puis vérifier avec le bouton **« Enviar prueba »** du cockpit (onglet **Sitio**).

Règles des rappels automatiques (vérifiés toutes les 30 s, `REMINDER_CHECK_SECONDS`) :

- **3 h avant** : envoyé aux inscrits arrivés avant l'ouverture de cette fenêtre. Ceux qui s'inscrivent après ont déjà reçu la confirmation avec la date. Si le live est programmé moins de 3 h à l'avance, l'email indique le temps réellement restant.
- **5 min avant** : envoyé à tous les inscrits actifs.
- Une personne ne reçoit jamais deux fois le même rappel, même si le serveur redémarre (index unique en base).
- Si un live est reprogrammé, ses rappels repartent de zéro avec la nouvelle heure.
- Les rappels passent devant un gros envoi manuel en cours, pour ne jamais arriver en retard.
- Les dates des emails sont affichées dans le fuseau `SITE_TIMEZONE` (défaut `America/New_York`) ; le site, lui, affiche l'heure locale de chaque visiteur.

### Où sont stockées les données

Tout est dans `daniinmigracion/storage/`, ignoré par git (modifiable avec `DATA_DIR`) :

| Chemin | Contenu |
|---|---|
| `storage/recordings/` | **Enregistrements des lives** : `live-<id>-<date>-<suffixe>.webm` (VP8/Opus ; `.mp4` si Dani diffuse depuis Safari). Un live interrompu puis repris peut avoir plusieurs fichiers. |
| `storage/dani-live.sqlite` | Base SQLite : compte cockpit (hash bcrypt), sessions, lives, inscrits, journal des emails, réglages. |
| `storage/mails/` | Emails générés en mode `console`. |

L'enregistrement est envoyé au serveur par morceaux de 2 s pendant le live : même si l'onglet se ferme brutalement, tout ce qui a été reçu est conservé. À la fin, la durée est écrite dans l'en-tête du fichier WebM pour que la barre de progression fonctionne dans les lecteurs.

Robustesse pendant un live :

- **Coupure réseau** : les morceaux sont renvoyés jusqu'au retour de la connexion, et le cockpit reprend la diffusion de ce même live tout seul.
- **Serveur redémarré** : la reprise est aussi automatique. L'enregistrement continue dans un nouveau segment.
- **Onglet du cockpit fermé ou rechargé** : le live reste ouvert `LIVE_GRACE_SECONDS` (3 min par défaut), avec un bouton « Reanudar cámara ». Passé ce délai, il se termine seul.

### Architecture

```
daniinmigracion/
├── server/                     # Node.js : Express + Socket.io + SQLite
│   ├── index.js                # point d'entrée (Vite intégré en dev, dist/ en prod)
│   ├── config.js               # variables d'environnement
│   ├── db/                     # schéma SQL + connexion better-sqlite3
│   ├── auth/                   # bcrypt, sessions par cookie, protection /cockpit
│   ├── live/                   # état du live, signalisation WebRTC, cœurs, enregistrements
│   ├── registrations/          # inscriptions, export CSV, désinscription
│   ├── mail/                   # transport SMTP/console, modèles, rappels, envois manuels
│   ├── geo/                    # géolocalisation IP (ville / pays)
│   └── admin/                  # tableau de bord et réglages du site
└── src/
    ├── main.jsx                # routage : /, /live, /cockpit, /cockpit/login
    ├── components/LiveButton.jsx, NextLive.jsx
    ├── live/                   # page viewer, réception WebRTC, cœurs animés
    └── cockpit/                # login, tableau de bord, diffusion caméra, enregistreur
```

Temps réel : **Socket.io**, avec l'espace `/live` (public : état du live, compteur, cœurs) et l'espace `/cockpit` (authentifié par le cookie de session).

Vidéo : **WebRTC en « mesh »**. Le navigateur de Dani envoie le flux directement à chaque viewer, et le serveur ne relaie que la négociation.

### Sécurité

- Mot de passe hashé avec **bcrypt** (12 tours) ; le compte est créé au premier démarrage.
- Session : jeton aléatoire de 256 bits dans un cookie `HttpOnly` + `SameSite=Strict`, en plus `Secure` dès que le site est servi en HTTPS. La base ne stocke que le hash SHA-256 du jeton. Déconnexion = session supprimée.
- Session vérifiée à chaque action du cockpit, y compris en temps réel : après une déconnexion ou un changement de mot de passe, les connexions ouvertes sont coupées.
- Anti brute-force : 5 essais par IP sur 15 min (comptés même en requêtes parallèles), et 4 vérifications de mot de passe simultanées au maximum. Les requêtes d'une autre origine sont refusées.
- Un avertissement s'affiche au démarrage tant que le mot de passe par défaut n'a pas été changé.
- Formulaire d'inscription :
  - limité à 10 par IP et par heure, avec un champ piège anti-robots ;
  - il ne peut pas modifier une inscription existante ;
  - une adresse désinscrite reçoit un lien pour confirmer elle-même sa réinscription.
- Désinscription en deux temps (page de confirmation) : les antivirus de messagerie qui ouvrent les liens automatiquement ne désinscrivent personne.
- Viewers :
  - la salle d'attente ouvre 1 h avant le live ;
  - 5 connexions max par IP (`MAX_VIEWERS_PER_IP`) ;
  - les demandes de renégociation vidéo sont limitées.
- Export CSV protégé contre l'injection de formules Excel. IP des viewers masquées dans le cockpit (`81.23.x.x`).

### Limites à connaître

- **Nombre de viewers** : en mesh, Dani envoie un flux par viewer (environ 1,5 Mbit/s chacun en montée). C'est confortable jusqu'à une vingtaine de viewers avec une bonne connexion (plafond réglable : `MAX_VIEWERS`). Au-delà, il faudra un serveur média (SFU : LiveKit, mediasoup…).
- **Géolocalisation** : en local, tous les viewers apparaissent « Local (este equipo) » ou « Red local ». Une vraie ville / un vrai pays ne s'affichent qu'avec des IP publiques (fournisseur `GEO_PROVIDER`).
- **Hors réseau local** (mise en ligne, non faite ici) : il faudra HTTPS et un serveur TURN (`ICE_SERVERS`) pour les viewers derrière des réseaux restrictifs.

## Les autres projets du dépôt

| Projet | Branche |
|---|---|
| 🤖 Bot trading MT5 | `BrigadBot` |
| 💪 FitFlow (app fitness) | `fitflow` |
| 🌐 Dani Inmigración (site) | `dani` (cette branche) |
| 🛒 Das Shop | `das-shop` |
