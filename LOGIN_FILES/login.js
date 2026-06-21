import { auth, provider, db } from "../firebase.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc
} from "firebase/firestore";


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

function setButtonLoading(button, isLoading) {
  const originalText = button.textContent;
  if (isLoading) {
    button.disabled = true;
    button.textContent = "Loading...";
    button.style.opacity = "0.7";
  } else {
    button.disabled = false;
    button.textContent = originalText;
    button.style.opacity = "1";
  }
  return originalText;
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


// =======================
// SHOW / HIDE FORMS
// =======================
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

document.getElementById("showSignup").addEventListener("click", (e) => {
  e.preventDefault();
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
  loginForm.style.transition = "opacity 0.3s ease-out";
});

document.getElementById("showLogin").addEventListener("click", (e) => {
  e.preventDefault();
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
  signupForm.style.transition = "opacity 0.3s ease-out";
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
    await signInWithEmailAndPassword(auth, email, password);
    showSuccess("Login successful! Redirecting...");
    setTimeout(() => {
      window.location.href = "../DASHBOARD_FILES/dashboard.html";
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

    await setDoc(doc(db, "users", user.uid), {
      fullName: fullName,
      email: email,
      authProvider: "email",
      createdAt: new Date()
    });

    showSuccess("Account created successfully! Redirecting...");
    setTimeout(() => {
      window.location.href = "../DASHBOARD_FILES/dashboard.html";
    }, 1000);

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
async function handleGoogleLogin(e) {
  const button = e.target.closest('button');
  setButtonLoading(button, true);

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        fullName: user.displayName || "User",
        email: user.email,
        authProvider: "google",
        createdAt: new Date()
      });
    }

    showSuccess("Google login successful! Redirecting...");
    setTimeout(() => {
      window.location.href = "../DASHBOARD_FILES/dashboard.html";
    }, 1000);

  } catch (error) {
    setButtonLoading(button, false);
    if (error.code !== "auth/popup-closed-by-user") {
      showError("Google login failed. Please try again");
    }
  }
}

document.getElementById("googleLogin").addEventListener("click", handleGoogleLogin);
document.getElementById("googleSignup").addEventListener("click", handleGoogleLogin);