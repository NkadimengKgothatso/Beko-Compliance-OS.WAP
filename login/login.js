/**
 * login.js — Email login, signup, Google auth, and password reset
 *            for Beko ComplianceOS.
 *
 * Flow:
 *   1. User fills in login / signup form or clicks "Continue with Google".
 *   2. On success, routeUser() (shared/auth-router.js) decides where to go:
 *        - Unverified email user  → verify-email
 *        - Onboarding incomplete   → onboarding
 *        - Everything done         → dashboard
 *
 * Password reset:
 *   Clicking "Forgot password?" shows a small inline form that calls
 *   Firebase's sendPasswordResetEmail, then shows a success toast.
 */

import { auth, provider, db } from "../firebase.js";
import { routeUser } from "../shared/auth-router.js";
import { showError, showSuccess } from "../shared/toast.js";
import { setButtonLoading } from "../shared/loading.js";
import { isValidEmail, isValidPassword, isNonEmpty } from "../shared/validators.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ═══════════════════════════════════════════════
// CUSTOM EMAIL ACTION URL
// ═══════════════════════════════════════════════

/**
 * Build the action-handler URL on the current domain.
 * This ensures email links go to YOUR branded page instead of
 * Firebase's generic handler.
 */
const ACTION_HANDLER_URL = (() => {
  const base = window.location.origin; // e.g. https://bekocompliance.co.za
  return `${base}/emails/action-handler.html`;
})();


// ═══════════════════════════════════════════════
// DOM REFERENCES
// ═══════════════════════════════════════════════
const loginForm     = document.getElementById("loginForm");
const signupForm    = document.getElementById("signupForm");
const resetForm     = document.getElementById("resetForm");
const showSignupBtn = document.getElementById("showSignup");
const showLoginBtn  = document.getElementById("showLogin");
const showResetLink = document.getElementById("showReset");
const backToLogin   = document.getElementById("backToLogin");


// ═══════════════════════════════════════════════
// FORM SWITCHING  (login ↔ signup ↔ reset)
// ═══════════════════════════════════════════════

/** Fade out the current form, then fade in the target form. */
function switchForm(fromForm, toForm) {
  fromForm.style.transition = "opacity 0.3s ease-out";
  fromForm.style.opacity    = "0";

  setTimeout(() => {
    fromForm.style.display = "none";
    toForm.style.display   = "block";
    toForm.style.opacity   = "0";

    setTimeout(() => {
      toForm.style.transition = "opacity 0.3s ease-in";
      toForm.style.opacity    = "1";
    }, 10);
  }, 300);
}

// Initial state — signup and reset are hidden via inline style in HTML.
loginForm.style.opacity = "1";

showSignupBtn.addEventListener("click", (e) => {
  e.preventDefault();
  switchForm(loginForm, signupForm);
});

showLoginBtn.addEventListener("click", (e) => {
  e.preventDefault();
  switchForm(signupForm, loginForm);
});

showResetLink.addEventListener("click", (e) => {
  e.preventDefault();
  switchForm(loginForm, resetForm);
});

backToLogin.addEventListener("click", (e) => {
  e.preventDefault();
  switchForm(resetForm, loginForm);
});


// ═══════════════════════════════════════════════
// EMAIL LOGIN
// ═══════════════════════════════════════════════
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email     = document.getElementById("email").value.trim();
  const password  = document.getElementById("password").value;
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  // ── Client-side validation ──
  if (!email || !password) {
    showError("Please fill in all fields");
    return;
  }
  if (!isValidEmail(email)) {
    showError("Please enter a valid email address");
    return;
  }
  if (!isValidPassword(password)) {
    showError("Password must be at least 6 characters");
    return;
  }

  setButtonLoading(submitBtn, true);

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    // routeUser handles the verify → onboarding → dashboard decision.
    showSuccess("Login successful! Redirecting...");
    setTimeout(() => {
      routeUser(credential.user, "login").catch((err) => {
        console.error("Routing after login failed:", err);
        setButtonLoading(submitBtn, false);
        showError("Signed in, but couldn't load your profile. Please try again.");
      });
    }, 800);

  } catch (error) {
    setButtonLoading(submitBtn, false);
    const messages = {
      "auth/user-not-found":    "No account found with this email",
      "auth/wrong-password":    "Incorrect password",
      "auth/invalid-email":     "Invalid email address",
      "auth/invalid-credential": "Invalid email or password",
      "auth/user-disabled":     "This account has been disabled",
      "auth/too-many-requests":  "Too many attempts. Please try again later",
    };
    showError(messages[error.code] || "Login failed. Please try again.");
  }
});


