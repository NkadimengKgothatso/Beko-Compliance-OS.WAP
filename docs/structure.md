Beko-Compliance-OS.WAP/
├── .firebaserc
├── .vscode/
│   └── settings.json
├── firebase.js                  ← Firebase init (Auth + Firestore config)
├── firebase.json                ← Firebase CLI/hosting config
├── firestore.rules              ← Firestore security rules
├── DATABASE_SETUP.md            ← Your schema documentation
├── index.html / index.css / index.js
├── manifest.json
├── service-worker.js
├── bg.jpeg
│
├── LOGIN_FILES/
│   ├── login.html
│   ├── login.css
│   └── login.js                 ← signup, login, Google auth, routing
│
├── VERIFY_FILES/
│   ├── verify-email.html
│   ├── verify-email.css
│   └── verify-email.js          ← email verification handling
│
├── ONBOARDING_FILES/
│   ├── onboarding.html
│   ├── onboarding.css
│   └── onboarding.js            ← onboarding wizard, writes companyProfiles
│
├── DASHBOARD_FILES/
│   ├── dashboard.html
│   ├── dashboard.css
│   └── dashboard.js             ← dashboard auth guard + data load
│
├── DOCUMENTS/
│   └── beko_complianceos_desktop_portal.html
│
└── WAP_FILES/
    ├── manifest.json
    └── service-worker.js