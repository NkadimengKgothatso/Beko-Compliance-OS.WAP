/**
 * dashboard.js — Protected dashboard page for Beko ComplianceOS.
 *
 * Auth gate (via shared routeUser):
 *   - Not signed in             → login
 *   - Email user, unverified    → verify-email
 *   - Onboarding incomplete     → onboarding
 *   - Company profile missing   → onboarding
 *   - All good                  → render dashboard
 *
 * Renders the company profile and compliance score from the
 * `companyProfiles/{uid}` Firestore document.
 */

import { auth, db } from "../firebase.js";
import { routeUser } from "../shared/auth-router.js";

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

/** Format a Firestore value for display in the UI. */
function formatValue(value) {
  if (value === undefined || value === null || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Human-readable status label for a compliance score. */
function getScoreStatus(score) {
  if (score >= 80) return "Strong position";
  if (score >= 60) return "Needs attention";
  if (score >= 40) return "Moderate risk";
  return "High risk";
}


// ═══════════════════════════════════════════════
// RENDER COMPANY PROFILE
// ═══════════════════════════════════════════════

/**
 * Populate the dashboard UI with data from the company profile
 * and user documents.
 */
function renderCompanyProfile(profile, userData) {
  const score   = Number(profile.complianceScore ?? userData.complianceScore ?? 0);
  const scoreText = `${score}%`;
  const summary = profile.scoreSummary
    || "Your dashboard is now connected to your company profile.";

  // ── Header ──
  document.getElementById("companyName").textContent =
    profile.businessName || userData.companyName || "Company profile";

  // ── Score section ──
  document.getElementById("scoreStat").textContent     = scoreText;
  document.getElementById("scoreDetail").textContent    = scoreText;
  document.getElementById("scoreProgress").value        = score;
  document.getElementById("scoreProgress").textContent   = scoreText;
  document.getElementById("scoreStatus").textContent     = getScoreStatus(score);
  document.getElementById("scoreSummary").textContent    = summary;
  document.getElementById("scoreStatSummary").textContent = getScoreStatus(score);
  document.getElementById("actionSummary").textContent   =
    score >= 80 ? "Monitor deadlines" : "Review priority tasks";

  // ── Profile details list ──
  document.getElementById("profileList").innerHTML = `
    <li><span>Business type</span><strong>${formatValue(profile.businessType)}</strong></li>
    <li><span>VAT status</span><strong>${formatValue(profile.vatRegistered)}</strong></li>
    <li><span>Employees</span><strong>${formatValue(profile.employees)}</strong></li>
    <li><span>Industry</span><strong>${formatValue(profile.industry)}</strong></li>
  `;
}


// ═══════════════════════════════════════════════
// AUTH STATE LISTENER — access gate + data load
// ═══════════════════════════════════════════════
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }

  // Use the shared router for the email-verification and onboarding
  // gates. If everything checks out it does nothing (we're already
  // on the dashboard), so we continue to render below.
  await routeUser(user, "dashboard");

  // ── Load data ──
  const userSnap    = await getDoc(doc(db, "users", user.uid));
  const userData    = userSnap.exists() ? userSnap.data() : {};
  const profileSnap = await getDoc(doc(db, "companyProfiles", user.uid));

  // Safety net — if the profile is somehow missing, routeUser should
  // have already redirected, but just in case:
  if (!userData.onboardingComplete || !profileSnap.exists()) {
    window.location.href = "../onboarding/onboarding.html";
    return;
  }

  // ── Populate UI ──
  document.querySelectorAll(".userEmail").forEach((el) => {
    el.textContent = user.email;
  });
  document.querySelectorAll(".userName").forEach((el) => {
    el.textContent = user.displayName || "User";
  });

  renderCompanyProfile(profileSnap.data(), userData);
});


// ═══════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../login/login.html";
});
