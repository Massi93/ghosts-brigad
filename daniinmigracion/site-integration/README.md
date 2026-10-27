# Brancher le Live sur www.daniinmigracion.com

Le site reste le projet Cloudflare Pages **dani-inmigracion**. Le Worker `dani-live` doit déjà être publié
(`npm run deploy`, voir le README principal).

## En une commande

Depuis le dossier `daniinmigracion/` du dépôt, en donnant le dossier du site (celui qu'on publie avec
`wrangler pages deploy`) :

```bash
npm run site:integrate -- "/chemin/du/dossier/du/site" --dry-run   # montre ce qui sera fait
npm run site:integrate -- "/chemin/du/dossier/du/site"             # le fait
```

Le script peut être relancé sans risque (il ne refait pas ce qui est déjà fait). Il :

1. **copie** les fichiers `functions/` d'ici dans le dossier `functions/` du site (à côté de ceux de DanBot).
   Ils transmettent `/live`, `/cockpit` et `/api/live/…` au Worker `dani-live` ;
2. si le site a un **`_worker.js`** (mode « avancé » de Pages, par exemple pour DanBot), Cloudflare
   **ignore** le dossier `functions/` : le script ajoute alors le même relais à la fin de `_worker.js`.
   L'original est sauvegardé dans `daniinmigracion/.site-backup/` (hors du site publié) ;
3. **ajoute** avant `</body>` de chaque page HTML à la racine du site (`index.html`, `apostilla.html`,
   `huellas.html`…) :

   ```html
   <!-- Live de Dani Inmigración : bouton LIVE + rubrique « Próximo live » -->
   <script src="/live/widget.js" defer></script>
   ```

4. complète `_routes.json` et `wrangler.toml` du site **s'ils existent**.

Il reste deux gestes, que le script rappelle à la fin :

- **Lier** le Worker (une seule fois) : Cloudflare → Workers & Pages → **dani-inmigracion** → Settings →
  Bindings → Add → **Service binding** : nom `LIVE`, service `dani-live` (Production).
  (Inutile si le site a un `wrangler.toml` : le script y a ajouté la liaison.)
- **Republier** le site, toujours depuis le dossier `daniinmigracion/` :

  ```bash
  npm run site:deploy -- "/chemin/du/dossier/du/site" --dry-run   # liste ce qui sera publié
  npm run site:deploy -- "/chemin/du/dossier/du/site"             # publie
  ```

  ⚠️ Ne plus utiliser `npx wrangler pages deploy .` depuis le dossier du site : cette commande envoie
  **tout** le dossier, y compris les dossiers cachés (`.claude/`, `.env`…), qui deviennent publics.
  `site:deploy` copie d'abord uniquement les fichiers web dans un dossier temporaire (sans fichiers
  cachés sauf `.well-known/`, sans `node_modules`, README, `package.json`, journaux), place
  `functions/` et la configuration à côté, refuse les fichiers de plus de 25 Mo, puis publie.

## Ce que voient les visiteurs

Dès que le script est ajouté, la rubrique « Próximo live » (avec le formulaire d'inscription) apparaît
juste après le haut de page (`#hero`), même sans live programmé : les visiteurs peuvent s'inscrire pour être
prévenus. On peut la masquer ou changer son titre dans le cockpit (Sitio / Site). Le bouton LIVE rouge
s'affiche sous le menu (`#navbar`) quand un live est programmé, avec un compte à rebours dans les
5 dernières minutes.

Autres emplacements possibles : un élément `data-dani-live-button` et/ou `data-dani-live-section` dans la page.

## À la main (sans le script)

- Mode `functions/` : copier `site-integration/functions/` dans `functions/` du site.
- Mode `_worker.js` : au début de la fonction `fetch(request, env, ctx)` du `_worker.js`, ajouter :

  ```js
  const p = new URL(request.url).pathname;
  if (/^\/(?:live|cockpit)(?:\/|$)|^\/api\/live(?:\/|$)/.test(p)) return env.LIVE.fetch(request);
  ```

- Un `_routes.json` écrit à la main doit inclure `/live`, `/live/*`, `/cockpit`, `/cockpit/*` et `/api/live/*`
  (sauf si une règle comme `/api/*` les couvre déjà : Cloudflare refuse les règles qui se chevauchent).

## Tester en local

`npm run dev` (Worker) puis `npm run dev:site` : le dossier `preview/` est une maquette du site
(il ne doit pas être copié). Pour tester le vrai site : `npx wrangler pages dev . --service LIVE=dani-live`
depuis son dossier, pendant que `npm run dev` tourne.
