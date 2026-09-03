# 📦 Libraries

> Every package actually installed. Nothing invented.

---

## 🖥️ Frontend (3 packages)

| Library | What it does |
|---|---|
| **react** | Builds the interface |
| **react-dom** | Puts React on the page |
| **react-router-dom** | Handles pages and URLs |

**That's it.** No UI kit, no CSS framework, no chart library, no icon package.

**Build tools:** `vite` + `@vitejs/plugin-react`

---

## ⚙️ Backend

| Library | What it does |
|---|---|
| **express** | The web server |
| **pg** | Talks to Postgres in production |
| **@electric-sql/pglite** | Postgres-in-WASM, so local dev needs no database |
| **jsonwebtoken** | Makes and checks login tokens |
| **bcryptjs** | Scrambles passwords so they can't be read |
| **zod** | Checks incoming data is valid |
| **multer** | Handles photo uploads |
| **@vercel/blob** | Stores photos in the cloud |
| **helmet** | Sets security headers |
| **cors** | Controls who may call the API |
| **express-rate-limit** | Blocks brute-force login attempts |
| **morgan** | Logs requests |
| **dotenv** | Reads `.env` files |

---

## 🎨 Things we wrote instead of installing

| Thing | Why not a library |
|---|---|
| 🗺️ **Campus map** | Hand-drawn SVG — ~2 KB vs 100 KB+ for a map library |
| 🎨 **Icons** | Inline SVG — no icon font to download |
| 📊 **Charts** | Plain divs with a height — no chart library |
| 💅 **Styling** | One CSS file with variables — no Tailwind |
| 🔤 **Fonts** | Your phone's built-in font — zero download |
| 🔔 **Toasts** | ~30 lines of React |

**That's roughly 300 KB a student never downloads.**

---

## 📏 What a first visit actually costs

| File | Gzipped |
|---|---|
| JavaScript | **~63 KB** |
| CSS | **~6 KB** |
| Fonts | **0 KB** |
| Images | **0 KB** |
| **Total** | **~69 KB** |

Each extra page adds **1–3 KB**, downloaded only when you open it.
