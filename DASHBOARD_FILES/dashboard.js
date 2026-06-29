import { auth } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { db } from "../firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Beko ComplianceOS - Dashboard ready");
});

// =======================
// PROTECT DASHBOARD
// =======================
function isEmailPasswordUser(user) {
  return user.providerData.some((profile) => profile.providerId === "password");
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../LOGIN_FILES/login.html";
    return;
  }

  if (isEmailPasswordUser(user) && !user.emailVerified) {
    window.location.href = "../VERIFY_FILES/verify-email.html";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.exists() ? userSnap.data() : {};

  if (!userData.onboardingComplete) {
    window.location.href = "../ONBOARDING_FILES/onboarding.html";
    return;
  }

  document.querySelectorAll(".userEmail").forEach((element) => {
    element.textContent = user.email;
  });

  document.querySelectorAll(".userName").forEach((element) => {
    element.textContent = user.displayName || "User";
  });
});

// =======================
// LOGOUT
// =======================
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../LOGIN_FILES/login.html";
});
