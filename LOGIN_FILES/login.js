import { auth, provider, db } from "../firebase.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// =======================
// HELPER FUNCTIONS
// =======================

// unsuccessful login/signup error messages are displayed in a red box at the top-right corner of the screen,
// and disappear after 5 seconds. Successful login/signup messages are displayed in a green box at the top-right corner of the screen,
// and disappear after 3 seconds.

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4757;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
    z-index: 1000;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
  const successDiv = document.createElement("div");
  successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #2ed573;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(46, 213, 115, 0.3);
    z-index: 1000;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;
  successDiv.textContent = message;
  document.body.appendChild(successDiv);
  setTimeout(() => successDiv.remove(), 3000);
}

// FIX (kept from your version): store the original label on the element
// itself the first time we enter the loading state, and restore from
// there, instead of reading textContent after it's already been
// overwritten to "Loading...".
// =======================
// BUTTON LOADING STATE
// =======================
function setButtonLoading(button, isLoading) {
  if (isLoading) {
    if (button.dataset.originalText === undefined) {
      button.dataset.originalText = button.textContent;
    }
    button.disabled = true;
    button.textContent = "Loading...";
    button.style.opacity = "0.7";
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText ?? button.textContent;
    button.style.opacity = "1";
  }
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/* -----------------------------------------------------------
   Where should a signed-in user land?
   Mirrors the same check used in onboarding.js and dashboard.js:
   onboardingComplete AND an actual companyProfiles/{uid} doc, not
   just the flag, so this file, onboarding.js, and dashboard.js can
   never disagree and loop on each other. (Previously this checked
   a companyId field + a "companies" collection that nothing else
   in the app ever wrote to or had Firestore rules for, so it never
   matched and every login took an extra bounce through onboarding
   before onboarding.js's own check sent the user on to the
   dashboard.)
------------------------------------------------------------ */
async function routeAfterAuth(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : null;

  if (userData?.onboardingComplete) {
    const profileSnap = await getDoc(doc(db, "companyProfiles", user.uid));
    if (profileSnap.exists()) {
      window.location.href = "../DASHBOARD_FILES/dashboard.html";
      return;
    }
    // Flag says complete but the company profile doc is missing: clear
    // it so onboarding.js rebuilds it instead of this page looping forever.
    await setDoc(userRef, { onboardingComplete: false }, { merge: true });
  }

  window.location.href = "../ONBOARDING_FILES/onboarding.html";
}


// =======================
// SHOW / HIDE FORMS
// =======================
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

document.getElementById("showSignup").addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.style.transition = "opacity 0.3s ease-out";
  loginForm.style.opacity = "0";
  setTimeout(() => {
    loginForm.style.display = "none";
    signupForm.style.display = "block";
    signupForm.style.opacity = "0";
    setTimeout(() => {
      signupForm.style.transition = "opacity 0.3s ease-in";
      signupForm.style.opacity = "1";
    }, 10);
  }, 300);
});

document.getElementById("showLogin").addEventListener("click", (e) => {
  e.preventDefault();
  signupForm.style.transition = "opacity 0.3s ease-out";
  signupForm.style.opacity = "0";
  setTimeout(() => {
    signupForm.style.display = "none";
    loginForm.style.display = "block";
    loginForm.style.opacity = "0";
    setTimeout(() => {
      loginForm.style.transition = "opacity 0.3s ease-in";
      loginForm.style.opacity = "1";
    }, 10);
  }, 300);
});

signupForm.style.display = "none";
loginForm.style.opacity = "1";


// =======================
// EMAIL LOGIN
// =======================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  if (!email || !password) {
    showError("Please fill in all fields");
    return;
  }

  if (!validateEmail(email)) {
    showError("Please enter a valid email address");
    return;
  }

  if (password.length < 6) {
    showError("Password must be at least 6 characters");
    return;
  }

  setButtonLoading(submitBtn, true);

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    if (!credential.user.emailVerified) {
      showError("Please verify your email before logging in");
      setButtonLoading(submitBtn, false);
      window.location.href = "../VERIFY_FILES/verify-email.html";
      return;
    }

    showSuccess("Login successful! Redirecting...");
    setTimeout(() => {
      routeAfterAuth(credential.user).catch((err) => {
        console.error("Redirect after login failed:", err);
        setButtonLoading(submitBtn, false);
        showError("Signed in, but couldn't load your profile. Check your connection and try again.");
      });
    }, 1000);
  } catch (error) {
    setButtonLoading(submitBtn, false);
    const errorMessages = {
      "auth/user-not-found": "No account found with this email",
      "auth/wrong-password": "Incorrect password",
      "auth/invalid-email": "Invalid email address",
      "auth/user-disabled": "This account has been disabled",
      "auth/too-many-requests": "Too many login attempts. Please try again later"
    };
    showError(errorMessages[error.code] || "Login failed. Please try again");
  }
});


