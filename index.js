document.addEventListener("DOMContentLoaded", () => {
  // Redirect after 7s
  setTimeout(() => {
    window.location.href = "login.html";
  }, 7000);

  // Register service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js")
      .then(reg => console.log("Service Worker registered", reg))
      .catch(err => console.log("Service Worker registration failed", err));
  }
});