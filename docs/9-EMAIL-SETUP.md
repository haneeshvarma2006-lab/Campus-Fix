# 📧 Email Setup

> Students get an email when their report moves. Optional — the app runs fine without it.

---

## 🎯 What it sends

**One email, when an admin changes a report's status.**

| Status | Subject line |
|---|---|
| 🔵 Assigned | Someone has picked up your report |
| 🟣 In progress | Work has started on your report |
| 🟢 Fixed | Your report has been fixed |
| ⚪ Rejected | Your report was closed without a fix |

Each one carries the **reference code**, the title, the place — and the
**note the admin wrote**, which is usually the part that actually answers
the student's question.

---

## ⚙️ Setup — 3 steps

### 1️⃣ Get a Resend key

Go to **resend.com** → sign up → **API Keys** → **Create**.

> Free tier: **3,000 emails a month**. Plenty for a college.

### 2️⃣ Pick a from-address

| Situation | Use |
|---|---|
| 🧪 Just testing | `onboarding@resend.dev` — works instantly, no setup |
| 🎓 Real deployment | `campusfix@yourcollege.edu` — needs the domain verified in Resend |

### 3️⃣ Set three variables

```bash
RESEND_API_KEY=re_xxxxxxxxxxxx
MAIL_FROM=CampusFix <onboarding@resend.dev>
APP_URL=https://campus-fix-theta.vercel.app
```

Locally those go in `server/.env`.
On Vercel: **Settings → Environment Variables**, then **redeploy**.

> ⚠️ Vercel only applies variables to **new** deployments. Saving one changes nothing until you redeploy.

---

## ✅ Check it worked

```bash
curl https://your-app.vercel.app/api/health
```

| You see | Meaning |
|---|---|
| `"email": "Resend"` | ✅ Working |
| `"email": "not configured"` | ❌ Key or from-address missing |

`APP_URL` is optional — without it the email just omits the link.

---

## 🛡️ Why it can't break the app

Three deliberate choices:

| Choice | Reason |
|---|---|
| 📮 **HTTP API, not SMTP** | A serverless function has milliseconds to spare. Opening an SMTP connection wastes them. |
| 🚫 **Never throws** | `sendMail` catches everything and logs. A failed email never fails the status change that triggered it. |
| ⏱️ **8-second timeout** | A hanging mail server cannot hang the request. |

**Zero new packages.** It is one `fetch` call.

---

## 🧠 Remember this

| | |
|---|---|
| 📧 | Emails fire on **status change**, to the reporter |
| 🔑 | Needs `RESEND_API_KEY` + `MAIL_FROM` |
| 🆓 | 3,000/month free |
| 🩺 | `/api/health` tells you if it's on |
| 😌 | Not configured = app works exactly as before |
