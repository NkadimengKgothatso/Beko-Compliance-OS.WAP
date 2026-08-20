/**
 * firebase.js — Firebase initialisation for Beko ComplianceOS.
 *
 * Initialises the Firebase app and exports the three services used
 * across the application:
 *
 *   auth     – Firebase Auth  (email/password + Google sign-in)
 *   provider – GoogleAuthProvider instance
 *   db       – Cloud Firestore (with long-polling fallback)
 *
 * The `experimentalAutoDetectLongPolling` flag on Firestore fixes
 * "Failed to get document because the client is offline" errors that
 * occur when a proxy, VPN, or browser extension blocks Firestore's
 * default WebChannel connection while still allowing plain HTTPS
 * requests (like Firebase Auth) through.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ──────────────────────────────────────────────
// Firebase project configuration
// ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyCqXFQX_b9raMCI0pm38YAs6XPu2h0Hy1g",
  authDomain:        "beko-compliance-os.firebaseapp.com",
  projectId:         "beko-compliance-os",
  storageBucket:     "beko-compliance-os.firebasestorage.app",
  messagingSenderId: "1039501158473",
  appId:             "1:1039501158473:web:5f87d3e77c84185d077798",
  measurementId:     "G-M9L03EE548",
};

const app = initializeApp(firebaseConfig);


// ──────────────────────────────────────────────
// Exported services
// ──────────────────────────────────────────────

/** Firebase Auth instance. */
export const auth = getAuth(app);

/** Google sign-in provider — used by login.js for "Continue with Google". */
export const provider = new GoogleAuthProvider();

/** Firestore database instance with automatic long-polling fallback. */
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
});
