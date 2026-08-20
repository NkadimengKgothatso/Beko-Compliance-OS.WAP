/**
 * loading.js — Button loading-state helper for Beko ComplianceOS.
 *
 * Stores the button's original label in a data-attribute the first time
 * it enters the loading state, and restores from there on release. This
 * avoids the old bug where the label was read from textContent *after* it
 * had already been overwritten with "Loading...".
 *
 * Usage:
 *   import { setButtonLoading } from "../shared/loading.js";
 *   setButtonLoading(submitBtn, true);   // → "Loading…", disabled
 *   setButtonLoading(submitBtn, false);  // → original label restored
 */

export function setButtonLoading(button, isLoading) {
  if (isLoading) {
    // Capture the real label only once.
    if (button.dataset.originalText === undefined) {
      button.dataset.originalText = button.textContent;
    }
    button.disabled    = true;
    button.textContent = "Loading...";
    button.style.opacity = "0.7";
  } else {
    button.disabled    = false;
    button.textContent = button.dataset.originalText ?? button.textContent;
    button.style.opacity = "1";
  }
}
