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

- **Email/password & Google authentication** with email verification
- **Password reset** via Firebase Auth
- **Multi-step onboarding wizard** that collects business profile data
- **Compliance score calculator** (0–100) based on business profile
- **Protected dashboard** with company profile, score, alerts, and deadlines
- **PWA support** — installable, offline-capable via service worker
- **Firestore security rules** — owner-only read/write, no client-side deletes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JavaScript (ES Modules) |
| Auth | Firebase Authentication (v10.12.2) |
| Database | Cloud Firestore |
| Hosting | Firebase Hosting |
| PWA | Service Worker + Web App Manifest |

---

## Project Structure

```
Beko-Compliance-OS.WAP/
├── firebase.js              ← Firebase init (Auth + Firestore config)
├── firebase.json             ← Firebase CLI / hosting config
├── firestore.rules           ← Firestore security rules
├── index.html                ← Splash / welcome screen
├── index.css                 ← Splash styles
├── index.js                  ← Splash logic + SW registration
├── manifest.json             ← PWA manifest
├── service-worker.js         ← Offline cache strategy
├── bg.jpeg                   ← Background / logo image
│
├── shared/                   ← Shared utility modules
│   ├── auth-router.js        ← Unified routing (verify → onboard → dashboard)
│   ├── toast.js              ← Toast notifications (error / success)
│   ├── loading.js            ← Button loading-state helper
│   └── validators.js         ← Email, password, and input validators
│
├── login/                    ← Login, signup, and password reset
│   ├── login.html
│   ├── login.css
│   └── login.js
│
├── verify/                   ← Email verification
│   ├── verify-email.html
│   ├── verify-email.css
│   └── verify-email.js
│
├── onboarding/               ← Multi-step onboarding wizard
│   ├── onboarding.html
│   ├── onboarding.css
│   └── onboarding.js
│
├── dashboard/                ← Protected compliance dashboard
│   ├── dashboard.html
│   ├── dashboard.css
│   └── dashboard.js
│
├── pwa/                      ← Duplicate PWA assets (alt. manifest + SW)
│   ├── manifest.json
│   └── service-worker.js
│
└── docs/                     ← Project documentation
    ├── DATABASE_SCHEMA.md    ← Full database schema, ERD, and relations
    ├── DATABASE_SETUP.md     ← Original Firestore setup notes
    └── structure.md          ← Original folder structure notes
```

---

## Getting Started

### Prerequisites

- A modern browser (Chrome, Firefox, Edge)
- A local HTTP server (Firebase CLI, Live Server, or `python -m http.server`)

### Run Locally

1. **Clone the repo:**
   ```bash
   git clone https://github.com/NkadimengKgothatso/Beko-Compliance-OS.WAP.git
   cd Beko-Compliance-OS.WAP
   ```

2. **Start a local server** (ES Modules require HTTP, not `file://`):
   ```bash
   # Option A: Firebase emulator
   firebase serve

   # Option B: Python
   python -m http.server 8080

   # Option C: VS Code Live Server extension
   ```

3. **Open** `http://localhost:8080` (or the port your server uses).

---

## Authentication Flow

```
User opens app
  │
  ▼
Splash screen (7s)  ──►  Login page
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

### Routing Rules (enforced by `shared/auth-router.js`)

| Condition | Redirect |
|---|---|
| Not signed in | → Login |
| Email user, email not verified | → Verify Email |
| `onboardingComplete = false` | → Onboarding |
| `onboardingComplete = true` but no company profile doc | → Onboarding (flag cleared) |
| `onboardingComplete = true` + company profile exists | → Dashboard |

---

## Database

The app uses **Cloud Firestore** with two collections:

- **`users/{uid}`** — User profile (name, email, auth provider, onboarding status)
- **`companyProfiles/{uid}`** — Business profile (15 fields including compliance score)

Full schema documentation: [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)

### Deploy Firestore Rules

```bash
firebase login
firebase deploy --only firestore:rules
```

---

## Deployment

### Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy
firebase deploy
```

### Firebase Configuration

The Firebase project config is in `firebase.js`:
- **Project ID:** `beko-compliance-os`
- **Auth Domain:** `beko-compliance-os.firebaseapp.com`

---

## Documentation

| Document | Description |
|---|---|
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Full database schema, ERD, field descriptions, score calculation |
| [DATABASE_SETUP.md](docs/DATABASE_SETUP.md) | Original Firestore setup notes |

---

## License

Proprietary — © Beko ComplianceOS
