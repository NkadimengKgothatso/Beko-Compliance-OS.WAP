/**
 * onboarding.js — Multi-step onboarding wizard for Beko ComplianceOS.
 *
 * Collects business profile information from the user and writes it to
 * the `companyProfiles/{uid}` collection in Firestore. On completion:
 *   1. Sets `onboardingComplete: true` on the user document.
 *   2. Calculates a compliance score.
 *   3. Redirects to the dashboard.
 *
 * Auth gate:
 *   - Not signed in → login page.
 *   - Email/password user with unverified email → verify-email page
 *     (enforced via the shared routeUser()).
 *   - onboardingComplete + company profile exists → dashboard
 *     (prevents re-doing onboarding).
 */

import { auth, db } from "../firebase.js";
import { routeUser } from "../shared/auth-router.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ═══════════════════════════════════════════════
// DOM REFERENCES
// ═══════════════════════════════════════════════
const steps        = [...document.querySelectorAll(".step")];
const journeyItems = [...document.querySelectorAll(".journey li")];
const form         = document.getElementById("onboardingForm");
const backButton   = document.getElementById("backBtn");
const nextButton   = document.getElementById("nextBtn");
const finishButton = document.getElementById("finishBtn");
const stepLabel    = document.getElementById("stepLabel");
const progressBar  = document.getElementById("progressBar");
const scorePreview = document.getElementById("scorePreview");
const scoreSummary = document.getElementById("scoreSummary");

let currentStep = 0;
let currentUser = null;


// ═══════════════════════════════════════════════
// PROFILE DATA COLLECTION
// ═══════════════════════════════════════════════

/** Gather all form fields into a plain object. */
function getProfileData() {
  return {
    businessName:       document.getElementById("businessName").value.trim(),
    businessType:       document.getElementById("businessType").value,
    registrationNumber: document.getElementById("registrationNumber").value.trim(),
    province:           document.getElementById("province").value,
    vatRegistered:      document.getElementById("vatRegistered").value,
    employees:          Number(document.getElementById("employees").value || 0),
    industry:           document.getElementById("industry").value,
    monthlyRevenue:     document.getElementById("monthlyRevenue").value,
    lastTaxFiling:      document.getElementById("lastTaxFiling").value,
    hasRecords:         document.getElementById("hasRecords").checked,
  };
}


// ═══════════════════════════════════════════════
// COMPLIANCE SCORE CALCULATION
// ═══════════════════════════════════════════════

/**
 * Calculate a 0–100 compliance score based on the onboarding profile.
 *
 * Starts at a base of 45 and adds/subtracts points for each field.
 * Clamped to [0, 100] at the end.
 */
function calculateComplianceScore(profile) {
  let score = 45;

  if (profile.businessName)                                  score += 5;
  if (profile.businessType)                                  score += 5;
  if (profile.businessType === "sole-proprietor"
      || profile.registrationNumber)                         score += 8;
  if (profile.province)                                      score += 5;
  if (profile.vatRegistered === "yes")                       score += 7;
  if (profile.vatRegistered === "unsure")                    score -= 5;
  if (profile.employees > 0)                                 score += 5;
  if (profile.industry)                                      score += 5;
  if (profile.monthlyRevenue)                                score += 5;
  if (profile.lastTaxFiling === "current")                   score += 10;
  if (profile.lastTaxFiling === "recent")                    score += 5;
  if (profile.lastTaxFiling === "late")                      score -= 8;
  if (profile.lastTaxFiling === "never")                     score -= 12;
  if (profile.hasRecords)                                    score += 10;

  return Math.max(0, Math.min(100, score));
}

/** Human-readable summary for a given score range. */
function getScoreSummary(score) {
  if (score >= 80) return "Strong start. Your dashboard will focus on upcoming deadlines and maintenance.";
  if (score >= 60) return "Good foundation. Your dashboard will prioritise a few important gaps.";
  if (score >= 40) return "Moderate risk. Your dashboard will start with urgent compliance basics.";
  return "High risk. Your dashboard will focus on stabilising core compliance obligations.";
}


// ═══════════════════════════════════════════════
// STEP NAVIGATION
// ═══════════════════════════════════════════════

/** Show the step at the given index and update all UI indicators. */
function showStep(index) {
  currentStep = index;

  steps.forEach((step, i)  => step.classList.toggle("active", i === currentStep));
  journeyItems.forEach((item, i) => item.classList.toggle("active", i <= currentStep));

  stepLabel.textContent   = `Step ${currentStep + 1} of ${steps.length}`;
  progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
  backButton.disabled     = currentStep === 0;

  // Show/hide Next vs Finish based on position.
  nextButton.style.display   = currentStep === steps.length - 1 ? "none" : "inline-block";
  finishButton.style.display = currentStep === steps.length - 1 ? "inline-block" : "none";

  // Update the live score preview on the final step.
  if (currentStep === steps.length - 1) updateScorePreview();
}

/** Validate all inputs in the current step before advancing. */
function validateCurrentStep() {
  const fields     = [...steps[currentStep].querySelectorAll("input, select")];
  const firstInvalid = fields.find((field) => !field.checkValidity());

  if (firstInvalid) {
    firstInvalid.reportValidity();
    return false;
  }
  return true;
}

function updateScorePreview() {
  const score = calculateComplianceScore(getProfileData());
  scorePreview.textContent = `${score}%`;
  scoreSummary.textContent = getScoreSummary(score);
}


// ═══════════════════════════════════════════════
// AUTH STATE LISTENER — access gate
// ═══════════════════════════════════════════════
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }

  currentUser = user;

  // Use the shared router — it handles email verification, onboarding
  // state, and the company-profile existence check in one place.
  // We pass "onboarding" so it won't redirect back to this page.
  await routeUser(user, "onboarding");
});


// ═══════════════════════════════════════════════
// BUTTON EVENTS
// ═══════════════════════════════════════════════
nextButton.addEventListener("click", () => {
  if (!validateCurrentStep()) return;
  showStep(Math.min(currentStep + 1, steps.length - 1));
});

backButton.addEventListener("click", () => {
  showStep(Math.max(currentStep - 1, 0));
});

// Live-update the score preview as the user types on the final step.
form.addEventListener("input", () => {
  if (currentStep === steps.length - 1) updateScorePreview();
});


// ═══════════════════════════════════════════════
// FORM SUBMISSION — save profile to Firestore
// ═══════════════════════════════════════════════
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  finishButton.disabled    = true;
  finishButton.textContent = "Generating...";

  const profile        = getProfileData();
  const complianceScore = calculateComplianceScore(profile);

  try {
    // 1. Write the company profile document.
    await setDoc(doc(db, "companyProfiles", currentUser.uid), {
      ...profile,
      ownerUid:        currentUser.uid,
      complianceScore,
      scoreSummary:    getScoreSummary(complianceScore),
      createdAt:       new Date(),
      updatedAt:       new Date(),
    });

    // 2. Update the user document with onboarding-complete flag.
    await setDoc(doc(db, "users", currentUser.uid), {
      onboardingComplete: true,
      complianceScore,
      companyName:        profile.businessName,
      updatedAt:          new Date(),
    }, { merge: true });

    // 3. Go to the dashboard.
    window.location.href = "../dashboard/dashboard.html";

  } catch (error) {
    console.error("Onboarding save failed:", error);
    finishButton.disabled    = false;
    finishButton.textContent = "Generate dashboard";
    alert("We could not save your onboarding profile. Please try again.");
  }
});


// ═══════════════════════════════════════════════
// INITIALISE
// ═══════════════════════════════════════════════
showStep(0);
