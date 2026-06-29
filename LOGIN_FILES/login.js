import { auth, provider, db } from "../firebase.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendEmailVerification,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// =======================
// HELPER FUNCTIONS
// =======================
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

// FIX: previously this captured `button.textContent` *after* it had already
// been overwritten to "Loading...", so re-enabling the button on error left
// the label stuck on "Loading...". We now store the original label on the
// element itself (dataset) the first time we enter the loading state, and
// restore from there.
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

function isEmailPasswordUser(user) {
  return user.providerData.some((profile) => profile.providerId === "password");
}

async function routeAfterAuth(user) {
  if (isEmailPasswordUser(user) && !user.emailVerified) {
    window.location.href = "../VERIFY_FILES/verify-email.html";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.exists() ? userSnap.data() : {};

  if (userData.onboardingComplete) {
    window.location.href = "../DASHBOARD_FILES/dashboard.html";
    return;
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
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    showSuccess("Login successful! Redirecting...");
    await routeAfterAuth(userCredential.user);
  } catch (error) {
    console.error("Login failed:", error);
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

    await setDoc(doc(db, "users", user.uid), {
      fullName: fullName,
      email: email,
      authProvider: "email",
      emailVerified: false,
      onboardingComplete: false,
      createdAt: new Date()
    });

    await sendEmailVerification(user);

    showSuccess("Verification email sent. Please check your inbox.");
    window.location.href = "../VERIFY_FILES/verify-email.html";

  } catch (error) {
    console.error("Signup failed:", error);
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
      emailVerified: user.emailVerified,
      onboardingComplete: false,
      createdAt: new Date()
    });
  }
}

async function finishGoogleLogin(user) {
  await ensureGoogleUserProfile(user);
  showSuccess("Google login successful!");
  await routeAfterAuth(user);
}

getRedirectResult(auth)
  .then((result) => {
    if (result?.user) {
      finishGoogleLogin(result.user);
    }
  })
  .catch((error) => {
    console.error("Google redirect login failed:", error);
    showError("Google login failed. Please try again");
  });

async function handleGoogleLogin(e) {
  const button = e.target.closest('button');
  setButtonLoading(button, true);

  try {
    const result = await signInWithPopup(auth, provider);
    finishGoogleLogin(result.user);

  } catch (error) {
    console.error("Google login failed:", error);
    if (error.code === "auth/popup-blocked") {
      showSuccess("Opening Google sign-in...");
      await signInWithRedirect(auth, provider);
      return;
    }

    setButtonLoading(button, false);
    if (error.code !== "auth/popup-closed-by-user") {
      showError("Google login failed. Please try again");
    }
  }
}

document.getElementById("googleLogin").addEventListener("click", handleGoogleLogin);
document.getElementById("googleSignup").addEventListener("click", handleGoogleLogin);
