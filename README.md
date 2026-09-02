# CampusFix

Report and track sanitation and maintenance issues — for a campus, a neighbourhood, or any
facility. People log in, file a report with a photo and a location, and follow its status.
Staff see everything in one queue, move reports through the workflow, and leave notes the
reporter can read.

This is a **web app** with a real backend. No Firebase project, no cloud account, no API keys
— clone it, install, seed, run.

**Stack:** React 18 + Vite (frontend) · Express + SQLite (backend) · JWT auth · bcrypt ·
local file uploads.

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

Then open **http://localhost:5173**.

`npm run dev` runs both processes: the API on port 4000 and Vite on 5173. Vite proxies
`/api` and `/uploads` through to the API, so the browser only ever talks to one origin.

### Demo accounts

Seeding creates twelve reports across every status, eight categories, and five users:

| Role    | Email                 | Password    | Sees                                        |
| ------- | --------------------- | ----------- | ------------------------------------------- |
| Admin   | `admin@campusfix.app` | `admin1234` | Everything, plus categories and user roles  |
| Staff   | `staff@campusfix.app` | `staff1234` | Every report; can set status and priority   |
| Citizen | `rahul@example.com`   | `demo1234`  | Only their own reports                      |

The login page has one-click buttons to fill each of these in.

To wipe and reseed: `npm run seed -- --force`.

---

## Production build

One process serves both the API and the built frontend on port 4000:

```bash
npm run build && npm start
```

Open **http://localhost:4000**. The server serves `client/dist` when it exists and falls
back to `index.html` for client-side routes, so deep links like `/admin/settings` work on a
hard refresh.

---

## How roles work

New signups are always **citizens**. Staff and admin access is granted by an existing admin
from **Settings → People** — it is never selectable at signup, so registering does not get
anyone near the dashboard.

The one exception: on a brand-new database, **the first account to register becomes the
admin**. Otherwise a fresh install would have no way in.

Two guards protect against locking yourself out: you cannot demote yourself, and the last
remaining admin cannot be demoted at all.

| | Citizen | Staff | Admin |
| --- | :---: | :---: | :---: |
| File reports, comment, upvote | ✓ | ✓ | ✓ |
| See own reports | ✓ | ✓ | ✓ |
| See **all** reports, search and filter | | ✓ | ✓ |
| Change status and priority | | ✓ | ✓ |
| Manage categories | | | ✓ |
| Change user roles | | | ✓ |
| Delete any report | own only | own only | ✓ |

---

## What is in it

**Reporting** — title, description, category, priority, free-text location, optional GPS
coordinates from the browser, and an optional photo (drag-and-drop or the phone camera).
Every report gets a short quotable reference like `#7QK2FD`.

**Tracking** — an append-only timeline on each report showing every status and priority
change, who made it, when, and any note they left. Comments run alongside it, between the
reporter and the team.

**Dashboard** — counts per status, resolution rate, average time to resolve, a 14-day
trend, a category breakdown, plus search across title, description, location and reference
code, with status/category filters, sorting, and pagination.

**Support votes** — anyone can upvote a report, and staff can sort by most supported to see
what the most people are hitting.

**Design** — light and dark themes (follows the system by default, toggle in the header,
choice remembered), responsive down to phone width, skeleton loading states, and toasts.

---

## Project layout

```
campusfix-web/
├── server/
│   ├── src/
│   │   ├── index.js        Express app, middleware, static serving
│   │   ├── db.js           SQLite connection + schema
│   │   ├── auth.js         hashing, JWT, role middleware
│   │   ├── validate.js     zod schemas for every request body
│   │   ├── upload.js       multer photo handling
│   │   ├── seed.js         demo data
│   │   └── routes/         auth, reports, categories, users, stats
│   ├── data/               SQLite file + generated JWT secret (gitignored)
│   └── uploads/            report photos (gitignored)
└── client/
    └── src/
        ├── pages/          Landing, Login, Signup, Submit, MyReports,
        │                   ReportDetail, AdminDashboard, AdminSettings
        ├── components/     Navbar, ReportCard, route guards, UI kit
        ├── contexts/       auth + theme
        ├── lib/            API client, formatting
        └── styles/         design system
```

---

## API

