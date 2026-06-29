import { auth } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Beko ComplianceOS - Dashboard ready");
});

// =======================
// PROTECT DASHBOARD
// =======================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "../index.html";
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
  window.location.href = "../index.html";
});
