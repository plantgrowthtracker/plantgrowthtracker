# PlantGrowthTracker

A bilingual (Hindi/English) plant care and growth-tracking web app, with real
per-user accounts backed by Supabase. Built with React + Vite, deployable to
Cloudflare Pages (or any static host).

## What changed in this version

The previous version was a single self-contained HTML file that saved data to
your Claude account's private storage — fine for one person, but with no real
login system. This version replaces that with:

- **Real signup/login** using Supabase Auth (email + password).
- **A Postgres database** (via Supabase) with a `plants` table and an
  `entries` table (watering/pesticide/photo logs), each row scoped to its
  owner with Row Level Security — one user can never see another's data.
- **Supabase Storage** for photos (a private bucket, accessed only through
  short-lived signed URLs), instead of storing images as base64 blobs.
- The same feature set as before: dashboard with watering-status chips,
  add/log water/pesticide/photo, growth timeline (vine layout), before/after
  compare, and a growth chart from logged height — all bilingual.

## Project structure

```
plantgrowthtracker/
  index.html            Vite entry HTML
  public/
    logo.svg             App logo / favicon / PWA icon
    manifest.json        PWA manifest
    sw.js                Service worker (offline app-shell cache)
  src/
    main.jsx             React entry point + share-link routing + SW registration
    registerSW.js         Registers the service worker
    App.jsx               Auth gate + top-level state + data loading
    supabaseClient.js     Supabase client (reads .env)
    api.js                All database + storage + share-link calls
    imageUtils.js          Client-side photo resize/compress before upload
    speciesData.js         Species → suggested watering interval lookup
    weather.js              Open-Meteo rainfall lookup + saved location
    exportUtils.js          CSV / PDF export helpers
    offlineQueue.js         Offline watering/pesticide queue + sync
    qrCode.js               Per-plant QR code generation
    i18n.js                English + Hindi strings
    styles.css             All styling (design tokens as CSS variables, incl. dark mode)
    components/
      Auth.jsx               Login/signup/forgot-password form
      NewPassword.jsx         "Set a new password" screen (after reset email)
      SharedPlantView.jsx     Public read-only page at /share/<token>
      Header.jsx              Top bar (logo, language, theme, export, add plant, logout)
      Dashboard.jsx            Plant grid + empty state + bulk-water button
      PlantCard.jsx             Single plant card + watering-status + rain hint
      PlantFormModal.jsx       "Add a plant" dialog + species suggestion
      LogModal.jsx             "Log watering/pesticide/photo" dialog (multi-photo)
      PlantDetail.jsx           Plant detail dialog (stats, share, PDF export, tabs)
      Timeline.jsx               Growth-timeline tab (vine layout, multi-photo)
      CareLog.jsx                Care-log tab (chronological list, edit/delete)
      Compare.jsx                 Before/after photo compare tab
      GrowthChart.jsx              Height-over-time chart tab
      PlantNotes.jsx                Journal tab (free-form notes)
      Household.jsx                 Household tab (invite/remove collaborators)
      CalendarView.jsx                Month calendar view of due dates
      QrCodeModal.jsx                  Per-plant QR code dialog
      Lightbox.jsx               Full-size photo viewer
      Toast.jsx                  Small confirmation toast
  supabase/
    schema.sql             Tables + Row Level Security + Storage policies
    migration_v2.sql        Multi-photo table + public share-link RPCs
    migration_v3.sql        Journal + household collaborators + updated RLS
    functions/
      get-shared-photo/       Edge Function: signed URLs for shared-plant photos
      send-watering-reminders/ Edge Function: daily overdue-watering emails
```

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (free
   tier is enough to start).
2. In the dashboard, open **SQL Editor -> New query**, paste the contents of
   `supabase/schema.sql`, and run it. This creates the `plants` and `entries`
   tables with Row Level Security policies already applied.
