# Beko ComplianceOS — Database Schema & Relations

> **Database:** Cloud Firestore (NoSQL document database)
> **Project:** `beko-compliance-os`
> **Security:** Owner-only access enforced via `firestore.rules`

---

## Table of Contents

1. [Overview](#overview)
2. [Collection: `users`](#collection-users)
3. [Collection: `companyProfiles`](#collection-companyprofiles)
4. [Entity Relationship Diagram](#entity-relationship-diagram)
5. [Relationships & Data Flow](#relationships--data-flow)
6. [Firestore Security Rules](#firestore-security-rules)
7. [Auth Flow & Database Interactions](#auth-flow--database-interactions)
8. [Design Decisions](#design-decisions)

---

## Overview

The database uses two Firestore collections, both keyed by the Firebase Auth UID. This one-to-one relationship means each user owns exactly one user document and at most one company profile.

```
┌─────────────────┐          ┌─────────────────────────┐
│  Firebase Auth   │          │      Firestore          │
│                  │          │                         │
│  ┌─────────────┐ │  uid ──▶ │  users/{uid}            │
│  │   User       │ │          │  ├─ fullName            │
│  │   (uid)      │ │          │  ├─ email               │
│  └─────────────┘ │          │  ├─ authProvider        │
│                  │          │  ├─ onboardingComplete  │
│                  │          │  ├─ complianceScore     │
│                  │          │  ├─ companyName         │
│                  │          │  └─ createdAt           │
│                  │          │                         │
│                  │  uid ──▶ │  companyProfiles/{uid}  │
│                  │          │  ├─ ownerUid            │
│                  │          │  ├─ businessName        │
│                  │          │  ├─ businessType        │
│                  │          │  ├─ ... (11 fields)     │
│                  │          │  └─ updatedAt           │
└─────────────────┘          └─────────────────────────┘
```

---

## Collection: `users`

**Document ID:** Firebase Auth user UID
**Created:** During email signup or first Google login
**Updated:** After email verification, onboarding completion

### Fields

| Field | Type | Set When | Description |
|---|---|---|---|
| `fullName` | `string` | Signup / Google login | User's display name |
| `email` | `string` | Signup / Google login | User's email address |
| `authProvider` | `string` | Signup / Google login | `"email"` or `"google"` |
| `onboardingComplete` | `boolean` | Signup (→ `false`), onboarding finish (→ `true`) | Whether the user has completed the onboarding wizard |
| `complianceScore` | `number` | Onboarding finish | Cached copy of the score from `companyProfiles` |
| `companyName` | `string` | Onboarding finish | Cached copy of `businessName` from `companyProfiles` |
| `createdAt` | `timestamp` | Signup / Google login | Account creation timestamp (server-side) |
| `updatedAt` | `timestamp` | Onboarding finish / verification | Last modification timestamp |

### Fields NOT stored in Firestore

| Field | Source | Reason |
|---|---|---|
| `emailVerified` | `user.emailVerified` (Firebase Auth object) | Must be read live from Auth to prevent stale data |
| `displayName` | `user.displayName` (Firebase Auth profile) | Set via `updateProfile()` during signup |

---

## Collection: `companyProfiles`

**Document ID:** Firebase Auth user UID (same as the `users` doc)
**Created:** When the user completes the onboarding wizard
**Updated:** On onboarding completion (currently write-once)

### Fields

| Field | Type | Description |
|---|---|---|
| `ownerUid` | `string` | Firebase Auth UID of the owner (matches document ID) |
| `businessName` | `string` | Registered business name |
| `businessType` | `string` | One of: `sole-proprietor`, `private-company`, `non-profit`, `partnership` |
| `registrationNumber` | `string` | CIPC registration number (optional for sole proprietors) |
| `province` | `string` | South African province (9 options) |
| `vatRegistered` | `string` | `"yes"`, `"no"`, or `"unsure"` |
| `employees` | `number` | Number of employees (≥ 0) |
| `industry` | `string` | Primary industry sector |
| `monthlyRevenue` | `string` | Revenue bracket: `under-50k`, `50k-100k`, `100k-500k`, `over-500k` |
| `lastTaxFiling` | `string` | `current`, `recent`, `late`, or `never` |
| `hasRecords` | `boolean` | Whether the user keeps organised tax/payroll records |
| `complianceScore` | `number` | Calculated 0–100 score based on all fields above |
| `scoreSummary` | `string` | Human-readable summary of the score range |
| `createdAt` | `timestamp` | Profile creation time |
| `updatedAt` | `timestamp` | Last update time |

### Compliance Score Calculation

The score starts at a **base of 45** and adjusts based on profile fields:

| Condition | Points |
|---|---|
| Business name provided | +5 |
| Business type selected | +5 |
| Sole proprietor or registration number provided | +8 |
| Province selected | +5 |
| VAT registered = "yes" | +7 |
| VAT registered = "unsure" | −5 |
| Employees > 0 | +5 |
| Industry selected | +5 |
| Monthly revenue selected | +5 |
| Last tax filing = "current" (within 3 months) | +10 |
| Last tax filing = "recent" (within 1 year) | +5 |
| Last tax filing = "late" (over 1 year) | −8 |
| Last tax filing = "never" | −12 |
| Has organised records | +10 |

**Score ranges:**
| Range | Status | Summary |
|---|---|---|
| 80–100 | Strong position | Monitor deadlines |
| 60–79 | Needs attention | Review priority tasks |
| 40–59 | Moderate risk | Urgent compliance basics |
| 0–39 | High risk | Stabilise core obligations |

---

## Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    FIREBASE AUTH                          │
│                                                          │
│  ┌────────────────────────────────────┐                  │
│  │ User                               │                  │
│  │ • uid (PK)                         │                  │
│  │ • email                            │                  │
│  │ • emailVerified                    │                  │
│  │ • displayName                      │                  │
│  │ • providerData[]                   │                  │
│  └──────────┬─────────────────────────┘                  │
│             │ uid                                        │
└─────────────┼────────────────────────────────────────────┘
              │
              │ 1:1
              ▼
┌──────────────────────────────────────────────────────────┐
│                      FIRESTORE                            │
│                                                          │
│  ┌──────────────────────────────────┐                    │
│  │ users/{uid}                      │                    │
│  │ ──────────────────────────────── │                    │
│  │ fullName        : string         │                    │
│  │ email           : string         │                    │
│  │ authProvider    : string         │                    │
│  │ onboardingComplete : boolean     │                    │
│  │ complianceScore : number         │                    │
│  │ companyName     : string         │                    │
│  │ createdAt       : timestamp      │                    │
│  │ updatedAt       : timestamp      │                    │
│  └──────────┬───────────────────────┘                    │
│             │ uid (1:1)                                  │
│             ▼                                            │
│  ┌──────────────────────────────────┐                    │
│  │ companyProfiles/{uid}            │                    │
│  │ ──────────────────────────────── │                    │
│  │ ownerUid          : string (FK)  │                    │
│  │ businessName      : string       │                    │
│  │ businessType      : string       │                    │
│  │ registrationNumber : string      │                    │
│  │ province          : string       │                    │
│  │ vatRegistered     : string       │                    │
│  │ employees         : number       │                    │
│  │ industry          : string       │                    │
│  │ monthlyRevenue    : string       │                    │
│  │ lastTaxFiling     : string       │                    │
│  │ hasRecords        : boolean      │                    │
│  │ complianceScore   : number       │                    │
│  │ scoreSummary      : string       │                    │
│  │ createdAt         : timestamp    │                    │
│  │ updatedAt         : timestamp    │                    │
│  └──────────────────────────────────┘                    │
└──────────────────────────────────────────────────────────┘
```

---

## Relationships & Data Flow

### 1:1 — `users/{uid}` ↔ `companyProfiles/{uid}`

- Both documents share the same UID as their document ID.
- The relationship is **implicit** (no foreign key field in `users`) — the `ownerUid` field in `companyProfiles` is the explicit back-reference.
- `users.complianceScore` and `users.companyName` are **denormalised copies** from `companyProfiles`, written once during onboarding for quick access.

### Data Flow by Page

```
SIGNUP (login.js)
  └─► creates:  users/{uid}  (fullName, email, authProvider, onboardingComplete=false)

GOOGLE LOGIN (login.js)
  └─► creates (if new):  users/{uid}  (same fields, authProvider="google")

VERIFY EMAIL (verify-email.js)
  └─► reads:    users/{uid}  (checks onboardingComplete)
  └─► routes to onboarding or dashboard

ONBOARDING (onboarding.js)
  └─► reads:    users/{uid}  (checks onboardingComplete)
  └─► reads:    companyProfiles/{uid}  (checks existence)
  └─► writes:   companyProfiles/{uid}  (full profile + score)
  └─► updates:  users/{uid}  (onboardingComplete=true, complianceScore, companyName)

DASHBOARD (dashboard.js)
  └─► reads:    users/{uid}  (checks onboardingComplete)
  └─► reads:    companyProfiles/{uid}  (displays profile data)
```

---

## Firestore Security Rules

Defined in `firestore.rules`. Deployed via `firebase deploy --only firestore:rules`.

| Collection | Read | Create | Update | Delete |
|---|---|---|---|---|
| `users/{uid}` | Owner only | Owner only | Owner only | **Never** |
| `companyProfiles/{uid}` | Owner only | Owner only | Owner only | **Never** |

- **Owner** = signed-in user whose Auth UID matches the document ID.
- **Delete is disabled** — users cannot delete their own data through the client. Admin deletion would require a Cloud Function or the Firebase console.

---

## Auth Flow & Database Interactions

```
User visits app
  │
  ├─ Not signed in ──────────────► login page
  │
  ├─ Signed in (email/password)
  │   ├─ emailVerified = false ──► verify-email page
  │   └─ emailVerified = true
  │       ├─ onboardingComplete = false ──► onboarding
  │       ├─ onboardingComplete = true, profile exists ──► dashboard
  │       └─ onboardingComplete = true, profile MISSING ──► onboarding (flag cleared)
  │
  └─ Signed in (Google)
      ├─ onboardingComplete = false ──► onboarding
      ├─ onboardingComplete = true, profile exists ──► dashboard
      └─ onboardingComplete = true, profile MISSING ──► onboarding (flag cleared)
```

All routing decisions are handled by the shared `routeUser()` function in `shared/auth-router.js` to prevent redirect loops between pages.

---

## Design Decisions

| Decision | Rationale |
|---|---|
| UID as document ID | Simple 1:1 mapping, no index needed, security rules match trivially |
| `emailVerified` NOT in Firestore | Must stay live from Firebase Auth to prevent stale/contradicting data |
| Denormalised `complianceScore` + `companyName` in `users` | Quick dashboard rendering without a second read (acceptable trade-off for a small app) |
| No `companyId` or `role` fields | Multi-user companies and RBAC don't exist yet — add when built |
| Delete blocked in rules | Compliance data should not be casually destroyed; admin deletion via Cloud Functions if needed |
| `serverTimestamp()` for `createdAt` | Prevents client clock manipulation |
