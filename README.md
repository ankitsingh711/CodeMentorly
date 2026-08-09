# CodeMentorly

A production-ready 1:1 consulting/mentoring booking platform. Visitors browse services, pick a time
slot, book as a guest, pay, and get a confirmation — with a protected admin dashboard to manage
bookings, offerings, and availability.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4** with a small hand-built UI kit on top of **Radix UI** primitives (no external
  component library dependency beyond Radix)
- **PostgreSQL** + **Prisma ORM**
- **Zod** for all input validation (client and server)
- **React Hook Form** for booking and admin forms
- **NextAuth v5** (credentials provider, JWT sessions) for admin auth
- **Stripe Checkout + Webhooks** for payment, with a built-in **mock payment mode** when Stripe isn't
  configured
- **Resend** for transactional email, with a **console-log dev fallback** when unconfigured
- **Vitest** for unit + integration tests

## Architecture

```
src/
  app/
    page.tsx                     Homepage (hero, services, how-it-works, etc.)
    book/[slug]/                 Booking wizard for one offering
    book/mock-checkout/[id]/     Dev-mode simulated payment
    book/confirmation/[id]/      Booking confirmation page
    admin/login/                 Admin sign-in (outside the dashboard layout)
    admin/(dashboard)/           Protected dashboard: bookings, offerings, availability
    api/                         Route handlers (public + admin + webhooks)
    sitemap.ts, robots.ts        SEO
  components/
    ui/                          Design-system primitives (button, card, dialog, ...)
    site/                        Marketing page sections
    booking/                     Booking wizard pieces (calendar, slots, forms)
    admin/                       Admin dashboard pieces
  lib/                           Framework-agnostic utilities (availability engine, email,
                                 stripe client, validation schemas, rate limiting, auth config)
  server/                        Business logic / DB access (booking-service, checkout-service,
                                 notification-service, admin-guard) — kept separate from lib/ so
                                 UI code never imports write-path logic directly
prisma/
  schema.prisma                  Data model
  migrations/                    SQL migrations (including a partial unique index — see below)
  seed.ts                        Seeds offerings, weekday availability, and the admin user
```

### Why a partial unique index for bookings

`Booking` has `@@index([offeringId, startsAt])` in Prisma, plus a **raw-SQL partial unique index**
(`prisma/migrations/20260809180108_active_booking_unique_index`) that only applies to
`PENDING`/`CONFIRMED` bookings:

```sql
CREATE UNIQUE INDEX "Booking_offeringId_startsAt_active_key"
  ON "Booking" ("offeringId", "startsAt")
  WHERE "status" IN ('PENDING', 'CONFIRMED');
```

