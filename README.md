# Beko ComplianceOS — Web App (WAP)

> A South African legal-tech platform that helps SMEs, startups, and sole proprietors manage their compliance obligations with SARS, CIPC, and other regulators.

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

- **Email/password & Google authentication** via Supabase Auth
- **Password reset** via Supabase Auth
- **Multi-step onboarding wizard** that collects business profile data
- **Compliance score calculator** (0–100) based on business profile
- **Protected dashboard** with company profile, score, alerts, and deadlines
- **Demo data** — one-click fill on onboarding and one-click load on dashboard
- **Row Level Security** — users can only read/write their own data

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
├── emails/                   ← Branded email HTML templates
│   ├── verify-email.html
│   ├── password-reset.html
│   └── welcome.html
│
└── docs/                     ← Project documentation
    ├── supabase-schema.sql   ← Database schema
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

### 2. Run the database schema

1. In Supabase, go to **SQL Editor → New Query**
2. Open [docs/supabase-schema.sql](docs/supabase-schema.sql) and copy the contents
3. Click **Run**

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

```
User opens app
  │
  ▼
Splash screen  ──►  Login page
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   Email Login    Email Signup   Google Login
        │             │             │
        │             ▼             │
        │     Verify Email ────────►│
        │             │             │
        └──────┬──────┘             │
               ▼                    │
        Onboarding Wizard ◄─────────┘
        (6-step business profile)
               │
               ▼
        Compliance Dashboard
```

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

The app uses **Supabase PostgreSQL** with two tables:

- **`profiles`** — User profile (name, email, auth provider, onboarding status, company link)
- **`company_profiles`** — Business profile (25+ fields including compliance score)

Full schema: [docs/supabase-schema.sql](docs/supabase-schema.sql)

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
| [docs/supabase-schema.sql](docs/supabase-schema.sql) | PostgreSQL schema for profiles and company_profiles |
| [docs/beko_complianceos_desktop_portal.html](docs/beko_complianceos_desktop_portal.html) | Desktop portal mockup |

---

## License

Proprietary — © Beko ComplianceOS
