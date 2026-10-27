# 🌐 Dani Inmigración (branche `dani`)

Cette branche contient le dossier **daniinmigracion** : la fonctionnalité **Live**
de www.daniinmigracion.com (serveur Cloudflare Workers + page /live + cockpit + bouton LIVE du site),
et l'ancienne maquette React du site utilisée pour le développement.

## Démarrage rapide

Prérequis : **Node.js 22 ou plus récent** (`node -v` ; sinon installer la version LTS depuis https://nodejs.org).

```bash
cd daniinmigracion
npm install
cp .dev.vars.example .dev.vars   # variables locales (facultatif)
npm run dev        # serveur Live (Cloudflare Worker local) sur http://localhost:8787
npm run dev:site   # (2ᵉ terminal) maquette de www.daniinmigracion.com avec le Live sur http://localhost:8788
```

| Page | URL locale |
|---|---|
| 🌐 Maquette du site réel + bouton LIVE + « Próximo live » | http://localhost:8788 |
| 🔴 Page du live (viewers) | http://localhost:8788/live |
| 🎛️ Cockpit (Dani) | http://localhost:8788/cockpit · identifiant `dani` / mot de passe `daniinmigracion` |
| 🧪 Ancienne maquette React du site (développement) | http://localhost:8787 |

## 🔴 Live

Le Live fonctionne **sur le site existant www.daniinmigracion.com** (Cloudflare Pages) : aucun nouveau site.
Les visiteurs voient le bouton LIVE et la rubrique d'inscription sur la page d'accueil habituelle, regardent
sur `www.daniinmigracion.com/live`, et Dani pilote tout depuis `www.daniinmigracion.com/cockpit`.

### Ce que fait la fonctionnalité

- **Cockpit sécurisé `/cockpit`** (connexion obligatoire, sinon redirection vers `/cockpit/login`) :
  - démarrer / arrêter un live avec la webcam et le micro (WebRTC) ;
  - programmer un live (date + heure), le modifier ou l'annuler ;
  - suivre en temps réel : viewers connectés et leur localisation approximative (ville / pays, fournie par Cloudflare), nombre de ❤️, durée, pic de viewers ;
  - enregistrement automatique : chaque live est sauvegardé (Cloudflare R2), lisible et téléchargeable dans « Grabaciones » ;
  - liste des inscrits (nom, prénom, email, langue, date d'inscription), export CSV, suppression ;
  - notification manuelle par email : cases à cocher, bouton « Enviar », statut d'envoi en direct pour chaque inscrit ;
  - réglages de la rubrique « Próximo live », email de test et, en mode test, les derniers emails « envoyés ».
- **Site** (`public/widget.js`, ajouté au site avec une seule ligne) :
  - bouton **LIVE** rouge clignotant sous le menu dès qu'un live est programmé ;
  - pendant les 5 dernières minutes, un chronomètre 05:00 → 00:00 à côté ; à 00:00 (ou dès que Dani est en direct), le bouton devient actif et ouvre `/live` ;
  - rubrique « Próximo live » juste après le haut de page : date dans le fuseau du visiteur, compte à rebours, formulaire d'inscription (prénom, nom, email) ;
  - mêmes styles que le site, et même langue : espagnol, français, arabe (de droite à gauche), y compris quand le visiteur change de langue.
- **Page `/live`**, pensée d'abord pour le téléphone, dans la langue du site :
  - avant et après le live : page claire aux couleurs du site, avec compte à rebours, « ajouter à mon agenda » (.ics) et inscription aux rappels ;
  - pendant le live : vidéo plein écran ; le premier toucher active le son, l'écran reste allumé, et un bouton passe de « ajusté » à « plein écran rempli » ;
  - le viewer regarde seulement (ni chat, ni commentaires, ni micro). Il peut envoyer des « me gusta » : bouton cœur ou double-tap sur la vidéo. Les cœurs animés montent à l'écran façon TikTok, sont visibles par tous les viewers et comptés dans le cockpit.
- **Emails automatiques**, dans la langue de l'inscrit :
  - confirmation à l'inscription ;
  - rappel **3 h avant** et **5 min avant** chaque live programmé ;
  - lien de désinscription dans chaque email, et bouton natif « Se désabonner » dans Gmail / Outlook.

Le cockpit est en espagnol ou en français (bouton ES / FR). Le code est commenté en français.

### Architecture

```
Visiteur ─► www.daniinmigracion.com  (Cloudflare Pages : le site actuel, inchangé)
              │  /                   pages du site + <script src="/live/widget.js">
              │  /live, /cockpit…    ┐
              │  /api/live/…         ┘ Pages Functions (site-integration/functions)
              ▼                        └─ liaison de service « LIVE »
           Worker « dani-live »  (daniinmigracion/worker)
              ├─ fichiers de l'application (page /live, cockpit, widget.js)
              └─ Durable Object « LiveHub » : API, WebSocket, base SQLite intégrée,
                 réveils programmés (rappels) ──► R2 « dani-live-recordings » (vidéos)
```

```
daniinmigracion/
├── wrangler.jsonc              # configuration Cloudflare du Worker « dani-live »
├── worker/                     # serveur Live (Cloudflare Workers)
│   ├── index.js                # point d'entrée : pages /live, /cockpit (protégé), fichiers, API
│   ├── LiveHub.js              # Durable Object : routes API, WebSocket, réveils programmés
│   ├── db.js                   # schéma SQLite (stockage du Durable Object)
│   ├── auth/                   # mot de passe PBKDF2, sessions par cookie
│   ├── live/                   # état du live, signalisation WebRTC, cœurs, enregistrements R2
│   ├── registrations/          # inscriptions, export CSV, désinscription
│   ├── mail/                   # envoi (console / SMTP / Brevo / Resend), modèles es-fr-ar, rappels
│   └── admin/                  # tableau de bord, réglages, emails de test
├── public/widget.js            # bouton LIVE + rubrique « Próximo live » pour le site principal
├── site-integration/
│   ├── functions/              # 5 petits fichiers à copier dans le projet du site
│   └── preview/                # maquette locale du site (npm run dev:site)
├── scripts/                    # mot de passe du cockpit, lancement de la maquette
└── src/                        # React : page /live, cockpit, client WebSocket
```

Temps réel : **WebSocket** vers le Durable Object (`/api/live/ws/live` public, `/api/live/ws/cockpit` authentifié).
Vidéo : **WebRTC en « mesh »** : le navigateur de Dani envoie le flux à chaque viewer, le serveur ne relaie que la négociation.

### Mettre en ligne (compte Cloudflare de daniinmigracion.com)

Tout se fait depuis le dossier `daniinmigracion/` du dépôt, sur ton ordinateur.

**1. Serveur Live (une seule fois)**

```bash
cd daniinmigracion
npm install
npx wrangler login                                   # même compte Cloudflare que le site
npx wrangler r2 bucket create dani-live-recordings   # stockage des vidéos
npm run deploy                                       # compile et publie le Worker « dani-live »
npm run cockpit:password -- "un-mot-de-passe-solide" # mot de passe du cockpit (hashé, secret Cloudflare)
```

**2. Brancher le Live sur le site** (projet Pages `dani-inmigracion`)

```bash
npm run site:integrate -- "/chemin/du/dossier/du/site"   # dossier publié avec wrangler pages deploy
```

Le script copie les relais `functions/` (ou complète `_worker.js` si le site en a un : Cloudflare ignore alors `functions/`), ajoute `<script src="/live/widget.js" defer></script>` dans les pages HTML du site, et complète `_routes.json` / `wrangler.toml` s'ils existent. Détails et version « à la main » : [`site-integration/README.md`](daniinmigracion/site-integration/README.md).

Puis :

1. Tableau de bord Cloudflare → **Workers & Pages** → projet **dani-inmigracion** → **Settings** → **Bindings** → **Add** → **Service binding** : nom `LIVE`, service `dani-live` (Production).
2. Republier le site comme d'habitude, depuis son dossier :
   ```bash
   npx wrangler pages deploy . --project-name dani-inmigracion --branch main --commit-dirty=true
   ```

Ensuite, ouvrir https://www.daniinmigracion.com/cockpit (identifiant `dani` + le mot de passe choisi). La rubrique « Próximo live » (inscription) apparaît après le haut de page dès la mise en ligne ; le bouton LIVE n'apparaît que lorsqu'un live est programmé. La rubrique peut être masquée depuis le cockpit (Sitio).

**3. Mises à jour du Live** : `npm run deploy` (le site n'a pas besoin d'être republié).

### Configurer l'email

Par défaut (`MAIL_MODE=console`), **aucun email réel n'est envoyé**. Les emails apparaissent dans le cockpit (Sitio → « Correos de prueba ») et dans les logs (`npx wrangler tail`). C'est idéal pour tester.

Pour l'envoi réel, choisir un fournisseur. Exemple **Brevo** (300 emails/jour gratuits) :

1. Brevo → Senders, Domains → ajouter `daniinmigracion.com` et créer les enregistrements DNS indiqués dans Cloudflare (DNS).
2. Brevo → SMTP & API → API Keys → créer une clé.
3. Dans `wrangler.jsonc`, remplacer `"MAIL_MODE": "console"` par `"MAIL_MODE": "brevo"`, puis :
   ```bash
   npx wrangler secret put MAIL_API_KEY   # coller la clé Brevo
   npm run deploy
   ```
4. Vérifier avec le bouton **« Enviar prueba »** du cockpit.

| `MAIL_MODE` | Variables |
|---|---|
| `console` (défaut) | aucune |
| `brevo` / `resend` | `MAIL_API_KEY` (secret) |
| `smtp` | `SMTP_HOST`, `SMTP_PORT` (587 STARTTLS ou 465 + `SMTP_SECURE=true`), `SMTP_USER`, `SMTP_PASS` (secrets). Fonctionne avec Brevo SMTP, OVH, Gmail, Mailtrap… |

L'adresse d'expédition se règle avec `MAIL_FROM` (domaine vérifié chez le fournisseur).

Règles des rappels automatiques (le Durable Object se réveille tout seul aux bons moments) :

- **3 h avant** : envoyé à tous les inscrits actifs, sauf ceux qui viennent de recevoir (dans ces 3 h) la confirmation de ce live avec sa date. Si le live est programmé ou déplacé moins de 3 h à l'avance, il part tout de suite et indique le temps réellement restant.
- **5 min avant** : envoyé à tous les inscrits actifs.
- **Live lancé en avance** (dans les 3 h avant l'heure prévue) : le rappel « 5 min » devient « Dani est en direct » et part dès le lancement.
- Les liens des emails ouvrent `/live` dans la langue de l'inscrit (`/live?lang=ar`).
- Envois cadencés à `MAIL_RATE_PER_SECOND` (5 par seconde par défaut) pour respecter les limites du fournisseur.
- Une personne ne reçoit jamais deux fois le même rappel (index unique en base).
- Si un live est reprogrammé, ses rappels repartent de zéro avec la nouvelle heure.
- Les rappels passent devant un gros envoi manuel en cours.
- Les dates des emails sont dans le fuseau `SITE_TIMEZONE` (`Europe/Madrid`) ; le site affiche l'heure locale de chaque visiteur.

### Variables

Valeurs publiques : `vars` de `wrangler.jsonc`. Secrets : `npx wrangler secret put NOM`. En local : `.dev.vars` (modèle `.dev.vars.example`).

| Variable | Rôle |
|---|---|
| `PUBLIC_URL` | adresse du site dans les liens des emails (`https://www.daniinmigracion.com`) |
| `ADMIN_USERNAME` | identifiant du cockpit (`dani`) |
| `ADMIN_PASSWORD_HASH` (secret) | hash du mot de passe, posé par `npm run cockpit:password` |
| `MAIL_MODE`, `MAIL_FROM`, `MAIL_API_KEY`, `SMTP_*` | envoi des emails (voir plus haut) |
| `SITE_TIMEZONE` | fuseau des dates dans les emails |
| `ICE_SERVERS` | serveurs STUN (WebRTC) |
| `CLOUDFLARE_TURN_KEY_ID`, `CLOUDFLARE_TURN_API_TOKEN` (secrets) | relais TURN Cloudflare (Realtime → TURN) : vidéo garantie même en 4G ou derrière un réseau d'entreprise |
| `MAX_VIEWERS`, `MAX_VIEWERS_PER_IP` | limites de viewers (50, et 8 par IP ou réseau IPv6 /64) |
| `LIVE_GRACE_SECONDS` | délai avant la fin automatique d'un live dont la caméra est perdue (180 s) |
| `LIVE_MISSED_AFTER_MINUTES` | un live programmé jamais démarré devient « non réalisé » (120 min) |

### Où sont stockées les données

| Où | Contenu |
|---|---|
| Durable Object `LiveHub` (base SQLite intégrée) | sessions du cockpit, lives, inscrits, journal des emails, réglages |
| R2 `dani-live-recordings` | vidéos des lives, par morceaux de 2 s (`recordings/<id>/000000…`), recomposées à la lecture ou au téléchargement en un seul fichier `.webm` (`.mp4` depuis Safari) |

L'enregistrement est envoyé par morceaux de 2 s pendant le live : même si l'onglet se ferme brutalement, tout ce qui a été reçu est conservé. À la fin, la durée est écrite dans l'en-tête WebM pour que la barre de progression fonctionne.

Robustesse pendant un live :

- **Coupure réseau** : les morceaux sont renvoyés jusqu'au retour de la connexion, et le cockpit reprend la diffusion de ce même live tout seul.
- **Redémarrage du serveur** (mise à jour Cloudflare, `npm run deploy`) : le cockpit et les viewers se reconnectent, la diffusion reprend et l'enregistrement continue dans le même fichier.
- **Onglet du cockpit fermé ou rechargé** : le live reste ouvert `LIVE_GRACE_SECONDS`, avec un bouton « Reanudar cámara ». Passé ce délai, il se termine seul, même si plus personne n'est connecté.

### Sécurité

- Mot de passe jamais stocké en clair : hash **PBKDF2-SHA256** (100 000 itérations) dans un secret Cloudflare. Changer le mot de passe ferme toutes les sessions.
- Session : jeton aléatoire de 256 bits dans un cookie `HttpOnly` + `SameSite=Strict` + `Secure` (HTTPS). La base ne stocke que le hash SHA-256 du jeton.
- Session vérifiée à chaque action du cockpit, y compris en temps réel : après une déconnexion ou un changement de mot de passe, les connexions ouvertes sont coupées.
- Anti brute-force : 5 essais sur 15 min par IP (en IPv6 : par réseau /64), comptés même en requêtes parallèles, plus un budget global de vérifications par seconde pour qu'une rafale de faux logins ne ralentisse jamais le live. Les requêtes venant d'un autre site sont refusées.
- ⚠️ Le dépôt est public : le mot de passe de démonstration (`daniinmigracion`) est connu de tous. **Avant la mise en ligne**, en choisir un autre avec `npm run cockpit:password -- "…"`. Un avertissement s'affiche dans le cockpit tant que le mot de passe de démonstration est utilisé.
- Corps des requêtes lus morceau par morceau et coupés au-delà de la limite (100 Ko en JSON) : un envoi énorme ne peut pas saturer la mémoire du serveur.
- Formulaire d'inscription :
  - limité à 10 par IP (ou réseau IPv6 /64) et par heure, avec un champ piège anti-robots ;
  - il ne peut pas modifier une inscription existante ;
  - une adresse désinscrite reçoit un lien pour confirmer elle-même sa réinscription.
- Désinscription en deux temps (page de confirmation) : les antivirus de messagerie qui ouvrent les liens automatiquement ne désinscrivent personne.
- Viewers :
  - la salle d'attente ouvre 1 h avant le live ;
  - 8 spectateurs max par IP ou réseau IPv6 /64 (`MAX_VIEWERS_PER_IP`), 40 connexions ouvertes max ;
  - messages limités par connexion, et renégociations vidéo limitées.
- Export CSV protégé contre l'injection de formules Excel. IP des viewers masquées dans le cockpit (`81.23.x.x`).

### Coûts Cloudflare

- Le plan **Workers gratuit** suffit pour démarrer : Durable Objects SQLite, 100 000 requêtes par jour, R2 avec 10 Go et des opérations gratuites chaque mois.
- Pour des lives avec beaucoup de viewers, le plan **Workers Paid** (5 $/mois) donne plus de marge.
- Une heure de vidéo enregistrée pèse environ 1 Go.

### Démo autonome (sans serveur)

```bash
npm run build:demo   # → dist-demo/demo.html (un seul fichier, à ouvrir dans un navigateur)
```

Les vrais composants de la page `/live` et du cockpit tournent avec un serveur simulé dans le navigateur (`src/demo/`) : viewers et cœurs simulés, emails dans une boîte locale, caméra simulée si besoin. Rien n'est conservé.

### Limites à connaître

- **Nombre de viewers** : en mesh, Dani envoie un flux par viewer (environ 1,5 Mbit/s chacun en montée). C'est confortable jusqu'à une vingtaine de viewers avec une bonne connexion (plafond `MAX_VIEWERS`). Au-delà, il faudra un serveur média (SFU, par exemple Cloudflare Realtime).
- **Géolocalisation** : en local, les viewers apparaissent « Local (este equipo) ». En ligne, Cloudflare fournit la ville et le pays.
- **Réseaux restrictifs** : sans relais TURN, certains viewers (réseaux d'entreprise, certains opérateurs 4G) peuvent ne pas recevoir la vidéo. Il suffit d'ajouter les clés TURN Cloudflare.
- **Limites de débit en mémoire** : les compteurs (login, inscriptions) repartent de zéro si le serveur du live redémarre.
- **Inscriptions sans double confirmation** : n'importe qui peut inscrire une adresse (chaque email contient un lien de désinscription).
- **Emails en échec** : un rappel qui échoue (fournisseur indisponible) n'est pas renvoyé automatiquement ; il apparaît « Error » dans le cockpit et peut être renvoyé à la main.

## Les autres projets du dépôt

| Projet | Branche |
|---|---|
| 🤖 Bot trading MT5 | `BrigadBot` |
| 💪 FitFlow (app fitness) | `fitflow` |
| 🌐 Dani Inmigración (site) | `dani` (cette branche) |
| 🛒 Das Shop | `das-shop` |
