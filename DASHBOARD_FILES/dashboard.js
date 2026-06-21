// Placeholder for future interactivity
// Example: console log when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Beko ComplianceOS — Dashboard ready');
});








import { auth } from "../firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";

// =======================
// PROTECT DASHBOARD
// =======================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // not logged in → send back to login page
    window.location.href = "index.html";
  } else {
    // user is logged in → you can use user info
    document.getElementById("userEmail").textContent = user.email;

    if (user.displayName) {
      document.getElementById("userName").textContent = user.displayName;
    }
  }
});


// =======================
// LOGOUT
// =======================
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});