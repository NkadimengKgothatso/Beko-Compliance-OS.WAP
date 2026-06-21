// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCqXFQX_b9raMCI0pm38YAs6XPu2h0Hy1g",
  authDomain: "beko-compliance-os.firebaseapp.com",
  projectId: "beko-compliance-os",
  storageBucket: "beko-compliance-os.firebasestorage.app",
  messagingSenderId: "1039501158473",
  appId: "1:1039501158473:web:5f87d3e77c84185d077798",
  measurementId: "G-M9L03EE548"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCqXFQX_b9raMCI0pm38YAs6XPu2h0Hy1g",
  authDomain: "beko-compliance-os.firebaseapp.com",
  projectId: "beko-compliance-os",
  storageBucket: "beko-compliance-os.firebasestorage.app",
  messagingSenderId: "1039501158473",
  appId: "1:1039501158473:web:5f87d3e77c84185d077798"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);