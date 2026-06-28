# das-shop

Multi-platform shopping app: **Web + API** (single Next.js app on Vercel) + **Android** (Kotlin Compose).

## Architecture

```
das-shop/
├── apps/
│   ├── web/        Next.js 15 — pages + /api route handlers + libSQL DB
│   │   └── src/
│   │       ├── app/             Pages (home, catalog, cart, login, orders, search)
│   │       │   └── api/         Route handlers (products, categories, auth, cart, orders)
│   │       ├── components/      UI primitives
│   │       ├── lib/             Browser-side helpers (API client, stores)
│   │       └── server/          Server-only code (DB, auth, init/seed)
│   └── android/    Kotlin + Jetpack Compose + Material 3 + Retrofit + Hilt
└── packages/
    └── shared-types/   Reserved for shared TS types if needed
```

One backend, one frontend, one deploy. The Android app hits the same `/api/*` routes as the browser.

## Deploy to production

→ See [DEPLOY.md](./DEPLOY.md) — one-click Vercel button + Turso DB setup, ~3 minutes total.

## Local development

Prerequisites: Node 20+, npm 10+.

```bash
cd das-shop
npm install
npm run dev
```

Open http://localhost:3000 — schema + seed run automatically on first request.

The local DB is a SQLite file at `apps/web/dev.db`. No env vars required for local dev.

### Default admin

```
email: admin@das-shop.local
password: admin1234
```

## Android

Open `apps/android` in Android Studio Hedgehog or newer. The app's `API_BASE_URL` defaults to `http://10.0.2.2:3000/api/` (the emulator's loopback to your dev host). For a physical device or production, override it in `app/build.gradle.kts`.

The debug APK is built automatically by CI on every push that touches `apps/android/**` — see the [Actions tab](https://github.com/Massi93/ghosts-brigad/actions) for the `das-shop-debug-apk` artifact.

## Tech choices (why)

- **Single Next.js app** for web + API — one deploy, one origin, no CORS, server components can hit the DB directly.
- **Drizzle ORM + libSQL** — type-safe TypeScript-first ORM, SQLite locally, hosted libSQL (Turso) in production, identical SQL.
- **JWT auth** — stateless, same token works for web fetch and Android Retrofit.
- **Jetpack Compose + Material 3** — Google's current recommended Android stack.
- **Retrofit + Kotlin coroutines + Hilt** — industry-standard Android networking + DI.
- **Tailwind + custom components** — fast iteration, we own the source, no vendor lock-in.

## Roadmap

- [x] Product catalog, categories, search, filters
- [x] User auth (email + password, JWT)
- [x] Cart (per-user, server-side)
- [x] Checkout (creates order from cart)
- [x] Order history
- [ ] Stripe payment intent on checkout
- [ ] Wishlist
- [ ] Admin dashboard (product CRUD)
- [ ] Push notifications (FCM)
- [ ] Reviews & ratings
- [ ] Recommendation engine