3. Go to **Storage -> New bucket**. Name it exactly `plant-photos` and leave
   **Public** turned **off** (the app reads photos through signed URLs, not
   public links). The storage policies for this bucket were already created
   by the SQL script above.
4. Go to **Project Settings -> API** and copy the **Project URL** and the
   **anon public** key.
5. (Optional but recommended) Under **Authentication -> Settings**, decide
   whether you want email confirmation required before login — it's on by
   default, which is why signup shows "check your email" before you can log
   in.

## 2. Configure the app

```bash
cp .env.example .env
```

Edit `.env` and paste in your Project URL and anon key:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
```

`.env` is already git-ignored, so your keys won't get committed. The anon key
is safe to expose in a browser app — that's what Row Level Security is for.

## 3. Run it locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Sign up with an
email and password, confirm the email if required, then log in.

## 4. Deploy to plantgrowthtracker.com

Build the static site:

```bash
npm run build
```

This outputs a `dist/` folder. Deploy it with Cloudflare Pages:

1. Push this project to a GitHub repo.
2. In Cloudflare Pages, create a project connected to that repo.
3. Build command: `npm run build`. Build output directory: `dist`.
4. Add the two environment variables (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`) in the Pages project settings, using the same
   values from your `.env`.
5. Point `plantgrowthtracker.com` at the Pages project as a custom domain.

## What's new in this update

A batch of feature additions on top of the core app. Most work with zero setup;
a few (watering-reminder emails, public share links) need one extra one-time
step because they touch things outside the browser (email sending, serving
private photos to logged-out visitors).

### Works immediately, no setup
- **Password reset** — "Forgot password?" on the login screen emails a reset
  link (uses Supabase's built-in auth email — same one that sends signup
  confirmations).
- **Species-based watering suggestions** — typing a common species name (e.g.
  "money plant", "तुलसी", "cactus") into the Add Plant form suggests a
  sensible watering interval you can accept or ignore. Lookup lives in
  `src/speciesData.js` — add more entries there any time.
- **"Water all due today" button** — one tap on the dashboard logs watering
  for every overdue plant at once.
- **Multiple photos per log entry** — select more than one photo when logging
  a watering/pesticide/photo entry; they all show up together in the
  timeline.
- **CSV export** — "Export all data (CSV)" in the header downloads every
  plant and log entry as a spreadsheet-ready file, for your own backup.
- **PDF export** — "Export history (PDF)" on a plant's detail view generates
  a readable PDF of that plant's full care history.
- **Dark mode** — toggle in the header, remembered on this device.
- **Weather-aware watering hint** — "Set my location" in the header uses your
  browser's location once, then checks recent rainfall (via the free
  Open-Meteo API — no key needed) and shows a small "recent rain nearby"
  note on plants that are due, in case they don't need water yet.
- **PWA / "Add to Home Screen"** — the app is installable on phones now
  (manifest + a small offline app-shell cache). Nothing to configure.

### Needs a one-time setup step

