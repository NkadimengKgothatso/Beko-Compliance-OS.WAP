
import { supabase } from "/supabase.js";
import { routeUser } from "/shared/router.js";
import { toast, loading } from "/shared/ui.js";

const $ = id => document.getElementById(id);

// Check if already logged in
const { data: { session } } = await supabase.auth.getSession();
if (session) await routeUser("/signup/signup.html");


// ─── CONFIRM PASSWORD LIVE FEEDBACK ────────────────────────────────
function updateMatchMsg() {
    const pass = $("signupPass").value;
    const confirm = $("signupConfirmPass").value;
    const msg = $("passMatchMsg");
    if (!confirm) {
        msg.textContent = "";
        msg.className = "match-msg";
    } else if (pass !== confirm) {
        msg.textContent = "Passwords do not match";
        msg.className = "match-msg error";
    } else {
        msg.textContent = "Passwords match";
        msg.className = "match-msg success";
    }
}
$("signupPass").oninput = updateMatchMsg;
$("signupConfirmPass").oninput = updateMatchMsg;


// ─── SIGN UP ─────────────────────────────────────────────────────────
$("signupForm").onsubmit = async e => {
    e.preventDefault();
    const btn     = e.target.querySelector("button[type=submit]");
    const name    = $("fullName").value.trim();
    const email   = $("signupEmail").value.trim();
    const pass    = $("signupPass").value;
    const confirm = $("signupConfirmPass").value;

    if (!name || !email || !pass || !confirm) return toast("Fill in all fields");
    if (pass.length < 6) return toast("Password must be at least 6 characters");
    if (pass !== confirm) return toast("Passwords do not match");

    loading(btn, true);

    const { error } = await supabase.auth.signUp({
        email, password: pass,
        options: { data: { full_name: name } }
    });

    if (error) {
        const msg = error.message.toLowerCase();
        const status = error.status;

        console.error("Signup error:", { status, message: error.message, code: error.code, full: error });

        if (status >= 500) {
            toast("Server error during signup. Check browser console (F12) for details.");
        } else if (msg.includes("already registered") || msg.includes("already exists")) {
            toast("This email is already registered. Try signing in instead.");
        } else if (msg.includes("rate limit") || msg.includes("too many")) {
            toast("Too many attempts. Please wait a minute and try again.");
        } else {
            toast("Signup failed: " + error.message);
        }
        loading(btn, false);
        return;
    }

    // Account created — hand the email over to the verify page, which owns
    // the code entry UI and sends the 8-digit code.
    toast("Account created! Sending verification code...", "success");
    sessionStorage.setItem("beko_verify_email", email);
    window.location.href = "/verify/verify-email.html";
};


if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .catch(err => console.error('Service worker registration failed:', err));
}
