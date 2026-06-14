# Channel Analytics

A focused web console for your YouTube channel: sign in with Google, pick a
channel, read your analytics (views, watch time, audience, top videos), and
export any of it to Excel.

Built with **Next.js 14 (App Router)**, **NextAuth (Google OAuth)**,
**YouTube Data + Analytics APIs**, **Tailwind CSS**, **Recharts**, and
**ExcelJS**. Designed to deploy on **Vercel**.

---

## 1. Prerequisites

- Node.js 18.18+ (or 20+)
- A Google account that owns at least one YouTube channel
- A Google Cloud project (free)

## 2. Google Cloud setup (required — the app can't run without this)

1. Go to <https://console.cloud.google.com> and create a project.
2. **Enable APIs** (APIs & Services → Library):
   - YouTube Data API v3
   - YouTube Analytics API
3. **OAuth consent screen** (APIs & Services → OAuth consent screen):
   - User type: **External**
   - Fill app name, support email, and (for production) privacy policy + terms URLs.
   - Add your domain under Authorized domains.
   - Add the scopes: `.../auth/yt-analytics.readonly` and `.../auth/youtube.readonly`.
   - While in **Testing**, add your own Google address under **Test users**
     (up to 100). This lets you sign in immediately; you'll click past an
     "unverified app" warning. To serve the public you must submit for
     **OAuth verification** (these are sensitive scopes).
4. **Credentials** → Create credentials → **OAuth client ID** → **Web application**:
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://YOUR-DOMAIN/api/auth/callback/google` (after deploying)
   - Copy the **Client ID** and **Client secret**.

## 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — from step 2.4
- `NEXTAUTH_SECRET` — generate one: `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev

## 4. Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. You'll be sent to **/login** → Sign in with
Google → **/channels** (skipped if you have only one channel) → **dashboard**.

Useful scripts:

- `npm run build` — production build
- `npm run typecheck` — TypeScript check
- `npm run lint` — ESLint

## 5. Deploy to Vercel

1. Push this folder to a Git repo and import it in Vercel (framework auto-detected as Next.js).
2. In **Project → Settings → Environment Variables**, add `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`
   (`https://your-app.vercel.app`).
3. Add the production callback URL to your Google OAuth client:
   `https://your-app.vercel.app/api/auth/callback/google`.
4. Enable **Fluid Compute** (Settings → Functions) so export routes can run up
   to 60s on Hobby / longer on Pro. `vercel.json` sets per-route `maxDuration`.
5. Deploy.

> Preview deployments get unique URLs that won't match a registered callback.
> Test OAuth on **production** + **localhost**, or register a stable preview alias.

## 6. How the exports work

- **Export selected** (`POST /api/export`, synchronous): the videos you check
  in the Top Videos table, returned as `.xlsx` immediately.
- **Export all uploads** (`POST /api/export/start` → poll
  `GET /api/export/status`): builds the workbook for every upload in the
  background and downloads when ready.

The "all uploads" job currently uses an **in-memory store** (`lib/jobStore.ts`),
which is fine for local dev. On Vercel, serverless instances don't share memory
— for production, persist job state in Vercel KV / Upstash Redis and store the
file in Vercel Blob, then return the Blob URL. The handlers are structured so
this is a localized change (see the notes in `lib/jobStore.ts` and
`app/api/export/start/route.ts`).

## 7. Project structure

```
app/
  login/                      Sign in with Google
  channels/                   Channel picker (auto-skips if one channel)
  dashboard/[channelId]/      Main analytics view
  api/
    auth/[...nextauth]/       NextAuth (token refresh, JWT session)
    channels/                 channels.list proxy
    analytics/                reports.query proxy
    videos/                   uploads list
    export/                   sync export (Mode A)
    export/start, /status     async export (Mode B)
lib/
  auth.ts        NextAuth options, scopes, refresh
  session.ts     read access token in route handlers
  youtube.ts     Data + Analytics API wrappers
  excel.ts       ExcelJS workbook builders
  jobStore.ts    async job store (dev)
components/       UI primitives + dashboard widgets
middleware.ts     protects /dashboard and /channels
vercel.json       per-route function durations
```

## Notes

- We never collect your Google password — sign-in happens on Google's screen
  via OAuth, and the access token stays server-side (never sent to the browser).
- Analytics data lags ~2–3 days; the dashboard ends ranges 3 days back.
- Not affiliated with YouTube or Google.
