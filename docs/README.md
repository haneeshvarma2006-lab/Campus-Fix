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
| 👨‍🎓 Student | `student.a@campus.edu` | `demo1234` |
| 🛠️ Admin | `admin@campusfix.app` | `admin1234` |

> No database to install — local dev runs Postgres inside Node.
