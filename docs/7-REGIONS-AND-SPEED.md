# 🌏 Where the app runs (and how to move it)

## ⚡ The one rule

> **The database and the API must sit in the same region.**

One page load fires ~6 database queries. If the API is in India and the
database in America, you pay the ocean crossing **six times**.

---

## 📍 Where it runs today

| Piece | Region | Why |
|---|---|---|
| 🗄️ Database (Neon) | Singapore `ap-southeast-1` | Closest Neon has to India |
| ⚙️ API (Vercel) | Singapore `sin1` | Same building as the database |
| 🌐 Website files | Everywhere (CDN) | Already served from India |

---

## 📊 What we measured

| Setup | Round trip |
|---|---|
| 🇺🇸 Ohio | **299 ms** |
| 🇸🇬 Singapore | **56 ms** ✅ |

**5.3× faster.** Measured, not guessed.

---

## 🇮🇳 Why not Mumbai?

**Neon has no Mumbai region.** Its 11 regions are US, Europe, Singapore,
Sydney and São Paulo. Singapore is the closest one to India.

Mumbai would save roughly another **45 ms** — real, but small next to the
243 ms we already won by leaving Ohio.

---

## 🔧 Moving to Mumbai later — 2 steps

The server speaks **plain Postgres** through `DATABASE_URL`. There is no Neon
SDK and no vendor-specific code. So switching providers changes **no code**.

### 1️⃣ Get a Mumbai Postgres

Any provider with `ap-south-1` works — Supabase, Aiven, RDS, DigitalOcean.

```
Create the database  →  copy its connection string
```

### 2️⃣ Point the app at it

```bash
# Locally
server/.env  →  DATABASE_URL=postgresql://...

# Then create the tables and demo data
npm run migrate --prefix server
npm run seed    --prefix server
```

```jsonc
// vercel.json — move the API to Mumbai too
"regions": ["bom1"]
```

Finally set `DATABASE_URL` in **Vercel → Settings → Environment Variables**
and redeploy.

> ⚠️ Vercel env vars only apply to **new** deployments. Changing one does
> nothing until you redeploy.

---

## ✅ Sanity check after any move

```bash
npm test --prefix server
```

**105 tests.** They run against whatever `DATABASE_URL` points at, so a green
run proves the new database is wired up correctly.

---

## 🧠 Remember this

| | |
|---|---|
| 🔗 | Database and API **together**, always |
| 🚫 | No vendor lock-in — it's just `DATABASE_URL` |
| 📏 | Ohio → Singapore was the big win (243 ms) |
| 🇮🇳 | Mumbai is a nice-to-have (45 ms), not a rebuild |
