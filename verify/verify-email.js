/**
 * verify-email.js — Email verification handler for Beko ComplianceOS.
 *
 * This page is shown to email/password users after signup. It:
 *   1. Listens for auth state changes — if the user is not logged in,
 *      redirects to the login page.
 *   2. If the user's email is already verified, routes them forward
 *      (onboarding or dashboard) via the shared routeUser().
 *   3. Provides two buttons:
 *      - "I have verified my email" — reloads the auth token and checks.
 *      - "Resend email" — fires another verification email.
 *
 * IMPORTANT: This page does NOT write `emailVerified` to Firestore.
 * That flag lives on the Firebase Auth user object only, so it can
 * never go stale or disagree with Auth's own record.
 */

import { auth } from "../firebase.js";
import { routeUser } from "../shared/auth-router.js";
import { showError } from "../shared/toast.js";

import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// ═══════════════════════════════════════════════
// DOM REFERENCES
// ═══════════════════════════════════════════════
const userEmail    = document.getElementById("userEmail");
const statusDot    = document.getElementById("statusDot");
const statusText   = document.getElementById("statusText");
const checkButton  = document.getElementById("checkVerification");
const resendButton = document.getElementById("resendVerification");
const logoutButton = document.getElementById("logoutBtn");


// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

/** Update the on-page verification status indicator. */
function setStatus(message, isVerified = false) {
  statusText.textContent = message;
  statusDot.classList.toggle("verified", isVerified);
}


// ═══════════════════════════════════════════════
// AUTH STATE LISTENER
// ═══════════════════════════════════════════════
onAuthStateChanged(auth, async (user) => {
  // Not signed in → bounce to login.
  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }

  userEmail.textContent = user.email;

  if (user.emailVerified) {
    // Already verified — route forward immediately.
    setStatus("Email verified. Redirecting...", true);
    try {
      await routeUser(user, "verify");
    } catch (err) {
      console.error("Routing after verification failed:", err);
      setStatus("Verified, but redirect failed. Please try again.");
    }
    return;
  }

  // Waiting for the user to click the link in their email.
  setStatus("Waiting for verification");
});


// ═══════════════════════════════════════════════
// "I HAVE VERIFIED MY EMAIL" BUTTON
// ═══════════════════════════════════════════════
checkButton.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }

  checkButton.disabled    = true;
  checkButton.textContent = "Checking...";

  try {
    // Reload the user token to pick up the updated emailVerified flag.
    await user.reload();

    if (user.emailVerified) {
      setStatus("Email verified. Redirecting...", true);
      await routeUser(user, "verify");
      return;
    }

    setStatus("Not verified yet. Open the link in your email, then check again.");
  } catch (error) {
    console.error("Verification check failed:", error);
    setStatus("We could not check verification. Please try again.");
  } finally {
    checkButton.disabled    = false;
    checkButton.textContent = "I have verified my email";
  }
});


// ═══════════════════════════════════════════════
// "RESEND EMAIL" BUTTON
// ═══════════════════════════════════════════════
resendButton.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }

  resendButton.disabled    = true;
  resendButton.textContent = "Sending...";

  try {
    await sendEmailVerification(user);
    setStatus("Verification email resent. Please check your inbox.");
  } catch (error) {
    console.error("Resend verification failed:", error);
    showError("Could not resend right now. Please wait and try again.");
    setStatus("Could not resend right now. Please wait and try again.");
  } finally {
    resendButton.disabled    = false;
    resendButton.textContent = "Resend email";
  }
});


// ═══════════════════════════════════════════════
// LOGOUT BUTTON
// ═══════════════════════════════════════════════
logoutButton.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../login/login.html";
});
