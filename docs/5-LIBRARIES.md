# 📦 Libraries

> Every package actually installed, with the version that is actually running.
> Nothing invented.

**19 packages chosen by hand:** 3 frontend, 13 backend, 3 build tools.

Those 19 pull in everything they need, which lands at **165 folders** on disk —
but only the 3 frontend ones ever reach a student's phone.

---

## 🖥️ Frontend — 3 packages

| Library | Version | What it does |
|---|---|---|
| **react** | 18.3.1 | Builds the interface |
| **react-dom** | 18.3.1 | Puts React on the page |
| **react-router-dom** | 6.30.6 | Handles pages and URLs |

**That's it.** No UI kit. No CSS framework. No chart library. No icon package.

### 🔨 Build tools (not shipped to the user)

| Tool | Version | What it does |
|---|---|---|
| **vite** | 6.4.3 | Dev server + production bundler |
| **@vitejs/plugin-react** | 4.7.0 | Teaches Vite about JSX |
| **concurrently** | 9.1.2 | Runs client + server with one command |

---

## ⚙️ Backend — 13 packages

### 🗄️ Database

| Library | Version | What it does |
|---|---|---|
| **pg** | 8.23.0 | Talks to Postgres in production |
| **@electric-sql/pglite** | 0.5.8 | Postgres-in-WebAssembly, so local dev needs **no database install** |

### 🔐 Security

| Library | Version | What it does |
|---|---|---|
| **jsonwebtoken** | 9.0.3 | Makes and checks login tokens |
| **bcryptjs** | 2.4.3 | Scrambles passwords so they can't be read back |
| **zod** | 3.25.76 | Rejects bad data before it reaches the database |
| **helmet** | 8.3.0 | Sets protective HTTP headers |
| **cors** | 2.8.6 | Controls which sites may call the API |
| **express-rate-limit** | 7.5.1 | Blocks brute-force login attempts |

### 🧰 Plumbing

| Library | Version | What it does |
|---|---|---|
| **express** | 4.22.2 | The web server itself |
| **multer** | 2.3.0 | Receives photo uploads |
| **@vercel/blob** | 0.27.3 | Stores those photos in the cloud |
| **morgan** | 1.12.0 | Logs requests |
| **dotenv** | 16.6.1 | Reads `.env` files |

---

## 🎨 Things we wrote instead of installing

| Thing | A library would cost | We wrote |
|---|---|---|
| 🗺️ Campus map | ~100 KB (Leaflet, Mapbox) | ~2 KB hand-drawn SVG |
| 🎨 Icons | ~40 KB icon font | Inline SVG, only the ~14 we use |
| 📊 Charts | ~90 KB (Chart.js, Recharts) | Divs with a `height` |
| 💅 Styling | ~30 KB + build step (Tailwind) | One CSS file with variables |
| 🔤 Fonts | ~120 KB (Google Fonts) | Your phone's built-in font |
| 🔔 Toasts | ~8 KB | ~30 lines of React |

**≈ 390 KB a student never downloads.**

---

## 📏 What a first visit actually costs

| File | Real size | Gzipped |
|---|---|---|
| JavaScript | 198.26 KB | **64.55 KB** |
| CSS | 24.59 KB | **5.99 KB** |
| HTML | 1.38 KB | **0.71 KB** |
| Fonts | — | **0 KB** |
| Images | — | **0 KB** |
| **Total** | | **≈ 71 KB** |

Every other page is **split out** and downloaded only when opened:

| Page | Gzipped |
|---|---|
| Report card | 0.59 KB |
| My reports | 1.23 KB |
| Campus map | 1.19 KB |
| Student dashboard | 1.18 KB |
| Admin settings | 2.00 KB |
| Submit report | 2.66 KB |
| Admin dashboard | 2.78 KB |
| Report detail | 3.18 KB |

> 📱 On a 3G connection, ~71 KB is **under a second**.

---

## 🧠 Remember this

| | |
|---|---|
| 3️⃣ | Three frontend libraries. That's all. |
| 1️⃣3️⃣ | Thirteen backend ones, each doing one job |
| 7️⃣1️⃣ | ~71 KB first load — no fonts, no images |
| ✍️ | Map, icons, charts, toasts — hand-written |
