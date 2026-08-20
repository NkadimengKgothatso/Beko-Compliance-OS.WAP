/**
 * action-handler.js — Custom Firebase email action handler.
 *
 * This page handles the links users click in their emails:
 *   - Email verification  (?mode=verifyEmail&oobCode=xxx)
 *   - Password reset      (?mode=resetPassword&oobCode=xxx)
 *   - Email recovery      (?mode=recoverEmail&oobCode=xxx)
 *
 * Deploy this to your domain so Firebase can use it as the
 * custom action URL (set in Firebase Console → Auth → Templates).
 */

import { auth } from "../firebase.js";
import {
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
  checkActionCode,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// ═══════════════════════════════════════════════
// PARSE URL PARAMETERS
// ═══════════════════════════════════════════════
const params  = new URLSearchParams(window.location.search);
const mode    = params.get("mode");
const oobCode = params.get("oobCode");

const panel   = document.getElementById("actionPanel");
const title   = document.getElementById("actionTitle");
const message = document.getElementById("actionMessage");
const form    = document.getElementById("resetForm");


// ═══════════════════════════════════════════════
// ROUTE BY MODE
// ═══════════════════════════════════════════════
switch (mode) {
  case "verifyEmail":
    handleVerifyEmail(oobCode);
    break;
  case "resetPassword":
    handlePasswordReset(oobCode);
    break;
  case "recoverEmail":
    handleRecoverEmail(oobCode);
    break;
  default:
    showError("Invalid or expired link", "This link is not valid. Please request a new one.");
}


// ═══════════════════════════════════════════════
// EMAIL VERIFICATION
// ═══════════════════════════════════════════════
async function handleVerifyEmail(code) {
  try {
    await applyActionCode(auth, code);
    showSuccess(
      "Email verified!",
      "Your email has been confirmed. You can now sign in to your account.",
      "../login/login.html"
    );
  } catch (error) {
    console.error("Email verification failed:", error);
    showError(
      "Verification failed",
      "This link may have expired or already been used. Please sign in and request a new verification email."
    );
  }
}


// ═══════════════════════════════════════════════
// PASSWORD RESET
// ═══════════════════════════════════════════════
async function handlePasswordReset(code) {
  try {
    // Verify the code is valid before showing the form.
    const email = await verifyPasswordResetCode(auth, code);
    document.getElementById("resetEmail").textContent = email;
    form.style.display = "block";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPassword    = document.getElementById("newPassword").value;
      const confirmPassword = document.getElementById("confirmNewPassword").value;

      if (newPassword.length < 6) {
        setFormError("Password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setFormError("Passwords do not match.");
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Resetting...";

      try {
        await confirmPasswordReset(auth, code, newPassword);
        form.style.display = "none";
        showSuccess(
          "Password reset!",
          "Your password has been changed. You can now sign in with your new password.",
          "../login/login.html"
        );
      } catch (error) {
        console.error("Password reset failed:", error);
        submitBtn.disabled = false;
        submitBtn.textContent = "Reset Password";
        setFormError("Could not reset password. The link may have expired.");
      }
    });

  } catch (error) {
    console.error("Invalid reset code:", error);
    showError(
      "Invalid or expired link",
      "This password reset link has expired or already been used. Please request a new one from the login page."
    );
  }
}


// ═══════════════════════════════════════════════
// EMAIL RECOVERY
// ═══════════════════════════════════════════════
async function handleRecoverEmail(code) {
  try {
    const info = await checkActionCode(auth, code);
    await applyActionCode(auth, code);
    showSuccess(
      "Email recovered!",
      `Your email has been restored to ${info.data.email}. You can now sign in.`,
      "../login/login.html"
    );
  } catch (error) {
    console.error("Email recovery failed:", error);
    showError(
      "Recovery failed",
      "This recovery link has expired or already been used."
    );
  }
}


// ═══════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════
function showSuccess(heading, text, redirectUrl) {
  panel.className = "panel success";
  title.textContent   = heading;
  message.textContent = text;
  form.style.display  = "none";

  if (redirectUrl) {
    const btn = document.createElement("a");
    btn.href = redirectUrl;
    btn.className = "action-btn";
    btn.textContent = "Go to Login";
    panel.appendChild(btn);
  }
}

function showError(heading, text) {
  panel.className = "panel error";
  title.textContent   = heading;
  message.textContent = text;
  form.style.display  = "none";

  const btn = document.createElement("a");
  btn.href = "../login/login.html";
  btn.className = "action-btn secondary";
  btn.textContent = "Back to Login";
  panel.appendChild(btn);
}

function setFormError(text) {
  let el = document.getElementById("formError");
  if (!el) {
    el = document.createElement("p");
    el.id = "formError";
    el.style.cssText = "color:#DC2626; font-size:13px; margin:0;";
    form.prepend(el);
  }
  el.textContent = text;
}
