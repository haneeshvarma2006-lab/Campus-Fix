# 🧱 Tech Stack

> **The whole thing in one line:** React talks to Express, Express talks to Postgres.

---

## 🗂️ The short version

| Layer | What we use | What it actually does |
|---|---|---|
| 🖥️ **Frontend** | **React + Vite** | Everything the student sees and taps |
| ⚙️ **Backend** | **Express** (Node.js) | The rules. Who can do what. |
| 💾 **Database** | **Postgres** (on Neon) | Remembers users, reports, photos, history |
| 🔐 **Login** | **Google OAuth** + email/password | Proves you are who you say |
| 🎨 **Styling** | **Plain CSS** | No Tailwind, no UI kit. One stylesheet. |
| 🚀 **Deployment** | **Vercel** | Puts it on the internet |
| 🖼️ **Photos** | **Vercel Blob** | Stores uploaded images |

---

## 🤔 Why these?

**React + Vite** 🖥️
Vite builds in under a second and splits the code automatically, so a student's phone only downloads the page they opened.

**Express** ⚙️
Small, boring, does one job. All the security lives here — never in the browser.

**Postgres** 💾
Real relational database. Delete a report and its comments, votes and history go with it automatically.

**Neon** ☁️
Postgres that's free to start and works with serverless. No database to install.

**Plain CSS** 🎨
No framework to download or learn. One file, all the colours as variables, light + dark for free.

---

## 🧪 The clever bit: local development needs no database

```
No DATABASE_URL?  →  runs PGlite (Postgres compiled to WebAssembly)
DATABASE_URL set? →  connects to real Postgres on Neon
```

**Same Postgres engine either way.** Clone the repo, `npm run dev`, it just works.

---

## 🚫 What we deliberately did NOT use

| Not used | Why |
|---|---|
| ❌ Three.js / WebGL | Melts phone GPUs |
| ❌ Tailwind | Extra build step, extra learning |
| ❌ Google Fonts | Extra downloads, text flashes on load |
| ❌ A map library | 2 KB of hand-drawn SVG does the job |
| ❌ Redux | React state is plenty for this |
