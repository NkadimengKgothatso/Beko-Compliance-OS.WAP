/**
 * toast.js — Lightweight toast notifications for Beko ComplianceOS.
 *
 * Shows a small coloured box in the top-right corner of the screen.
 *   - Errors  → red,  auto-dismiss after 5 s
 *   - Success → green, auto-dismiss after 3 s
 *
 * Usage:
 *   import { showError, showSuccess } from "../shared/toast.js";
 *   showError("Something went wrong");
 *   showSuccess("Saved!");
 */

const BASE_STYLE = `
  position: fixed;
  top: 20px;
  right: 20px;
  color: white;
  padding: 15px 20px;
  border-radius: 8px;
  z-index: 1000;
  max-width: 400px;
  animation: slideIn 0.3s ease-out;
`;

function createToast(message, background, shadowColor, durationMs) {
  const el = document.createElement("div");
  el.style.cssText = `${BASE_STYLE} background: ${background}; box-shadow: 0 4px 12px ${shadowColor};`;
  el.textContent = message;
  el.setAttribute("role", "alert");
  document.body.appendChild(el);
  setTimeout(() => el.remove(), durationMs);
}

/** Display a red error toast (auto-dismiss 5 s). */
export function showError(message) {
  createToast(message, "#ff4757", "rgba(255, 71, 87, 0.3)", 5000);
}

/** Display a green success toast (auto-dismiss 3 s). */
export function showSuccess(message) {
  createToast(message, "#2ed573", "rgba(46, 213, 115, 0.3)", 3000);
}
