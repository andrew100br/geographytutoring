# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

No test runner is configured.

## Architecture

**Purpose:** Online geography tutoring platform for Teacher Andrew. Students/parents create accounts, purchase lesson credits via Stripe, and book sessions on a calendar. An admin dashboard manages students and bookings.

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, Supabase (auth + PostgreSQL), Netlify Functions (serverless), Stripe (payments), deployed on Netlify.

### Frontend (`src/`)

- `src/app/` — App Router pages: `page.tsx` (landing), `booking/page.tsx` (full auth+booking portal, 580+ lines), `admin/page.tsx` (admin dashboard), `reset-password/page.tsx`
- `src/components/` — `Navbar`, `Footer`, `ReviewsSlider`, `ContactForm`
- `src/lib/supabase.ts` — Supabase browser client
- `src/app/style.css` — Primary stylesheet (26KB, component-specific styles via CSS custom properties)

### Backend (`netlify/functions/`)

All backend logic lives in Netlify serverless functions (plain JS, not TypeScript):

| Function | Purpose |
|---|---|
| `public-action.js` | Booked slots retrieval, Stripe checkout verification |
| `create-checkout.js` | Stripe session creation (card, Alipay, WeChat Pay) |
| `stripe-webhook.js` | Payment confirmation, credits top-up |
| `admin-action.js` | Admin dashboard data, student management |
| `student-action.js` | Student-specific operations |

### Data Model (Supabase)

- `profiles` — id, email, parent_name, child_name, country, credits
- `bookings` — user_id, booking_date, status, is_monthly, is_ten_lessons

### Key Patterns

- **Booking calendar** polls every 5 seconds for real-time availability across concurrent users
- **Timezone handling:** Teacher schedule is fixed in TZ+07:00 (Thailand); student UI converts to browser timezone
- **Contact form** uses FormSubmit.co via hidden iframe for submission (no backend required)
- **Payments:** Credits model — £25/lesson, 10-lesson bundle; Stripe webhook adds credits to profile on payment confirmation
- **Path alias:** `@/*` maps to `./src/*`
