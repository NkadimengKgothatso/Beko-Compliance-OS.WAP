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
// SHOW / HIDE FORMS
// =======================
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

document.getElementById("showSignup").addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.style.display = "none";
  signupForm.style.display = "block";
});

document.getElementById("showLogin").addEventListener("click", (e) => {
  e.preventDefault();
  signupForm.style.display = "none";
  loginForm.style.display = "block";
});

// default view
signupForm.style.display = "none";


// =======================
// EMAIL LOGIN
// =======================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "../DASHBOARD_FILES/dashboard.html";
  } catch (error) {
    alert(error.message);
  }
});


// =======================
// EMAIL SIGNUP
// =======================
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    // save name to auth profile
    await updateProfile(user, {
      displayName: fullName
    });

    // save user in Firestore
    await setDoc(doc(db, "users", user.uid), {
      fullName: fullName,
      email: email,
      authProvider: "email",
      createdAt: new Date()
    });

    window.location.href = "../DASHBOARD_FILES/dashboard.html";

  } catch (error) {
    alert(error.message);
  }
});


// =======================
// GOOGLE LOGIN
// =======================
async function handleGoogleLogin() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        fullName: user.displayName,
        email: user.email,
        authProvider: "google",
        createdAt: new Date()
      });
    }

    window.location.href = "../DASHBOARD_FILES/dashboard.html";

  } catch (error) {
    alert(error.message);
  }
}

document.getElementById("googleLogin").addEventListener("click", handleGoogleLogin);
document.getElementById("googleSignup").addEventListener("click", handleGoogleLogin);