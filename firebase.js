import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
export const db = getFirestore(app);