import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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

function formatValue(value) {
  if (value === undefined || value === null || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getScoreStatus(score) {
  if (score >= 80) return "Strong position";
  if (score >= 60) return "Needs attention";
  if (score >= 40) return "Moderate risk";
  return "High risk";
}

function renderCompanyProfile(profile, userData) {
  const score = Number(profile.complianceScore ?? userData.complianceScore ?? 0);
  const scoreText = `${score}%`;
  const summary = profile.scoreSummary || "Your dashboard is now connected to your Firestore company profile.";

  document.getElementById("companyName").textContent = profile.businessName || userData.companyName || "Company profile";
  document.getElementById("scoreStat").textContent = scoreText;
  document.getElementById("scoreDetail").textContent = scoreText;
  document.getElementById("scoreProgress").value = score;
  document.getElementById("scoreProgress").textContent = scoreText;
  document.getElementById("scoreStatus").textContent = getScoreStatus(score);
  document.getElementById("scoreSummary").textContent = summary;
  document.getElementById("scoreStatSummary").textContent = getScoreStatus(score);
  document.getElementById("actionSummary").textContent = score >= 80 ? "Monitor deadlines" : "Review priority tasks";

  document.getElementById("profileList").innerHTML = `
    <li><span>Business type</span><strong>${formatValue(profile.businessType)}</strong></li>
    <li><span>VAT status</span><strong>${formatValue(profile.vatRegistered)}</strong></li>
    <li><span>Employees</span><strong>${formatValue(profile.employees)}</strong></li>
    <li><span>Industry</span><strong>${formatValue(profile.industry)}</strong></li>
  `;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../LOGIN_FILES/login.html";
    return;
  }

  // TEMPORARILY DISABLED: email verification gate (paired with login.js
  // and onboarding.js). Re-enable all three together when verification
  // comes back into the flow.
  // if (isEmailPasswordUser(user) && !user.emailVerified) {
  //   window.location.href = "../VERIFY_FILES/verify-email.html";
  //   return;
  // }

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const userData = userSnap.exists() ? userSnap.data() : {};
  const profileSnap = await getDoc(doc(db, "companyProfiles", user.uid));

  if (!userData.onboardingComplete) {
    window.location.href = "../ONBOARDING_FILES/onboarding.html";
    return;
  }

  if (!profileSnap.exists()) {
    window.location.href = "../ONBOARDING_FILES/onboarding.html";
    return;
  }

  document.querySelectorAll(".userEmail").forEach((element) => {
    element.textContent = user.email;
  });

  document.querySelectorAll(".userName").forEach((element) => {
    element.textContent = user.displayName || "User";
  });

  renderCompanyProfile(profileSnap.data(), userData);
});

// =======================
// LOGOUT
// =======================
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../LOGIN_FILES/login.html";
});