// =======================
// EMAIL SIGNUP
// =======================
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const submitBtn = signupForm.querySelector('button[type="submit"]');

  if (!fullName || !email || !password || !confirmPassword) {
    showError("Please fill in all fields");
    return;
  }

  if (fullName.length < 2) {
    showError("Please enter a valid full name");
    return;
  }

  if (!validateEmail(email)) {
    showError("Please enter a valid email address");
    return;
  }

  if (password.length < 6) {
    showError("Password must be at least 6 characters");
    return;
  }

  if (password !== confirmPassword) {
    showError("Passwords do not match");
    return;
  }

  setButtonLoading(submitBtn, true);

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    await updateProfile(user, {
      displayName: fullName
    });

    // companyId/role/onboardingComplete start empty here and get filled
    // in by onboarding.js once the user finishes the wizard — dashboard.js
    // and onboarding.js's auth guard both depend on these fields existing.
    await setDoc(doc(db, "users", user.uid), {
      fullName: fullName,
      email: email,
      authProvider: "email",
      companyId: null,
      role: null,
      onboardingComplete: false,
      createdAt: serverTimestamp()
    });

    // Fire-and-forget: the account and profile doc are already created,
    // which is the part that actually matters for the redirect. Don't
    // await this — a slow or hung email-send request should never be
    // able to leave the user stuck on "Loading..." forever. Any failure
    // is still visible in the console, and verify-email.html has its own
    // "Resend email" button as a fallback.
    sendEmailVerification(user).catch((error) => {
      console.error("Verification email failed to send:", error);
    });

    showSuccess("Account created! Check your email to verify, then log in.");
    setTimeout(() => {
      window.location.href = "../VERIFY_FILES/verify-email.html";
    }, 1500);

  } catch (error) {
    setButtonLoading(submitBtn, false);
    const errorMessages = {
      "auth/email-already-in-use": "This email is already registered",
      "auth/weak-password": "Password is too weak",
      "auth/invalid-email": "Invalid email address",
      "auth/operation-not-allowed": "Account creation is not available"
    };
    showError(errorMessages[error.code] || "Signup failed. Please try again");
  }
});


// =======================
// GOOGLE LOGIN
// =======================
async function ensureGoogleUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      fullName: user.displayName || "User",
      email: user.email,
      authProvider: "google",
      companyId: null,
      role: null,
      onboardingComplete: false,
      createdAt: serverTimestamp()
    });
  }
}

async function finishGoogleLogin(user) {
  await ensureGoogleUserProfile(user).catch((error) => {
    console.error("Google profile sync failed:", error);
  });

  showSuccess("Google login successful! Redirecting...");
  // Just log here — callers (popup vs redirect) each show their own
  // single error message and handle their own button state, so we
  // don't end up stacking two toasts for the same failure.
  await routeAfterAuth(user).catch((err) => {
    console.error("Redirect after Google login failed:", err);
    throw err;
  });
}

getRedirectResult(auth)
  .then((result) => {
    if (result?.user) {
      return finishGoogleLogin(result.user);
    }
  })
  .catch((error) => {
    console.error("Google redirect login failed:", error);
    showError("Signed in, but couldn't load your profile. Check your connection and try again.");
  });

async function handleGoogleLogin(e) {
  const button = e.target.closest('button');
  setButtonLoading(button, true);

  try {
    const result = await signInWithPopup(auth, provider);
    await finishGoogleLogin(result.user);

  } catch (error) {
    console.error("Google login failed:", error);
    if (error.code === "auth/popup-blocked") {
      showSuccess("Opening Google sign-in...");
      await signInWithRedirect(auth, provider);
      return;
    }

    setButtonLoading(button, false);
    if (error.code === "auth/popup-closed-by-user") {
      // user closed it themselves — no error needed
    } else if (error.message?.includes("offline") || error.code === "unavailable") {
      showError("Signed in, but couldn't load your profile. Check your connection and try again.");
    } else {
      showError("Google login failed. Please try again");
    }
  }
}

document.getElementById("googleLogin").addEventListener("click", handleGoogleLogin);
document.getElementById("googleSignup").addEventListener("click", handleGoogleLogin);