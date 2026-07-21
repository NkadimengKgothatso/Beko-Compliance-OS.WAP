# Beko ComplianceOS Firestore Setup

The app is connected to the Firebase project configured in `firebase.js`.

## Collections

Firestore creates collections automatically when the first document is written.

### `users`

Document ID: Firebase Auth user UID.

Created during signup or Google login.

Fields:

- `fullName`
- `email`
- `authProvider` (`"email"` or `"google"`)
- `onboardingComplete`
- `createdAt`
- `complianceScore` (set once onboarding is completed)
- `companyName` (set once onboarding is completed)
- `updatedAt` (set once onboarding is completed)

Note: `emailVerified` is intentionally NOT stored here — it's read live off
the Firebase Auth user object (`user.emailVerified`) instead, so it can
never go stale. `companyId` and `role` were removed (Jul 2026) as unused
fields; re-add them if multi-user companies or role-based permissions get
built.

### `companyProfiles`

Document ID: Firebase Auth user UID.

Created after onboarding is completed.

Fields:

- `ownerUid`
- `businessName`
- `businessType`
- `registrationNumber`
- `province`
- `vatRegistered`
- `employees`
- `industry`
- `monthlyRevenue`
- `lastTaxFiling`
- `hasRecords`
- `complianceScore`
- `scoreSummary`
- `createdAt`
- `updatedAt`

## Deploy Firestore Rules

Install and sign in to Firebase CLI, then run:

```bash
firebase login
firebase deploy --only firestore:rules
```

The rules in `firestore.rules` allow signed-in users to read and write only their own documents in `users/{uid}` and `companyProfiles/{uid}`.