All endpoints are under `/api`. Everything except signup and login needs
`Authorization: Bearer <token>`.

| Method | Endpoint | Who | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/signup` | anyone | Create an account, returns a token |
| POST | `/auth/login` | anyone | Log in, returns a token |
| GET | `/auth/me` | any user | Confirm the current session |
| GET | `/reports` | any user | List reports — `scope`, `status`, `category`, `q`, `sort`, `page`, `limit` |
| POST | `/reports` | any user | File a report (multipart, optional `photo`) |
| GET | `/reports/:id` | owner or staff | One report with its timeline and comments |
| PATCH | `/reports/:id/status` | staff | Change status, optionally with a note |
| PATCH | `/reports/:id/priority` | staff | Change priority |
| DELETE | `/reports/:id` | owner or admin | Delete a report and its photo |
| POST | `/reports/:id/vote` | any user | Toggle a support vote |
| POST | `/reports/:id/comments` | owner or staff | Add a comment |
| GET | `/categories` | any user | Categories for the submit dropdown |
| POST / DELETE | `/categories`, `/categories/:id` | admin | Add or remove a category |
| GET | `/users` | admin | List users with report counts |
| PATCH | `/users/:id/role` | admin | Change someone's role |
| GET | `/stats` | any user | Dashboard figures, scoped by role |
| GET | `/health` | anyone | Liveness check |

`scope=all` is only honoured for staff and admins — a citizen always gets their own reports
back regardless of what they ask for, enforced server-side rather than in the UI.

---

## Data model

**users** — `name`, `email` (unique), `password_hash`, `role`, `created_at`

**reports** — `code`, `title`, `description`, `category`, `location`, `latitude`,
`longitude`, `photo_url`, `status`, `priority`, `reporter_id`, `created_at`, `updated_at`,
`resolved_at`

**report_events** — `report_id`, `actor_id`, `type`, `from_status`, `to_status`, `note`,
`created_at`

**comments** — `report_id`, `author_id`, `body`, `created_at`

**votes** — `report_id` + `user_id` as a composite key, so one vote per person per report

**categories** — `name` (unique)

Status is one of `open`, `in_progress`, `resolved`, `rejected`; priority is `low`, `normal`,
`high`, `urgent`. Both are enforced by `CHECK` constraints in the schema, not only in
application code. Deleting a report cascades to its events, comments and votes.

---

## Configuration

Everything has a working default; copy `server/.env.example` to `server/.env` only if you
need to change something.

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | API port |
| `JWT_SECRET` | generated | Written to `server/data/.jwt-secret` on first boot so tokens survive restarts. **Set this explicitly in production.** |
| `CORS_ORIGIN` | reflects the request | Pin this to your domain in production |
| `DATA_DIR` | `server/data` | Where the SQLite file lives |
| `UPLOAD_DIR` | `server/uploads` | Where photos are written |

---

## Security notes

- Passwords are hashed with bcrypt (cost 10) and never stored or logged in plain text.
- Auth is a signed JWT with a 7-day expiry, verified against the database on every request
  — a deleted user's token stops working immediately.
- Every request body is validated with zod before it reaches a route handler, and all SQL
  goes through prepared statements with bound parameters.
- Login and signup are rate-limited to 30 attempts per 15 minutes per IP; the rest of the
  API to 300 requests per minute. Login returns the same message whether the email or the
  password was wrong, so it cannot be used to discover which emails are registered.
- Uploads are capped at 8 MB, restricted to image MIME types, and stored under generated
  filenames rather than the name the browser supplied.
- `helmet` sets the standard security headers.

Before putting this on the public internet: set a real `JWT_SECRET`, pin `CORS_ORIGIN`,
and run it behind HTTPS.

---

## Deploying

The backend keeps state on disk (SQLite file + uploaded photos), so it needs a host with a
persistent volume — a small VPS, Fly.io with a volume, Railway, or Render with a disk.
Platforms with ephemeral filesystems will lose both on every deploy.

```bash
npm run install:all
npm run build
JWT_SECRET="<a long random string>" NODE_ENV=production npm start
```

Put nginx or Caddy in front for TLS. Back up `server/data/` and `server/uploads/` together
— the database references photos by filename.