A plain unique constraint would permanently lock a time slot even after the booking that held it was
cancelled. The partial index enforces "only one active booking per slot" while letting cancelled/
refunded slots be rebooked. This was caught by the test suite (`booking-service.test.ts`), not
assumed — see [Testing](#testing).

### Race-condition safety

Booking creation (`src/server/booking-service.ts`) is defended in three layers:

1. An application-level availability check before the transaction.
2. A `Serializable`-isolation Prisma transaction that re-checks for overlapping bookings (any
   offering — it's one person's calendar) immediately before insert.
3. The DB-level partial unique index above as a final backstop.

Two concurrent requests for the same or overlapping slots will have exactly one succeed; the other
receives a `409` with "This time slot was just booked." This is covered by an actual concurrent-request
test, not just documented.

## Local development setup

### Prerequisites

- Node 20+
- A PostgreSQL server (local install, Docker, or a hosted instance)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

At minimum, set `DATABASE_URL` and `AUTH_SECRET` (`openssl rand -base64 32`). Everything else
(Stripe, Resend, analytics) has a safe development fallback — see [Optional integrations](#optional-integrations-stripe--email).

### 3. Database setup

```bash
npx prisma migrate dev   # creates the schema
npm run db:seed          # seeds offerings, weekday 10am–7pm availability, and the admin user
```

The seed script creates the admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` in your
`.env`. Re-running the seed is idempotent (upserts).

### 4. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`. Admin dashboard: `http://localhost:3000/admin/login`.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL used for Stripe redirect URLs, sitemap, canonical links |
| `AUTH_SECRET` | Yes | Signs NextAuth session JWTs |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Used by `db:seed` | Creates/updates the admin login |
| `STRIPE_SECRET_KEY` | No | Enables live Stripe Checkout. Unset = mock payment mode |
| `STRIPE_WEBHOOK_SECRET` | No (required if `STRIPE_SECRET_KEY` is set) | Verifies webhook signatures |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Reserved for client-side Stripe Elements if you extend checkout |
| `RESEND_API_KEY` | No | Enables real email delivery. Unset = emails are logged to the server console |
| `EMAIL_FROM` | No | From address for outgoing email |
| `NEXT_PUBLIC_ANALYTICS_KEY` | No | Enables the analytics event dispatcher (see `src/lib/analytics.ts`) |

No secret is ever referenced from client components — anything prefixed `NEXT_PUBLIC_` is the only
thing exposed to the browser, and none of those are sensitive (the publishable Stripe key is
designed to be public).

## Optional integrations: Stripe & email

This app is built so it **never fakes success** when an integration isn't configured — it runs a
clearly-labeled development mode instead.

### Stripe (payments)

- **Not configured:** booking creates a `Payment` row with `provider = MOCK`, and checkout redirects
  to `/book/mock-checkout/[bookingNumber]` — a page labeled "Development mode" with buttons to
  simulate a successful or failed payment. This exercises the exact same booking/notification code
  paths as live Stripe.
- **Configured:** set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Checkout creates a real Stripe Checkout Session
  (`src/server/checkout-service.ts`) and the booking is confirmed by the webhook handler at
  `/api/webhooks/stripe`, which verifies the signature and handles:
  - `checkout.session.completed` → booking `CONFIRMED`, payment `SUCCEEDED`, emails sent
  - `checkout.session.expired` → booking `CANCELLED`, payment `EXPIRED`
  - `payment_intent.payment_failed` → payment `FAILED`
  - `charge.refunded` → booking `REFUNDED`, payment `REFUNDED`, cancellation email sent

To test webhooks locally with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

Use the webhook signing secret the CLI prints as `STRIPE_WEBHOOK_SECRET`.

### Email (Resend)

- **Not configured:** every transactional email is logged to the server console (subject + a
  plain-text rendering of the body) instead of sent, and the booking flow proceeds normally.
- **Configured:** set `RESEND_API_KEY` and `EMAIL_FROM`. Emails are sent via Resend using the
  templates in `src/lib/email-templates.ts` and logged to the `Notification` table with delivery
  status (`SENT`/`FAILED`).

Emails implemented: booking confirmation, payment confirmation, reminder, cancellation, reschedule
(customer-facing), plus new-booking and cancellation notifications to `ADMIN_EMAIL`.

### Meeting links

No video-conferencing API is wired up (none was requested/available). Instead, the admin can attach
any meeting URL (Google Meet, Zoom, Cal.com, etc.) to a booking from **Admin → Bookings → ⋯ → Set
meeting link**. The availability settings page also has an optional "default meeting URL" field for
your own reference/copy-paste.

## How to configure availability

**Admin → Availability**:

- Toggle working days on/off and set start/end time per day
- Timezone (all slot generation happens in this timezone)
- Buffer between meetings (minutes)
- Minimum booking notice (hours) — how soon someone can book before a slot
- Maximum booking window (days) — how far in advance someone can book

Changes take effect immediately for new availability queries; no redeploy needed.

## How to add/edit offerings

**Admin → Offerings** — add, edit, reprice, change duration, or disable/enable any service. Disabling
an offering hides it from the public site and booking flow but preserves historical bookings (no hard
delete, since bookings reference offerings by foreign key).

## Testing

```bash
npm test          # vitest run — 33 tests across 6 files
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # production build
```

Tests run against a **separate** Postgres database (`.env.test` → `codementorly_test`) so they never
touch your dev data. Set it up once:

```bash
createdb codementorly_test   # or: psql -c "CREATE DATABASE codementorly_test"
DATABASE_URL="postgresql://user:pass@localhost:5432/codementorly_test" npx prisma migrate deploy
```

What's covered:

- **Validation** (`lib/validation.test.ts`) — booking and offering input schemas
- **Booking number generation** (`lib/booking-number.test.ts`) — format, character set, uniqueness
- **Availability engine** (`lib/availability.test.ts`) — slot generation, working-hour bounds, date
  overrides, buffer-time exclusion, cross-offering conflicts (shared calendar), minimum-notice
  window, real-time slot re-validation
- **Booking service** (`server/booking-service.test.ts`) — creation, customer dedup by email,
  rejecting an already-taken slot, **concurrent double-booking prevention** (three simultaneous
  requests for the same slot — exactly one succeeds), cancel/complete/refund status transitions,
  rebooking a freed (cancelled) slot
- **Admin authorization** (`server/admin-guard.test.ts`) — unauthenticated/no-user sessions rejected
- **Stripe webhook signatures** (`lib/stripe-webhook.test.ts`) — valid signature accepted; invalid
  signature, wrong secret, and tampered payload all rejected

I also manually walked the full happy path (visitor → offering → date → time → customer info → mock
payment → confirmation → email log) against both the dev server and the production build, and
verified double-booking returns `409`, admin pages 401 without a session, and the middleware/proxy
redirects unauthenticated `/admin/*` requests to `/admin/login`.

## Deployment (Vercel)

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import it in Vercel.
3. Add a Postgres database (Vercel Postgres, Neon, or Supabase all work) and set `DATABASE_URL` in
   Vercel's environment variables.
4. Set the remaining environment variables from the table above (`AUTH_SECRET`, `ADMIN_EMAIL`, etc,
   plus Stripe/Resend keys if you want live payments/email instead of the dev fallbacks).
5. Set `NEXT_PUBLIC_APP_URL` to your production URL (used for Stripe redirect URLs and SEO).
6. Build command: `npm run build` (default). The `postinstall` script runs `prisma generate`
   automatically.
7. **Run migrations against production** before or during first deploy:
   ```bash
   DATABASE_URL="<production-url>" npx prisma migrate deploy
   DATABASE_URL="<production-url>" npm run db:seed
   ```
8. If using Stripe, add the webhook endpoint in the Stripe dashboard pointing to
   `https://yourdomain.com/api/webhooks/stripe`, then copy the signing secret into
   `STRIPE_WEBHOOK_SECRET`.

## Troubleshooting

- **"No available times on this date"** — check Admin → Availability: is that weekday enabled? Is the
  date within the min-notice/max-advance window?
- **Booking fails with 409** — someone else booked that slot first; the UI automatically refreshes
  available slots and asks the customer to pick another time.
- **Emails aren't arriving** — check the server console; if `RESEND_API_KEY` isn't set, emails are
  logged there instead of sent. This is intentional dev behavior, not a bug.
- **Payments show "Development mode"** — `STRIPE_SECRET_KEY` isn't set. This is the intended fallback;
  set the Stripe env vars to enable live Checkout.
- **`/admin` redirects to login in a loop** — confirm `AUTH_SECRET` is set and identical across
  restarts/deployments (session JWTs are signed with it).
- **Prisma migration errors about the partial unique index** — that index is created via raw SQL in
  the migration file (Prisma's schema DSL doesn't support partial indexes), so it won't show up via
  `prisma db pull`; don't regenerate that migration from schema diffing.

## What's real vs. what's a documented fallback

Everything in this app is fully implemented and functional end-to-end. The only things gated behind
credentials you haven't provided are genuinely third-party services:

- **Stripe** — real integration, runs in mock mode without keys (see above)
- **Resend** — real integration, logs to console without a key (see above)
- **Video conferencing (Meet/Zoom/Cal.com)** — no API integration exists for any provider; meeting
  URLs are attached manually by the admin, by design (no credentials were requested for this)
