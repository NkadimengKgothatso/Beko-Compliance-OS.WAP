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
- `authProvider`
- `emailVerified`
- `onboardingComplete`
- `companyName`
- `complianceScore`
- `createdAt`
- `updatedAt`

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
