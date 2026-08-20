/**
 * index.js — Splash-screen logic for Beko ComplianceOS.
 *
 * Displays the welcome/splash screen for 7 seconds, then redirects
 * to the login page. Also registers the service worker for PWA
 * offline support.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Redirect to login after the splash screen.
  setTimeout(() => {
    window.location.href = "login/login.html";
  }, 7000);

  // Register service worker for PWA offline caching.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js")
      .then((reg) => console.log("Service Worker registered", reg))
      .catch((err) => console.log("Service Worker registration failed", err));
  }
});
