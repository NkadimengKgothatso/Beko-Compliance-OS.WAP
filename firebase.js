import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCqXFQX_b9raMCI0pm38YAs6XPu2h0Hy1g",
  authDomain: "beko-compliance-os.firebaseapp.com",
  projectId: "beko-compliance-os",
  storageBucket: "beko-compliance-os.firebasestorage.app",
  messagingSenderId: "1039501158473",
  appId: "1:1039501158473:web:5f87d3e77c84185d077798",
  measurementId: "G-M9L03EE548"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// initializeFirestore (instead of plain getFirestore) with
// experimentalAutoDetectLongPolling fixes "Failed to get document
// because the client is offline" errors that happen when a network,
// proxy, VPN, or browser extension blocks Firestore's default
// streaming connection (WebChannel) while still letting plain HTTPS
// requests — like Firebase Auth — through untouched. Firestore probes
// the connection on startup and falls back to long-polling automatically
// when needed, instead of hanging/failing.
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false
});