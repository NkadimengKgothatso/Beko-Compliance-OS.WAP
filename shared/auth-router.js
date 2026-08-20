/**
 * auth-router.js — Shared authentication routing for Beko ComplianceOS.
 *
 * Every page that needs to decide "where should this user go?" imports
 * routeUser() from this module instead of duplicating the same Firestore
 * lookups and redirect logic. This prevents the three-way redirect loops
 * that previously happened when login.js, onboarding.js, and dashboard.js
 * each had their own slightly different version of the same check.
 *
 * Routing rules (evaluated in order):
 *   1. Not signed in           → login page
 *   2. Email user, unverified  → verify-email page
 *   3. onboardingComplete=true AND companyProfiles/{uid} exists → dashboard
 *   4. Everything else         → onboarding
 *
 * Callers pass their current page ("login", "verify", "onboarding",
 * "dashboard") so we never redirect back to the page the user is already
 * on — that's what caused the old infinite loops.
 */

import { db } from "../firebase.js";
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ──────────────────────────────────────────────
// Page path map — keeps all relative paths in one
// place so a folder rename only breaks things here.
// ──────────────────────────────────────────────
const PAGES = {
  login:      "../login/login.html",
  verify:     "../verify/verify-email.html",
  onboarding: "../onboarding/onboarding.html",
  dashboard:  "../dashboard/dashboard.html",
};


/**
 * Returns true when the user signed in with email/password (as opposed
 * to Google or another federated provider). Only email/password users
 * need the Firebase email-verification gate.
 */
export function isEmailPasswordUser(user) {
  return user.providerData.some((p) => p.providerId === "password");
}


/**
 * Decide where a signed-in user should land and navigate there.
 *
 * @param {import("firebase/auth").User} user  – The Firebase Auth user object.
 * @param {string} currentPage – One of "login" | "verify" | "onboarding" | "dashboard".
 * @returns {Promise<void>}
 */
export async function routeUser(user, currentPage) {
  // ── 1. Email verification gate ──────────────
  // Only applies to email/password users; Google users are pre-verified.
  if (isEmailPasswordUser(user) && !user.emailVerified && currentPage !== "verify") {
    navigate("verify");
    return;
  }

  // ── 2. Read the user doc ────────────────────
  const userRef  = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : null;

  // ── 3. Check onboarding + company profile ───
  if (userData?.onboardingComplete) {
    const profileSnap = await getDoc(doc(db, "companyProfiles", user.uid));

    if (profileSnap.exists()) {
      // Everything is in order — go to the dashboard (unless we're
      // already there, in which case do nothing).
      if (currentPage !== "dashboard") navigate("dashboard");
      return;
    }

    // Flag says "done" but the company profile doc is missing.
    // Clear the stale flag so onboarding can rebuild it.
    await setDoc(userRef, { onboardingComplete: false }, { merge: true });
  }

  // ── 4. Default: send to onboarding ──────────
  if (currentPage !== "onboarding") navigate("onboarding");
}


/** Simple redirect helper — wrapped so it's easy to mock in tests. */
function navigate(page) {
  window.location.href = PAGES[page];
}
