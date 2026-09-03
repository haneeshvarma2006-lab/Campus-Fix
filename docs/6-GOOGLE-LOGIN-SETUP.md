# 🔐 Turning on Google Login

> **Status:** fully built. It just needs two keys only you can create.
> Until you add them, the button hides itself and email login works fine.

**Time needed: about 5 minutes.**

---

## 1️⃣ Make a Google project

Go to **[console.cloud.google.com](https://console.cloud.google.com)**

- Click the project dropdown (top left) → **New Project**
- Name it `CampusFix` → **Create**

---

## 2️⃣ Set up the consent screen

Search for **"OAuth consent screen"** in the top search bar.

- User type → **External** → **Create**
- App name → `CampusFix`
- Support email → yours
- Developer email → yours
- **Save and Continue** through the next screens
- On **Test users**, add your own Gmail
  *(needed while the app is unpublished)*

---

## 3️⃣ Create the credentials

Search for **"Credentials"** → **+ Create Credentials** → **OAuth client ID**

- Application type → **Web application**
- Name → `CampusFix Web`

**Authorised JavaScript origins** — add both:
```
http://localhost:5173
https://YOUR-APP.vercel.app
```

**Authorised redirect URIs** — add both:
```
http://localhost:4000/api/auth/google/callback
https://YOUR-APP.vercel.app/api/auth/google/callback
```

⚠️ These must match **exactly** — no trailing slash. This is what trips people up.

Click **Create**. Google shows you a **Client ID** and a **Client secret**.

---

## 4️⃣ Paste them in

### 💻 For local development

Open `server/.env` and add:

```
GOOGLE_CLIENT_ID=paste-the-client-id
GOOGLE_CLIENT_SECRET=paste-the-secret
APP_ORIGIN=http://localhost:5173
```

Restart the server. The Google button appears.

### ☁️ For the live site

Vercel → your project → **Settings** → **Environment Variables**

| Name | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | your client ID |
| `GOOGLE_CLIENT_SECRET` | your secret |
| `APP_ORIGIN` | `https://YOUR-APP.vercel.app` |

Then **redeploy** — variables only apply to new deployments.

---

## ✅ Check it worked

Open `/api/auth/providers`:

```json
{ "google": true }
```

`true` → button is live. `false` → keys missing or misspelled.

---

## 🛡️ How it's kept safe

- 🔒 The **secret never touches the browser** — the token swap happens server-side
- 🎫 The login token comes back in the URL **fragment**, so it never lands in a server log
- 🔗 Signing in with Google using an email that already has a password account **links them** instead of making a duplicate
- ✉️ Google accounts with **unverified** emails are refused
- ⏱️ The sign-in link **expires after 10 minutes** and is signed, so it can't be forged

---

## 🆘 If it breaks

| Error | Fix |
|---|---|
| `redirect_uri_mismatch` | The redirect URI doesn't match **exactly**. Check for a trailing `/`. |
| `Access blocked` | Add your Gmail under **Test users**. |
| Button doesn't appear | `/api/auth/providers` says `false` — check the names are spelled right. |
| Works local, fails live | You forgot to **redeploy** after adding the variables. |
