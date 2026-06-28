# das-shop

Multi-platform shopping app: Web (Next.js) + Android (Kotlin Compose) + REST API (Node/Express + Prisma).

## Architecture

```
das-shop/
├── apps/
│   ├── web/        Next.js 15 + TypeScript + Tailwind + shadcn-style UI
│   ├── api/        Node.js + Express + Drizzle ORM + SQLite + JWT auth
│   └── android/    Kotlin + Jetpack Compose + Material 3 + Retrofit + Hilt
└── packages/
    └── shared-types/   TypeScript types reused by web & potentially edge functions
```

## Quick start (local dev)

Prerequisites: Node 20+, npm 10+. Android requires Android Studio Hedgehog+ and JDK 17+.

### 1. Install deps

```bash
cd das-shop
npm install
```

### 2. Initialize DB and seed catalogue

```bash
npm run --workspace apps/api db:setup
```

This applies the schema to a local SQLite file (`apps/api/dev.db`) and inserts demo products + categories + an admin user.

### 3. Run API + Web together

```bash
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:3000

API health check: http://localhost:4000/health

### 4. Android app

Open `apps/android` in Android Studio. The API base URL points to `http://10.0.2.2:4000` (Android emulator's loopback to host). Build & run on emulator or device.

## Default admin

```
email: admin@das-shop.local
password: admin1234
```

## Tech choices (why)

- **Next.js App Router** — SSR/SSG for SEO (critical in e-commerce), image optimization, server actions for forms.
- **Drizzle ORM + SQLite (dev) / Postgres (prod)** — type-safe TypeScript-first ORM, zero engine binary downloads, swap driver to scale up.
- **JWT** — stateless auth; same token usable by web and Android.
- **Jetpack Compose + Material 3** — Google's recommended modern Android stack; matches what production retail apps now ship.
- **Retrofit + Kotlin coroutines + Hilt** — industry standard for Android networking + DI.
- **Tailwind + shadcn-style components** — fast iteration, no vendor lock-in (we own the component source).

## Roadmap

- [x] Product catalog, categories, search, filters
- [x] User auth (email + password, JWT)
- [x] Cart (per-user, server-side)
- [ ] Stripe checkout
- [ ] Order history
- [ ] Wishlist
- [ ] Admin dashboard (product CRUD)
- [ ] Push notifications
- [ ] Reviews & ratings
- [ ] Recommendation engine
