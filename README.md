# CampusFix

Students report sanitation and maintenance issues on campus; admins work them
through a four-stage pipeline; everyone can see exactly where a report stands.

A **web app** — not an APK. No Firebase project, no cloud account, no API keys to
get it running locally: clone, install, seed, run.

**Stack:** React 18 + Vite · Express · Postgres · JWT auth · Google Sign-In ·
deploys to Vercel.

---

## Quick start

```bash
npm run install:all
```

```bash
npm run seed
```

```bash
npm run dev
```

Open **http://localhost:5173**.

You need a Postgres connection string first. A free one takes a minute at
[neon.tech](https://neon.tech) — copy its **Connection string (URI)** into
`server/.env` as `DATABASE_URL`, then `npm run migrate` and `npm run seed`.

There is deliberately no embedded fallback. One database engine, one code path,
and what you run locally is what runs live.

### Demo accounts

Seeding creates 14 reports across every stage, 8 categories, and 5 users.
The login page has one-click buttons for these.

| Role | Email | Password | Sees |
| --- | --- | --- | --- |
| Admin | `admin@campusfix.app` | `admin1234` | Every report, all controls |
| Student | `student.a@campus.edu` | `demo1234` | Only their own reports |

Reset at any time with `npm run seed -- --force`.

---

## What's in it

### Student side

| | |
| --- | --- |
| **Login / Sign up** | Email + password, or Google once configured |
| **Dashboard** | Their counts per stage, what's still open, what they filed recently, and what they report most |
| **Report an issue** | Photo, category, location, priority, description — in three clear steps |
| **Photo upload** | Drag-and-drop, or the phone camera straight from the form. 8 MB cap, images only |
| **Location** | Free text plus one-tap GPS, which also stores map coordinates |
| **Track status** | A visual tracker: Reported → Assigned → In Progress → Fixed |
| **My reports** | Filter by any stage, paginated, deep-linkable |
| **Discussion** | Comment thread with the admin, on each report |
| **Backing** | Upvote reports so the ones affecting most people rise |

### Admin side

| | |
| --- | --- |
| **Dashboard** | Counts per stage, fix rate, average time to fix, oldest report still open, size of the active queue |
| **All reported issues** | Every report from every student, in one queue |
| **Filters** | Status, category, **location**, plus full-text search over title, description, location and reference code |
| **Sorting** | Newest, oldest, most urgent, most backed |
| **Change status** | Move through the pipeline with an attributed note. Rejecting requires a reason |
| **View photos** | Full-size on the report, thumbnails in the queue |
| **Analytics** | 14-day filing trend, breakdown by category and by location — every bar is also a filter |
| **Settings** | Manage categories and who holds which role |

---

## The status pipeline

```
Reported  →  Assigned  →  In Progress  →  Fixed
                                     ↘
                                      Rejected
```

Four stages plus **Rejected**, a side exit for invalid or duplicate reports.
Rejecting requires a written reason, so a closed report always explains itself.

Every transition is written to an append-only event log with who made it, when,
and any note — that's what the History section on each report renders. Statuses
are enforced by a `CHECK` constraint in the database, not only in app code.

---

## Roles

Two roles: **student** and **admin**.

New signups are always students. Admin is granted by an existing admin under
**Settings → People** — never selectable at signup, so registering gets nobody
near the dashboard.

The one exception: on a brand-new database, **the first account to register
becomes the admin**, because otherwise nobody could ever get in. Nothing is
hardcoded — hand admin to anyone and remove yourself whenever you like.

Two guards stop lockouts: you cannot demote yourself, and the last remaining
admin cannot be demoted at all.

| | Student | Admin |
| --- | :---: | :---: |
| File reports, comment, back | ✓ | ✓ |
| See own reports | ✓ | ✓ |
| See **all** reports, search and filter | | ✓ |
| Change status and priority | | ✓ |
| Manage categories and roles | | ✓ |
| Delete any report | own only | ✓ |

Scoping is enforced server-side on every request. A student who asks for
`scope=all` still gets only their own reports back.

---

## Google Sign-In

Fully implemented and dormant until you add credentials — the button doesn't
render at all until the server reports Google is configured, and email/password
keeps working regardless.

**Setting it up** (about five minutes):

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) → create a
   project (or pick an existing one).
2. **APIs & Services → OAuth consent screen.** Choose **External**, fill in an
   app name, your support email, and a developer contact. Save.
   While it's in *Testing*, add your own Google account under **Test users**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID.**
   Application type: **Web application**.
4. Under **Authorised JavaScript origins**, add:
   - `http://localhost:5173` (local dev)
   - `https://your-app.vercel.app` (production)
5. Under **Authorised redirect URIs**, add — these must match exactly:
   - `http://localhost:4000/api/auth/google/callback`
   - `https://your-app.vercel.app/api/auth/google/callback`
6. Create. Copy the **Client ID** and **Client secret** into `server/.env`:

   ```
   GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=...
   APP_ORIGIN=http://localhost:5173
   ```

7. Restart the server. The button appears on login and signup by itself.

On Vercel, set the same three as environment variables, with `APP_ORIGIN` and
the redirect URI pointing at your deployed domain.

**How the flow works:** the browser is sent to Google, comes back to
`/api/auth/google/callback`, and the server exchanges the code using the client
secret (which never reaches the browser). The session token is handed back in
the URL *fragment*, so it never lands in a server log or browser history, and
the SPA strips it from the address bar as soon as it's read. CSRF state is a
signed, expiring value rather than a session lookup, so it works on serverless
where the two requests may hit different instances.

If someone signs in with Google using an email that already has a password
account, the two are linked rather than duplicated.

---

## Deploying to Vercel

