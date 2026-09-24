# BPH Sales Assistant

A simple sales assistant for **BISWAJIT POWER HUB**. It follows one path:

enquiry → customer → follow-up → call or WhatsApp → test ride → sold or lost → review → referral.

It is a mobile-first installable web app. Supabase is the shared database when you connect it. Until then, the app runs in **demo mode** and keeps sample data on this phone only.

## Run it locally

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4179

Demo sign-in (only when Supabase is not configured):

- Owner: `owner@bph.demo` / `owner1234`
- Staff: `staff@bph.demo` / `staff1234`
- Team code: `BPHDEMO1`

These accounts are not real. Sample names and numbers are fictional.

```bash
npm test
npm run build
```

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **Authentication → Providers → Email**, leave email/password on. For a small team you can turn off “Confirm email” so the owner can sign in immediately. If you leave it on, the app asks people to check their email.
3. In **Authentication → URL configuration**, add:
   - Site URL: your live address, or `http://127.0.0.1:4179` while testing
   - Redirect URLs: `http://127.0.0.1:4179/**` and your live site, including `/reset-password`
4. Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql) once.
5. Copy `.env.example` to `.env` and fill in the **Project URL** and the **anon public key** only.

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Restart `npm run dev`. Sign up as the owner, review the showroom details, and tap **Create business**. Share the team code from Settings with staff. They create an account and choose **I have a team code**.

Never put the service role key in `.env`, in the app, or in Git. The anon key is meant for the browser. Row Level Security decides what each person can see.

### Who can see what

- **Owner** sees every customer, edits products and business details, manages the team, and can export.
- **Staff** see leads assigned to them.
- The owner can switch a staff member to **Sees all leads**.
- A customer assigned to nobody is visible to the owner (and to staff who can see all leads).

Security is enforced in Postgres, not only in the screens.

### Optional sample rows

[`supabase/seed.sql`](supabase/seed.sql) inserts one fictional customer marked `is_sample`. Do not run it on a live showroom database. Remove those rows with [`supabase/clear_seed.sql`](supabase/clear_seed.sql).

## GitHub Pages

1. In the repository settings, set Pages to **GitHub Actions**.
2. Add repository secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the anon key, not the service role key). If the secrets are empty, the published site stays in demo mode and each browser keeps its own data.
3. Push to `main`. The workflow in `.github/workflows/pages.yml` builds and deploys.
4. Add the Pages URL to Supabase redirect URLs.

The build sets the Vite base path from the repository name, so assets work at `https://username.github.io/repository-name/`. A repository named `username.github.io` is served from `/`. Refreshing a page works because the build copies `index.html` to `404.html`.

For Vercel, `vercel.json` sends every path to the app. Leave `GITHUB_PAGES_BASE` unset.

## What the app does

- Home shows overdue follow-ups, today’s follow-ups, today’s test rides, and this month’s new, sold, and lost counts.
- Add a customer with name, phone, model, battery, and a follow-up. Enquiry date defaults to today.
- The same phone number asks **Open existing** or **Add anyway**.
- Call uses `tel:+91…`. WhatsApp opens a message you can edit. Nothing is sent or dialled by itself.
- Follow-ups can be marked done or rescheduled. The customer stays in the list, and the history keeps the event.
- Test rides, sold, and lost are status changes. There is no accounting.
- Sold customers can open a Google review link you paste in Settings, and a WhatsApp note that asks for an honest review. Referral opens WhatsApp with a message you still have to send.
- Owner can export CSV and JSON, and import a JSON backup. Duplicate phones are skipped. Passwords are not exported.
- Changes sync across signed-in devices through Supabase. If the phone is offline, the change stays on the phone and is marked as not synced. The app does not pretend it reached the server.

Reminders can appear when you open BPH, if the browser allows notifications. They are **not** guaranteed at the exact follow-up time while the app is closed. Overdue and today’s lists are always on the home screen.

## Folder map

```text
src/pages            screens
src/components       cards, forms, navigation
src/lib              phone, dates, permissions, backup, notifications
src/lib/data         demo store and Supabase store
src/context          theme, toasts, signed-in session
supabase/schema.sql  tables, functions, and row level security
```

Business details (name, phone, showroom, hours, website) start as the BPH details and can be edited in Settings. Model and battery names can be edited there too. The app does not invent price, range, speed, or warranty.