**1. Run the new database migration**
In the Supabase SQL Editor, run `supabase/migration_v2.sql` (after
`schema.sql`, if you haven't already). This adds multiple-photos-per-entry
support and public share links.

**2. Public share links** ("🔗 Share" button on a plant)
The share link itself works once the migration above is run — but photos on
the shared page are served through a small Edge Function (the photo bucket
stays private, so a logged-out visitor can't read it directly). One-time
setup:
```
supabase functions deploy get-shared-photo
```
(Requires the Supabase CLI: `npm install -g supabase`, then `supabase login`
and `supabase link` to this project, if you haven't already.) Once deployed,
turning on sharing for a plant and opening the link in an incognito window
should show photos correctly.

**3. Watering reminder emails**
This one needs a free [Resend](https://resend.com) account (for sending the
actual emails) and a scheduled job. Steps:
1. Sign up at resend.com, verify a sending domain (or use their test address
   for now), and copy an API key.
2. Set two secrets for your Supabase project:
   ```
   supabase secrets set RESEND_API_KEY=re_xxx
   supabase secrets set REMINDER_FROM_EMAIL="PlantGrowthTracker <reminders@yourdomain.com>"
   ```
3. Deploy the function:
   ```
   supabase functions deploy send-watering-reminders
   ```
4. In the Supabase SQL Editor, enable the `pg_cron` and `pg_net` extensions
   (Database → Extensions in the dashboard, or `create extension pg_cron;`
   and `create extension pg_net;`), then schedule the daily check:
   ```sql
   select cron.schedule(
     'daily-watering-reminders',
     '0 8 * * *', -- 8am every day, UTC
     $$
     select net.http_post(
       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-watering-reminders',
       headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY')
     );
     $$
   );
   ```
   Replace `YOUR_PROJECT_REF` and `YOUR_SERVICE_ROLE_KEY` with your project's
   values (Project Settings → API).

Until steps 2/3 above are done, everything else in the app works completely
normally — those two are additive and don't block anything.



- Photos are resized client-side (max ~640px, JPEG) before upload, to keep
  storage and load times small.
- Growth "analysis" is driven by what you log yourself — height (cm) and a
  1–5 health rating alongside each photo — plotted on the growth chart, plus
  the before/after compare view. There's no automatic AI image analysis.
- Deleting a plant removes its logs and stored photos permanently, after a
  confirmation prompt.

## What's new in this update (batch 2)

All of these need one thing first: run `supabase/migration_v3.sql` in the
Supabase SQL Editor (after `schema.sql` and `migration_v2.sql`). It adds a
`plant_notes` table, a `plant_collaborators` table, and rewrites several RLS
policies so household collaborators can see/add care history on a shared
plant. Once that's run, everything below works immediately — no other setup.

- **Edit/delete log entries** — every row in the Care Log tab now has Edit
  and Delete buttons. Editing changes date/note/height/health; the photo on
  a photo entry can't be changed after the fact (delete and re-add if you
  need to replace it). Deleting removes any attached photo from storage too.
- **Search, filter, and sort on the dashboard** — a search box, an "overdue
  only" checkbox, and a sort dropdown (name / next watering) above the plant
  grid.
- **Calendar view** — a "Grid / Calendar" toggle next to "My Plants" switches
  to a month view showing which plants are due on which day, projected
  forward from each plant's watering interval. Click a plant chip on any day
  to jump straight to it.
- **Journal per plant** — a new "Journal" tab for free-form notes ("moved to
  a sunnier spot", "bought from City Nursery") that are separate from the
  watering/pesticide/photo care log.
- **Household collaborators** — a new "Household" tab lets a plant's owner
  invite someone else by email. Once that person signs up/logs in with that
  email, they can see the plant and log watering/pesticide/photos on it too
  — a real shared plant, not just a read-only share link. The owner can
  remove access any time from the same tab.
- **QR code per plant** — a "QR Code" button on a plant's detail view
  generates a downloadable QR code. Scanning it opens that plant directly
  (`yourapp.com/plant/<id>`) for whoever's logged in as the owner or an
  accepted collaborator — handy printed and stuck in the actual pot for fast
  logging.
- **Offline logging with sync** — logging a watering or pesticide entry
  (without a photo) while offline saves it locally instead of failing; a
  small badge in the header shows how many entries are waiting, and they
  sync automatically the next time the app detects a connection. Photo
  entries and bulk actions on plants with no signal still need connectivity
  for the photo upload itself, but plain watering/pesticide logs work fully
  offline.

## Possible next additions

- Weather-based watering suggestions that also factor in temperature/heat,
  not just recent rainfall
- A dedicated "Settings" screen instead of a single "Set my location" button
  in the header
- Push notifications (the watering reminders are currently email-only)
- WhatsApp reminders as an alternative to email (needs a paid Twilio/WhatsApp
  Business API account)
- Photo-based plant identification (needs a paid vision API — kept separate
  from the existing growth chart, which is intentionally based only on the
  numbers you log yourself, not AI image analysis)
