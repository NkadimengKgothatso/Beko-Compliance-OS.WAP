import { auth, db } from "../firebase.js";
import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const userEmail = document.getElementById("userEmail");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const checkButton = document.getElementById("checkVerification");
const resendButton = document.getElementById("resendVerification");
const logoutButton = document.getElementById("logoutBtn");

function setStatus(message, isVerified = false) {
  statusText.textContent = message;
  statusDot.classList.toggle("verified", isVerified);
}

async function continueAfterVerification(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  const userData = snap.exists() ? snap.data() : {};

  await updateDoc(userRef, {
    emailVerified: true
  });

  if (userData.onboardingComplete) {
    window.location.href = "../DASHBOARD_FILES/dashboard.html";
    return;
  }

  window.location.href = "../ONBOARDING_FILES/onboarding.html";
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../LOGIN_FILES/login.html";
    return;
  }

  userEmail.textContent = user.email;

  if (user.emailVerified) {
    setStatus("Email verified. Preparing onboarding...", true);
    await continueAfterVerification(user);
    return;
  }

  setStatus("Waiting for verification");
});

checkButton.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) {
    window.location.href = "../LOGIN_FILES/login.html";
    return;
  }

  checkButton.disabled = true;
  checkButton.textContent = "Checking...";

  try {
    await user.reload();

    if (user.emailVerified) {
      setStatus("Email verified. Preparing onboarding...", true);
      await continueAfterVerification(user);
      return;
    }

    setStatus("Not verified yet. Open the link in your email, then check again.");
  } catch (error) {
    console.error("Verification check failed:", error);
    setStatus("We could not check verification. Please try again.");
  } finally {
    checkButton.disabled = false;
    checkButton.textContent = "I have verified my email";
  }
});

resendButton.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) {
    window.location.href = "../LOGIN_FILES/login.html";
    return;
  }

  resendButton.disabled = true;
  resendButton.textContent = "Sending...";

  try {
    await sendEmailVerification(user);
    setStatus("Verification email resent. Please check your inbox.");
  } catch (error) {
    console.error("Verification email resend failed:", error);
    setStatus("Could not resend right now. Please wait and try again.");
  } finally {
    resendButton.disabled = false;
    resendButton.textContent = "Resend email";
  }
});

logoutButton.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../LOGIN_FILES/login.html";
});
