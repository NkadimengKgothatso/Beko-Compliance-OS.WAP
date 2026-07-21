import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const steps = [...document.querySelectorAll(".step")];
const journeyItems = [...document.querySelectorAll(".journey li")];
const form = document.getElementById("onboardingForm");
const backButton = document.getElementById("backBtn");
const nextButton = document.getElementById("nextBtn");
const finishButton = document.getElementById("finishBtn");
const stepLabel = document.getElementById("stepLabel");
const progressBar = document.getElementById("progressBar");
const scorePreview = document.getElementById("scorePreview");
const scoreSummary = document.getElementById("scoreSummary");

let currentStep = 0;
let currentUser = null;

function isEmailPasswordUser(user) {
  return user.providerData.some((profile) => profile.providerId === "password");
}

function getProfileData() {
  return {
    businessName: document.getElementById("businessName").value.trim(),
    businessType: document.getElementById("businessType").value,
    registrationNumber: document.getElementById("registrationNumber").value.trim(),
    province: document.getElementById("province").value,
    vatRegistered: document.getElementById("vatRegistered").value,
    employees: Number(document.getElementById("employees").value || 0),
    industry: document.getElementById("industry").value,
    monthlyRevenue: document.getElementById("monthlyRevenue").value,
    lastTaxFiling: document.getElementById("lastTaxFiling").value,
    hasRecords: document.getElementById("hasRecords").checked
  };
}

function calculateComplianceScore(profile) {
  let score = 45;

  if (profile.businessName) score += 5;
  if (profile.businessType) score += 5;
  if (profile.businessType === "sole-proprietor" || profile.registrationNumber) score += 8;
  if (profile.province) score += 5;
  if (profile.vatRegistered === "yes") score += 7;
  if (profile.vatRegistered === "unsure") score -= 5;
  if (profile.employees > 0) score += 5;
  if (profile.industry) score += 5;
  if (profile.monthlyRevenue) score += 5;
  if (profile.lastTaxFiling === "current") score += 10;
  if (profile.lastTaxFiling === "recent") score += 5;
  if (profile.lastTaxFiling === "late") score -= 8;
  if (profile.lastTaxFiling === "never") score -= 12;
  if (profile.hasRecords) score += 10;

  return Math.max(0, Math.min(100, score));
}

function getScoreSummary(score) {
  if (score >= 80) return "Strong start. Your dashboard will focus on upcoming deadlines and maintenance.";
  if (score >= 60) return "Good foundation. Your dashboard will prioritise a few important gaps.";
  if (score >= 40) return "Moderate risk. Your dashboard will start with urgent compliance basics.";
  return "High risk. Your dashboard will focus on stabilising core compliance obligations.";
}

function updateScorePreview() {
  const score = calculateComplianceScore(getProfileData());
  scorePreview.textContent = `${score}%`;
  scoreSummary.textContent = getScoreSummary(score);
}

function showStep(index) {
  currentStep = index;

  steps.forEach((step, stepIndex) => {
    step.classList.toggle("active", stepIndex === currentStep);
  });

  journeyItems.forEach((item, itemIndex) => {
    item.classList.toggle("active", itemIndex <= currentStep);
  });

  stepLabel.textContent = `Step ${currentStep + 1} of ${steps.length}`;
  progressBar.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
  backButton.disabled = currentStep === 0;
  nextButton.style.display = currentStep === steps.length - 1 ? "none" : "inline-block";
  finishButton.style.display = currentStep === steps.length - 1 ? "inline-block" : "none";

  if (currentStep === steps.length - 1) {
    updateScorePreview();
  }
}

function validateCurrentStep() {
  const fields = [...steps[currentStep].querySelectorAll("input, select")];
  const firstInvalid = fields.find((field) => !field.checkValidity());

  if (firstInvalid) {
    firstInvalid.reportValidity();
    return false;
  }

  return true;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../LOGIN_FILES/login.html";
    return;
  }

  // TEMPORARILY DISABLED: email verification gate (paired with the same
  // change in login.js). Re-enable when verification comes back — this
  // was the actual reason onboarding was unreachable after signup: every
  // new email/password user is unverified by definition, so this line
  // bounced them straight back out to verify-email.html before the
  // wizard could ever render.
  // if (isEmailPasswordUser(user) && !user.emailVerified) {
  //   window.location.href = "../VERIFY_FILES/verify-email.html";
  //   return;
  // }

  currentUser = user;
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  // Only bounce to the dashboard if onboarding is complete AND a company
  // profile actually exists. Checking onboardingComplete alone caused an
  // infinite redirect loop with dashboard.js whenever the two documents
  // were out of sync (e.g. a previous save that set the flag but never
  // wrote the profile) — dashboard.js would see no profile and send the
  // user back here, and this check would immediately send them back to
  // the dashboard again, forever.
  if (snap.exists() && snap.data().onboardingComplete) {
    const profileSnap = await getDoc(doc(db, "companyProfiles", user.uid));
    if (profileSnap.exists()) {
      window.location.href = "../DASHBOARD_FILES/dashboard.html";
      return;
    }
    // Profile is missing despite the flag being set: clear the stale flag
    // so the user can complete onboarding again instead of looping.
    await setDoc(userRef, { onboardingComplete: false }, { merge: true });
  }
});

nextButton.addEventListener("click", () => {
  if (!validateCurrentStep()) return;
  showStep(Math.min(currentStep + 1, steps.length - 1));
});

backButton.addEventListener("click", () => {
  showStep(Math.max(currentStep - 1, 0));
});

form.addEventListener("input", () => {
  if (currentStep === steps.length - 1) {
    updateScorePreview();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  finishButton.disabled = true;
  finishButton.textContent = "Generating...";

  const profile = getProfileData();
  const complianceScore = calculateComplianceScore(profile);

  try {
    await setDoc(doc(db, "companyProfiles", currentUser.uid), {
      ...profile,
      ownerUid: currentUser.uid,
      complianceScore,
      scoreSummary: getScoreSummary(complianceScore),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await setDoc(doc(db, "users", currentUser.uid), {
      onboardingComplete: true,
      complianceScore,
      companyName: profile.businessName,
      updatedAt: new Date()
    }, { merge: true });

    window.location.href = "../DASHBOARD_FILES/dashboard.html";
  } catch (error) {
    console.error("Onboarding save failed:", error);
    finishButton.disabled = false;
    finishButton.textContent = "Generate dashboard";
    alert("We could not save your onboarding profile. Please try again.");
  }
});

showStep(0);