Vercel is serverless with a disposable filesystem, so it needs a hosted database
and hosted file storage. Both have free tiers.

**1. Database.** Create a free Postgres at [Neon](https://neon.tech) (or use
Vercel's own Postgres integration). Copy the **pooled** connection string.

**2. Push this repo to GitHub**, then in Vercel: **Add New → Project** and import
it. Leave the build settings alone — `vercel.json` already declares them.

**3. Environment variables** (Project → Settings → Environment Variables):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Your Neon pooled connection string |
| `JWT_SECRET` | A long random string — `openssl rand -hex 48` |
| `APP_ORIGIN` | `https://your-app.vercel.app` |
| `NODE_ENV` | `production` |

**4. File storage.** Project → **Storage → Create → Blob**. Connecting it injects
`BLOB_READ_WRITE_TOKEN` automatically. Without it the app hides the photo step
and reports save normally — everything else works.

**5. Deploy.** The schema migrates itself on first boot. Register the first
account — it becomes the admin.

Optionally seed the demo data against your hosted database:

```bash
DATABASE_URL="your-neon-url" npm run seed
```

---

## Testing

96 end-to-end tests covering auth, role boundaries, validation, the status
pipeline, search, filters, votes, comments, statistics, admin actions and
deletion. They run against a live server, so they exercise real HTTP and real
SQL rather than mocks.

```bash
npm run seed -- --force
npm start
```

```bash
npm test
```

---

## Project layout

```
campusfix-web/
├── api/index.js            Vercel serverless entry — wraps the Express app
├── vercel.json             Build, routing and caching config
├── server/
│   └── src/
│       ├── app.js          Express app (no listener, so it runs both ways)
│       ├── index.js        Local dev server
│       ├── db.js           Postgres over node-postgres
│       ├── schema.js       Idempotent migrations
│       ├── domain.js       Statuses, roles, priorities — defined once
│       ├── auth.js         Hashing, JWT, role middleware
│       ├── google.js       Google OAuth 2.0 flow
│       ├── storage.js      Vercel Blob
│       ├── validate.js     zod schema per request body
│       ├── seed.js         Demo data
│       ├── routes/         auth · reports · categories · users · stats
│       └── ../test/        End-to-end API suite
└── client/
    └── src/
        ├── pages/          Landing · Login · Signup · AuthCallback ·
        │                   StudentDashboard · SubmitReport · MyReports ·
        │                   ReportDetail · AdminDashboard · AdminSettings
        ├── components/     Navbar · ReportCard · StatusTracker · guards · UI kit
        ├── contexts/       Auth · theme
        ├── lib/            API client · formatting
        └── styles/         Design system
```

---

## API

Everything under `/api`. All endpoints except signup, login and `/providers`
require `Authorization: Bearer <token>`.

| Method | Endpoint | Who | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/signup` | anyone | Create an account |
| POST | `/auth/login` | anyone | Log in |
| GET | `/auth/me` | any user | Confirm the session |
| GET | `/auth/providers` | anyone | Whether Google is configured |
| GET | `/auth/google` | anyone | Start the Google flow |
| GET | `/auth/google/callback` | anyone | Finish it |
| GET | `/reports` | any user | List — `scope`, `status`, `category`, `location`, `q`, `sort`, `page`, `limit` |
| POST | `/reports` | any user | File a report (multipart, optional `photo`) |
| GET | `/reports/:id` | owner or admin | One report with timeline and comments |
| PATCH | `/reports/:id/status` | admin | Move a stage, with a note |
| PATCH | `/reports/:id/priority` | admin | Change priority |
| DELETE | `/reports/:id` | owner or admin | Delete, and its photo |
| POST | `/reports/:id/vote` | any user | Toggle backing |
| POST | `/reports/:id/comments` | owner or admin | Add a comment |
| GET | `/categories` | any user | Categories with report counts |
| GET | `/categories/locations` | any user | Distinct locations, for the filter |
| POST / DELETE | `/categories`, `/categories/:id` | admin | Add or remove |
| GET | `/users` | admin | Users with report counts |
| PATCH | `/users/:id/role` | admin | Change a role |
| GET | `/stats` | any user | Dashboard figures, scoped by role |
| GET | `/health` | anyone | Liveness, plus which database and storage are in use |

`status=active` is a shorthand for everything not yet fixed or rejected.

---

## Configuration

Everything has a working default. Copy `server/.env.example` to `server/.env`
only to override.

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | API port |
| `JWT_SECRET` | generated | **Required in production** — the server refuses to start without it |
| `DATABASE_URL` | *(none)* | **Required.** Postgres connection string — there is no local fallback |
| `BLOB_READ_WRITE_TOKEN` | *(unset)* | Photo uploads stay hidden until set |
| `RESEND_API_KEY` / `MAIL_FROM` | *(unset)* | Status-change emails stay off until both are set |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | *(unset)* | Google sign-in stays hidden until both are set |
| `APP_ORIGIN` | request origin | Where to return after Google sign-in |
| `CORS_ORIGIN` | reflects request | Pin to your domain in production |

---

## Security

- Passwords hashed with bcrypt (cost 10); never stored or logged in plain text.
- JWTs expire in 7 days and are re-checked against the database on every
  request, so a deleted account or a changed role takes effect immediately.
- Every request body is validated with zod before reaching a handler; all SQL
  uses bound parameters.
- Login and signup are rate-limited to 30 attempts per 15 minutes per IP, the
  rest of the API to 300/minute. Login returns the same message for a wrong
  password and an unknown email, so it can't be used to discover who's
  registered.
- Search escapes `%` and `_` so a search term can't act as a wildcard.
- Uploads are capped at 8 MB, restricted to image MIME types, held in memory
  until the request validates, and stored under generated filenames.
- `helmet` sets the standard security headers.
