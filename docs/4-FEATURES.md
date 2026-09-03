# ✅ Features

> Only things that **actually work right now**. Nothing aspirational.

---

## 👨‍🎓 Student side

- [x] 🔐 **Log in with Google** — built, needs your Google keys to switch on
- [x] 📧 **Log in with email + password** — works today
- [x] 📝 **Report a problem** — 4 taps, under a minute
- [x] 🏷️ **Pick a category** — 10 options with emoji
- [x] 📍 **Pick a location** — real campus places, not typing
- [x] 📸 **Add a photo** — opens the camera on a phone, optional
- [x] ⚠️ **Mark it urgent** — one toggle
- [x] 🔖 **Get a reference code** — like `#K2HDF6`
- [x] 📋 **My reports** — everything you filed
- [x] 🚦 **Track status** — Reported → Assigned → In Progress → Fixed
- [x] 🕐 **See the full history** — every change, who made it, when
- [x] 💬 **Comment** on your own report
- [x] 👍 **Back** someone else's report
- [x] 🗺️ **Campus map** — see what's broken where
- [x] 🏠 **Dashboard** — your counts + recent reports

## 🛠️ Admin side

- [x] 📊 **Dashboard with stats** — counts, fix rate, average time to fix
- [x] 📈 **14-day activity chart**
- [x] 🗂️ **Every report** from every student
- [x] 🔍 **Search** — title, description, location, code
- [x] 🎚️ **Filter** — by status, category **and location**
- [x] ↕️ **Sort** — newest, oldest, most backed, priority
- [x] 🚦 **Change status** — with a note the student sees
- [x] ⚠️ **Set priority**
- [x] 📸 **View photos**
- [x] 🏷️ **Manage categories**
- [x] 📍 **Manage campus locations**
- [x] 👥 **Manage roles** — make someone admin, or not
- [x] 🗑️ **Delete any report**

## 📱 Everywhere

- [x] Mobile-first with a bottom tab bar
- [x] 🌗 Light + dark theme
- [x] ⚡ Code splitting — you download only the page you open
- [x] ♿ Keyboard + screen-reader friendly
- [x] 🐢 Respects "reduce motion"

---

## ⏳ Not built yet

- [ ] 🔔 Push / email notifications
- [ ] 🏫 More than one college in one install
- [ ] 📤 Export to CSV
- [ ] 🌍 Languages other than English

---

## 🧪 Proof it works

**105 automated tests**, all passing — covering login, roles, validation, search, the status flow, votes, comments, stats, locations and deletion.

```bash
npm test
```
