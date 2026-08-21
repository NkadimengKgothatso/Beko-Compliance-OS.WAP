/**
 * Beko ComplianceOS — UI helpers (toast notifications + button loading)
 */

export function toast(message, type = "error") {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, type === "error" ? 5000 : 3000);
}

export function loading(btn, isLoading) {
  if (isLoading) {
    btn.dataset.text = btn.textContent;
    btn.textContent = "Please wait...";
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.text || "Submit";
    btn.disabled = false;
  }
}
