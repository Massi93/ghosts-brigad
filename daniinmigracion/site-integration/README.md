# Brancher le Live sur www.daniinmigracion.com

Le site reste le projet Cloudflare Pages **dani-inmigracion**. Trois petits changements suffisent :

1. **Copier** le dossier `functions/` d'ici dans le projet du site (fusion avec son dossier `functions/`
   existant, à côté de `api/chat.js` de DanBot). Ces fichiers transmettent `/live`, `/cockpit` et
   `/api/live/…` au Worker `dani-live` :

   ```
   functions/live/index.js          functions/live/[[path]].js
   functions/cockpit/index.js       functions/cockpit/[[path]].js
   functions/api/live/[[path]].js
   ```

2. **Ajouter** dans `index.html` du site, juste avant `</body>` :

   ```html
   <!-- Live de Dani Inmigración : bouton LIVE + rubrique « Próximo live » -->
   <script src="/live/widget.js" defer></script>
   ```

   Le bouton LIVE s'accroche sous le menu (`#navbar`) et la rubrique s'insère avant `#contacto`.
   Pour choisir d'autres emplacements : un élément `data-dani-live-button` et/ou `data-dani-live-section`.

3. **Lier** le Worker : Cloudflare → Workers & Pages → **dani-inmigracion** → Settings → Bindings →
   Add → **Service binding** : nom `LIVE`, service `dani-live` (environnement Production).

Puis republier le site : `npx wrangler pages deploy . --project-name dani-inmigracion --branch main`.

Le dossier `preview/` est une maquette du site pour tester tout ça en local (`npm run dev:site`) ;
il ne doit pas être copié.
