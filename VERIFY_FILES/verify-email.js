import { auth, db } from "../firebase.js";
import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const userEmail = document.getElementById("userEmail");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const checkButton = document.getElementById("checkVerification");
const resendButton = document.getElementById("resendVerification");
const logoutButton = document.getElementById("logoutBtn");

// =======================
// HELPER FUNCTIONS
// =======================  
function setStatus(message, isVerified = false) {
  statusText.textContent = message;
  statusDot.classList.toggle("verified", isVerified);
}



// =======================
// CONTINUE AFTER VERIFICATION
// =======================
// After the user has verified their email, we check if they have completed onboarding. 
// If they have, we redirect them to the dashboard. 
// If not, we redirect them to the onboarding page.
async function continueAfterVerification(user) {
  try {
    console.log("Starting Firestore...");

    const userRef = doc(db, "users", user.uid);

    console.log("Getting document...");

    const snap = await getDoc(userRef);

    console.log("Document exists:", snap.exists());

    await setDoc(userRef, {
      email: user.email,
      emailVerified: true,
      onboardingComplete: false,
      updatedAt: new Date()
    }, { merge: true });

    console.log("User document created successfully.");

  } catch (error) {
    console.error("Firestore Error");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
  }
}


// =======================
// AUTH STATE CHANGED
// =======================  
// We listen for changes in the user's authentication state. 
// If the user is not logged in, we redirect them to the login page.
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../LOGIN_FILES/login.html";
    return;
  }

  userEmail.textContent = user.email;

  if (user.emailVerified) {
    setStatus("Email verified. Preparing onboarding...", true);
    await continueAfterVerification(user);
    return;
  }

  setStatus("Waiting for verification");
});


// ========================
// BUTTON EVENT LISTENERS
// =======================
// We add event listeners to the buttons on the page. 
checkButton.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) {
    window.location.href = "../LOGIN_FILES/login.html";
    return;
  }

  checkButton.disabled = true;
  checkButton.textContent = "Checking...";

  try {
    await user.reload();

    if (user.emailVerified) {
      setStatus("Email verified. Preparing onboarding...", true);
      await continueAfterVerification(user);
      return;
    }

    setStatus("Not verified yet. Open the link in your email, then check again.");
  } catch (error) {
    console.error("Verification check failed:", error);
    setStatus("We could not check verification. Please try again.");
  } finally {
    checkButton.disabled = false;
    checkButton.textContent = "I have verified my email";
  }
});

resendButton.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) {
    window.location.href = "../LOGIN_FILES/login.html";
    return;
  }

  resendButton.disabled = true;
  resendButton.textContent = "Sending...";

  try {
    await sendEmailVerification(user);
    setStatus("Verification email resent. Please check your inbox.");
  } catch (error) {
    console.error("Verification email resend failed:", error);
    setStatus("Could not resend right now. Please wait and try again.");
  } finally {
    resendButton.disabled = false;
    resendButton.textContent = "Resend email";
  }
});

logoutButton.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../LOGIN_FILES/login.html";
});
