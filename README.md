# Impact Beauty Studio

Appointment booking for Impact Beauty Studio by Yvonnie. Customers choose a service and a genuinely free time. The studio manages the schedule from a private dashboard.

## Run locally

1. Place the official logo at `public/brand/impact-beauty-studio-logo.png`. The site uses that file as-is. Until it is there, headings use the studio name in type.
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL, anon key, setup key, and cron secret.
3. Install and start:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm test` checks the availability rules. `node scripts/verify-booking.mjs` checks the live booking functions.

## First owner account

1. In the Supabase dashboard, create a user under Authentication and mark the email confirmed. This project also hosts another app, so do not change that project's confirmation settings globally unless you mean to.
2. Sign in at `/admin/login`.
3. Open `/admin/setup` and enter `STUDIO_SETUP_KEY` from `.env.local`. The key works once, for the first owner.

## Studio setup

After signing in, set prices under Services. The seed catalog is a starting point:

- Wig Installation, 120 minutes
- Makeup, 90 minutes
- Wig Installation + Makeup, 210 minutes

Hours start as Monday and Sunday closed, Tuesday to Saturday 08:00–17:00, in Africa/Johannesburg. Change hours, blocked time, and booking rules from the dashboard. Sample customers and appointments are marked “Sample” and can be deleted.

## Reminders

Set `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL`, then call `POST /api/cron/reminders` with `Authorization: Bearer <CRON_SECRET>` on a schedule. WhatsApp is recorded as a future channel and is not sent.