// ═══════════════════════════════════════════════
// EMAIL SIGNUP
// ═══════════════════════════════════════════════
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName        = document.getElementById("fullName").value.trim();
  const email           = document.getElementById("signupEmail").value.trim();
  const password        = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const submitBtn       = signupForm.querySelector('button[type="submit"]');

  // ── Client-side validation ──
  if (!fullName || !email || !password || !confirmPassword) {
    showError("Please fill in all fields");
    return;
  }
  if (!isNonEmpty(fullName, 2)) {
    showError("Please enter a valid full name (at least 2 characters)");
    return;
  }
  if (!isValidEmail(email)) {
    showError("Please enter a valid email address");
    return;
  }
  if (!isValidPassword(password)) {
    showError("Password must be at least 6 characters");
    return;
  }
  if (password !== confirmPassword) {
    showError("Passwords do not match");
    return;
  }

  setButtonLoading(submitBtn, true);

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Store display name on the Firebase Auth profile.
    await updateProfile(user, { displayName: fullName });

    // Create the user document in Firestore.
    await setDoc(doc(db, "users", user.uid), {
      fullName,
      email,
      authProvider:       "email",
      onboardingComplete: false,
      createdAt:          serverTimestamp(),
    });

    // Fire-and-forget verification email — a slow or failed send should
    // never leave the user stuck on "Loading…". The verify-email page
    // has its own "Resend" button as a fallback.
    sendEmailVerification(user, {
      url: `${ACTION_HANDLER_URL}?mode=verifyEmail`,
      handleCodeInApp: false,
    }).catch((err) => {
      console.error("Verification email failed to send:", err);
    });

    showSuccess("Account created! Check your email to verify, then log in.");
    setTimeout(() => {
      window.location.href = "../verify/verify-email.html";
    }, 1500);

  } catch (error) {
    setButtonLoading(submitBtn, false);
    const messages = {
      "auth/email-already-in-use": "This email is already registered",
      "auth/weak-password":        "Password is too weak",
      "auth/invalid-email":        "Invalid email address",
      "auth/operation-not-allowed": "Account creation is not available",
    };
    showError(messages[error.code] || "Signup failed. Please try again.");
  }
});


// ═══════════════════════════════════════════════
// PASSWORD RESET
// ═══════════════════════════════════════════════
resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email     = document.getElementById("resetEmail").value.trim();
  const submitBtn = resetForm.querySelector('button[type="submit"]');

  if (!email) {
    showError("Please enter your email address");
    return;
  }
  if (!isValidEmail(email)) {
    showError("Please enter a valid email address");
    return;
  }

  setButtonLoading(submitBtn, true);

  try {
    await sendPasswordResetEmail(auth, email, {
      url: `${ACTION_HANDLER_URL}?mode=resetPassword`,
      handleCodeInApp: false,
    });
    showSuccess("Password reset email sent! Check your inbox.");
    setButtonLoading(submitBtn, false);

    // Return to login form after a short delay.
    setTimeout(() => switchForm(resetForm, loginForm), 2000);

  } catch (error) {
    setButtonLoading(submitBtn, false);
    const messages = {
      "auth/user-not-found": "No account found with this email",
      "auth/invalid-email":  "Invalid email address",
    };
    showError(messages[error.code] || "Could not send reset email. Please try again.");
  }
});


// ═══════════════════════════════════════════════
// GOOGLE SIGN-IN
// ═══════════════════════════════════════════════

/**
 * Ensure a Firestore user document exists for a Google-authenticated user.
 * Creates one on first login; does nothing on subsequent logins.
 */
async function ensureGoogleUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const snap    = await setDoc(userRef, {
    fullName:           user.displayName || "User",
    email:              user.email,
    authProvider:       "google",
    onboardingComplete: false,
    createdAt:          serverTimestamp(),
  }, { merge: true });
}

/**
 * Complete the Google login: sync the user profile, then route.
 */
async function finishGoogleLogin(user) {
  await ensureGoogleUserProfile(user).catch((err) => {
    console.error("Google profile sync failed:", err);
  });

  showSuccess("Google login successful! Redirecting...");
  await routeUser(user, "login").catch((err) => {
    console.error("Routing after Google login failed:", err);
    throw err;
  });
}

// Handle the redirect result from a previous Google sign-in attempt
// that used signInWithRedirect (fallback when popup was blocked).
getRedirectResult(auth)
  .then((result) => {
    if (result?.user) return finishGoogleLogin(result.user);
  })
  .catch((error) => {
    console.error("Google redirect login failed:", error);
    showError("Signed in, but couldn't load your profile. Please try again.");
  });

/**
 * Google login button handler — tries popup first, falls back to redirect.
 */
async function handleGoogleLogin(e) {
  const button = e.target.closest("button");
  setButtonLoading(button, true);

  try {
    const result = await signInWithPopup(auth, provider);
    await finishGoogleLogin(result.user);

  } catch (error) {
    console.error("Google login failed:", error);

    // Popup blocked → fall back to redirect.
    if (error.code === "auth/popup-blocked") {
      showSuccess("Opening Google sign-in...");
      await signInWithRedirect(auth, provider);
      return;
    }

    setButtonLoading(button, false);

    if (error.code === "auth/popup-closed-by-user") {
      // User cancelled — no error toast needed.
    } else if (error.message?.includes("offline") || error.code === "unavailable") {
      showError("Signed in, but couldn't load your profile. Check your connection.");
    } else {
      showError("Google login failed. Please try again.");
    }
  }
}

document.getElementById("googleLogin").addEventListener("click", handleGoogleLogin);
document.getElementById("googleSignup").addEventListener("click", handleGoogleLogin);
