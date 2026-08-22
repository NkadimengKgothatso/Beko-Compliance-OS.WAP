# Beko ComplianceOS — Web App (WAP)

> A South African legal-tech platform that helps SMEs, startups, and sole proprietors manage their compliance obligations with SARS, CIPC, and other regulators.

**Live site:** [https://www.bekocompliance.co.za](https://www.bekocompliance.co.za)

**Vercel preview:** [https://beko-compliance-os-azhgta1e7-nkadimengkgothatsos-projects.vercel.app](https://beko-compliance-os-azhgta1e7-nkadimengkgothatsos-projects.vercel.app)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Authentication Flow](#authentication-flow)
- [Database](#database)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## Features

- **Email/password, code verification & Google authentication** via Supabase Auth
- **Confirm password validation** with live match feedback
- **8-digit email verification code** for email confirmation after signup
- **Auto-redirect to verify** if unverified user tries to log in
- **Password reset** via email link
- **Multi-step onboarding wizard** that collects business profile data
- **Compliance score calculator** (0–100) based on business profile
- **Protected dashboard** with company profile, score, alerts, and deadlines
- **Template library** — generate branded, professional PDFs with the Beko logo
- **Legal education hub** — searchable compliance articles and guides
- **Tender notifications** — browse tenders, create alerts, and track opportunities
- **AML risk screener** — FICA-style risk questionnaire with history
- **Consultation booking** — request help from partner law firms
- **Notifications centre** — compliance reminders and read/unread state
- **Row Level Security** — users can only read/write their own data
- **Compliance centre** — POPIA readiness checklist, SARS tax calendar, CIPC annual-return reminders, and a document vault with Supabase Storage
- **Admin panel** — manage tenders, broadcast notifications, and update consultation statuses
- **Progressive Web App (PWA)** — install on mobile home screen, offline app shell caching, themed status bar
- **Responsive design** — works on desktop, tablet, and mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JavaScript (ES Modules) |
| Auth | Supabase Authentication |
| Database | Supabase PostgreSQL |
| Hosting | Vercel / static host |

---

## Project Structure

```
Beko-Compliance-OS.WAP/
├── supabase.js               ← Supabase init (URL + anon key)
├── index.html                ← Splash / welcome screen
├── manifest.json             ← PWA manifest
├── service-worker.js         ← PWA service worker (offline caching)
├── bg.jpeg                   ← Logo image
│
├── shared/                   ← Shared utility modules
│   ├── router.js             ← Auth routing (verify → onboard → dashboard)
│   └── ui.js                 ← Toast + loading helpers
│
├── login/                    ← Login, signup, and password reset
│   └── login.html            ← Self-contained page
│
├── verify/                   ← Email verification
│   └── verify-email.html     ← Self-contained page
│
├── onboarding/               ← Multi-step onboarding wizard
│   └── onboarding.html       ← Self-contained page
│
├── dashboard/                ← Protected compliance dashboard
│   └── dashboard.html        ← Self-contained page
│
├── assets/                   ← Shared CSS/JS used by multiple pages
│   ├── mobile-nav.css
│   └── mobile-nav.js
│
├── templates/                ← Downloadable legal/compliance templates
│   └── templates.html
│
├── education/                ← Legal education hub
│   └── education.html
│
├── tenders/                  ← Tender listings, alerts, and tracking
│   └── tenders.html
│
├── aml/                      ← AML/FICA risk screener
│   └── aml.html
│
├── notifications/            ← In-app notifications
│   └── notifications.html
│
├── consultation/             ← Book legal consultations
│   └── consultation.html
│
├── profile/                  ← User profile and settings
│   └── profile.html
│
├── admin/                    ← Admin panel for managing content
│   └── admin.html
│
├── compliance/               ← POPIA, SARS, CIPC, and document vault
│   └── compliance.html
│
├── emails/                   ← Branded email HTML templates
│   ├── verify-email.html
│   ├── password-reset.html
│   └── welcome.html
│
└── docs/                     ← Project documentation
    ├── supabase-schema.sql   ← Full database schema (clean slate)
    ├── supabase-migration-v3.sql ← Adds is_admin flag (legacy)
    ├── supabase-migration-v4.sql ← Adds compliance tables, storage, and admin policies
    ├── implementation-summary.md
    └── beko_complianceos_desktop_portal.html
```

---

## Getting Started

### Prerequisites

- A modern browser (Chrome, Firefox, Edge)
- A local HTTP server (`http-server`, Live Server, or `python -m http.server`)
- A Supabase project (free tier is fine)

### 1. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy:
   - Project URL
   - `anon` public key
3. Paste them into `supabase.js`
4. Go to **Authentication → URL Configuration** and set:
   - **Site URL**: `https://www.bekocompliance.co.za` (or your local `http://localhost:3000` for testing)
   - **Redirect URLs**: add `https://www.bekocompliance.co.za/verify/verify-email.html` so email verification links bring users back to the app

### 2. Run the database schema

Choose one option based on whether you already have data in Supabase:

**Option A — Fresh project (no existing data)**
1. In Supabase, go to **SQL Editor → New Query**
2. Open [docs/supabase-schema.sql](docs/supabase-schema.sql) and copy the contents
3. Click **Run**

**Option B — Existing project with users/data**
1. In Supabase, go to **SQL Editor → New Query**
2. Open [docs/supabase-migration-v4.sql](docs/supabase-migration-v4.sql) and copy the contents
3. Click **Run**

> The migration adds all new tables **and** ensures the auth trigger that creates a `profiles` row on sign-up is present. If you see "database error saving user" during signup, re-run the migration.

### 3. Run Locally

```bash
# Install http-server globally (once)
npm install -g http-server

# Start server
cd Beko-Compliance-OS.WAP
http-server -p 3000 -c-1
```

Open `http://localhost:3000`.

---

## Authentication Flow

The app uses **password-based login** with **8-digit email verification codes** sent after signup.

```
User opens app
  │
  ▼
Splash screen  ──►  Login page (tabs: Sign In / Create Account)
                      │
        ┌─────────────┼──────────────┐
        ▼             ▼              ▼
   Password Login   Signup form   Google OAuth
        │          (name, email,
        │          password, confirm)
        │             │
        │             ▼
        │     Account created →
        │     Redirect to verify
        │     page (auto-sends code)
        │             │
        ▼             ▼
   ┌─────────────────────────┐
   │  Verify page: 8-digit   │
   │  code input + auto-     │
   │  submit + resend        │
   └────────────┬────────────┘
                │
                ▼
        Onboarding Wizard
        (6-step business profile)
                │
                ▼
        Compliance Dashboard
```

### SMTP Configuration (Custom Sender Email)

To send verification emails from `bekocompliance9@gmail.com` instead of Supabase's default:

1. Go to **Supabase Dashboard → Authentication → SMTP Settings**
2. Enable **Custom SMTP**
3. Fill in:
   - **Sender email:** `bekocompliance9@gmail.com`
   - **Host:** `smtp.gmail.com`
   - **Port:** `587`
   - **Username:** `bekocompliance9@gmail.com`
   - **Password:** *(use a Gmail [App Password](https://myaccount.google.com/apppasswords), not your regular password)*
4. Click **Save changes**

> **Note:** You must have 2-Step Verification enabled on the Gmail account to generate an App Password.

### Supabase Auth Settings

In **Supabase Dashboard → Authentication → Settings**:

- **Enable Email provider:** ON
- **Confirm email:** ON
- **Secure email change:** OFF
- **Secure password change:** OFF

### Routing Rules (enforced by `shared/router.js`)

| Condition | Redirect |
|---|---|
| Not signed in | → Login |
| Email user, email not verified (TEST_MODE = false) | → Verify Email |
| `onboarding_complete = false` | → Onboarding |
| `onboarding_complete = true` but no company profile | → Onboarding (flag cleared) |
| `onboarding_complete = true` + company profile exists | → Dashboard |

---

## Database

The app uses **Supabase PostgreSQL** with Row Level Security enabled:

- **`profiles`** — User profile (name, email, auth provider, onboarding status, company link)
- **`company_profiles`** — Business profile (25+ fields including compliance score)
- **`consultations`** — Consultation bookings
- **`notifications`** — In-app notification messages
- **`tenders`** — Tender opportunity listings
- **`tender_alerts`** — User-created keyword/province alerts
- **`tender_tracks`** — Tenders a user is tracking
- **`aml_screenings`** — AML screening results
- **`popia_checklists`** — User POPIA readiness checklists
- **`tax_deadlines`** — SARS/CIPC deadline calendar
- **`cipc_reminders`** — User CIPC annual-return reminder settings
- **`documents`** — Document vault metadata (files live in Supabase Storage)

Full schema: [docs/supabase-schema.sql](docs/supabase-schema.sql)  
Non-destructive migration: [docs/supabase-migration-v4.sql](docs/supabase-migration-v4.sql)

Row Level Security policies ensure each user can only access their own rows.

---

## Deployment

This is a static frontend. Deploy the project folder to any static host:

### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Manual

Upload the project folder to Netlify, Cloudflare Pages, GitHub Pages, or any static host.

---

## Documentation

| Document | Description |
|---|---|
| [docs/supabase-schema.sql](docs/supabase-schema.sql) | Full PostgreSQL schema (clean slate) |
| [docs/supabase-migration-v3.sql](docs/supabase-migration-v3.sql) | Adds is_admin flag to existing projects |
| [docs/supabase-migration-v4.sql](docs/supabase-migration-v4.sql) | Adds compliance tables, storage bucket, and admin policies |
| [manifest.json](manifest.json) | PWA manifest for mobile install |
| [service-worker.js](service-worker.js) | Service worker that caches the app shell for offline use |
| [docs/implementation-summary.md](docs/implementation-summary.md) | Build notes, features, and deployment log |
| [docs/beko_complianceos_desktop_portal.html](docs/beko_complianceos_desktop_portal.html) | Desktop portal mockup |

---

## License

Proprietary — © Beko ComplianceOS
