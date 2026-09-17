
// Register PWA service worker
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js")
        .catch(err => console.error("Service worker registration failed:", err));
}
setTimeout(()=>window.location.href="/login/login.html",2500);
