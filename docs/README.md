# 📚 Campus Fix — Docs

Short docs. Read in any order.

| # | Doc | What's in it |
|---|---|---|
| 1 | [📖 Overview](1-OVERVIEW.md) | What Campus Fix is and who it's for |
| 2 | [🧱 Tech Stack](2-TECH-STACK.md) | What we used and why |
| 3 | [🏗️ Architecture](3-ARCHITECTURE.md) | How a report travels through the system |
| 4 | [✅ Features](4-FEATURES.md) | Checklist of what actually works |
| 5 | [📦 Libraries](5-LIBRARIES.md) | Every package and what it does |
| 6 | [🔐 Google Login Setup](6-GOOGLE-LOGIN-SETUP.md) | 5-minute setup guide |
| 7 | [🌏 Regions & Speed](7-REGIONS-AND-SPEED.md) | Where it runs, how to move it to Mumbai |
| 8 | [🎨 The Design Plan](8-DESIGN-PLAN.md) | Why it looks the way it does |
| 9 | [📧 Email Setup](9-EMAIL-SETUP.md) | Status-change notifications |

---

## ⚡ Run it right now

```bash
npm run install:all
```

```bash
npm run seed
```

```bash
npm run dev
```

Open **http://localhost:5173**

**Demo logins**

| Role | Email | Password |
|---|---|---|
| 👨‍🎓 Student | `student.a@campus.edu` | 🎲 printed by `npm run seed` |
| 🛠️ Admin | `admin@campusfix.app` | 🎲 printed by `npm run seed` |

> 🔐 Passwords are **random every seed** and shown once — this repo never
> contains a working login. Make your own account admin instead:
> `npm run promote -- you@college.edu`

> Needs a `DATABASE_URL` — a free Postgres from neon.tech takes a minute.
> There is no local fallback: one database engine, everywhere.
