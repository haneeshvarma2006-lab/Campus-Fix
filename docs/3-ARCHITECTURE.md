# 🏗️ Architecture

> **One sentence:** The browser asks, the server checks, the database answers.

---

## 🔄 The whole flow

```
   👨‍🎓  Student taps "Report"
        ↓
   🖥️  Frontend (React)
        ↓   sends JSON + photo
   📡  API  /api/reports
        ↓
   🔐  Is the token valid?          ← blocked if not
        ↓
   ✅  Is the data valid?           ← blocked if not
        ↓
   ⚙️  Backend (Express)
        ↓
   💾  Database (Postgres)
        ↓
   🔄  Sends the report back
        ↓
   ✅  Student sees "#K2HDF6 — Reported"
```

---

## 📁 Where things live

```
campusfix-web/
├── 🖥️  client/          the website
│   └── src/
│       ├── pages/       one file per screen
│       ├── components/  reusable bits (map, cards, buttons)
│       ├── contexts/    login state + theme
│       └── styles/      one CSS file
│
├── ⚙️  server/          the API
│   └── src/
│       ├── routes/      one file per topic
│       ├── auth.js      passwords + tokens
│       ├── google.js    Google sign-in
│       ├── db.js        database connection
│       ├── schema.js    the tables
│       └── validate.js  input checking
│
├── 🚀  api/index.js     the Vercel entry point
└── 📚  docs/            you are here
```

---

## 💾 The tables

```
users       👤  name, email, role, password/google
    ↓ owns
reports     📝  title, category, location, status, photo
    ↓ has
├── report_events  🕐  every status change, who + when
├── comments       💬
└── votes          👍

categories  🏷️  what you can report
locations   📍  places on campus (+ x/y for the map)
```

**Delete a report → its events, comments and votes vanish too.** The database enforces that, not the code.

---

## 🔐 The security rule

> **Never trust the browser.**

Every request is re-checked on the server:

- 🎫 Is the token real?
- 👤 Is this user still allowed?
- 🚪 Is this *their* report?

Hiding a button is **not** security. The server checks anyway.
