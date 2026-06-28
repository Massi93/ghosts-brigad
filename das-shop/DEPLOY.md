# Deploy das-shop to production

das-shop's web + API is a single Next.js app. The recommended host is **Vercel** (web + API in one deploy) with **Turso** (libSQL) for the database. Both have generous free tiers.

## One-click deploy

Click the button, follow the prompts:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FMassi93%2Fghosts-brigad&project-name=das-shop&repository-name=das-shop&root-directory=das-shop%2Fapps%2Fweb&env=DATABASE_URL,DATABASE_AUTH_TOKEN,JWT_SECRET&envDescription=Turso%20libSQL%20database%20%2B%20JWT%20signing%20secret)

The button pre-fills:

- Repository URL → `Massi93/ghosts-brigad`
- Root directory → `das-shop/apps/web`
- Env vars to prompt → `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `JWT_SECRET`

## Step-by-step (3 minutes)

### 1. Create a free Turso database

Easiest path — install the CLI and run three commands:

```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup        # opens browser, free signup
turso db create das-shop
turso db show das-shop --url        # -> libsql://das-shop-<user>.turso.io
turso db tokens create das-shop     # -> eyJhbGc...
```

Keep both values.

Or use the web UI: https://app.turso.tech → Create database → copy URL + create token.

### 2. Generate a JWT secret

```bash
openssl rand -hex 32
```

Any long random string works.

### 3. Click the deploy button above

When Vercel asks for env vars:

| Variable                | Value                                        |
| ----------------------- | -------------------------------------------- |
| `DATABASE_URL`          | `libsql://das-shop-<user>.turso.io`          |
| `DATABASE_AUTH_TOKEN`   | the token from step 1                        |
| `JWT_SECRET`            | the random string from step 2                |

Vercel builds and deploys (~2 minutes). The DB schema and seed data are applied automatically on the first request (idempotent — safe to re-run).

### 4. Done

Your URL: `https://das-shop-<something>.vercel.app`

Default admin login (created on first cold start):

```
email: admin@das-shop.local
password: admin1234
```

**Change the admin password immediately in production** by registering a new admin via the API and deleting the seed admin from the Turso console.

## Point the Android app at production

Open `apps/android/app/build.gradle.kts` and update:

```kotlin
buildConfigField("String", "API_BASE_URL", "\"https://das-shop-<yours>.vercel.app/api/\"")
```

Rebuild the APK and ship.

## Cost expectations (Jan 2026 free tiers)

- **Vercel Hobby**: 100 GB-hours/month of serverless function compute, unlimited static requests. Plenty for an MVP.
- **Turso Starter**: 9 GB storage, 1 billion row reads/month, 25M row writes. More than enough for the catalog scale here.

You stay within free tier until you have several thousand monthly active customers. Past that, both services have straightforward pay-as-you-go pricing.

## Troubleshooting

- **"DATABASE_URL is required" at boot** — env var not set in Vercel project settings. Add it under Settings → Environment Variables and redeploy.
- **Health check returns 500** — usually a missing Turso auth token. Verify `DATABASE_AUTH_TOKEN` is set for all environments (Production, Preview, Development).
- **Cold start is slow** — first request after deploy or idle period seeds the DB. Warm requests are fast (~50ms). To eliminate this, hit `/api/health` post-deploy.
