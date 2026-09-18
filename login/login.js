
import { supabase } from "/supabase.js";
import { routeUser } from "/shared/router.js";
import { toast, loading } from "/shared/ui.js";

const $ = id => document.getElementById(id);
const views = { login: $("loginView"), reset: $("resetView") };

// Supabase rate-limits OTP emails per address. That message means a code is
// already in the user's inbox, so the verify page can still show entry UI.
const RATE_LIMIT_HINTS = ["security purposes", "only request this after", "rate limit", "too many"];
const isRateLimited = message => RATE_LIMIT_HINTS.some(hint => message.toLowerCase().includes(hint));

function show(name) {
    Object.values(views).forEach(v => v.classList.add("hide"));
    views[name].classList.remove("hide");
}

// Reset links
$("showReset").onclick = e => { e.preventDefault(); show("reset"); };
$("backLogin").onclick = e => { e.preventDefault(); show("login"); };

// Check if already logged in
const { data: { session } } = await supabase.auth.getSession();
if (session) await routeUser("/login/login.html");

// Unverified accounts finish on the dedicated verify page, which owns the
// code entry UI and resend cooldown.
function handOffToVerify(email) {
    sessionStorage.setItem("beko_verify_email", email);
    toast("Email not verified. Taking you to verification\u2026", "success");
    window.location.href = "/verify/verify-email.html";
}


// ─── SIGN IN (password) ─────────────────────────────────────────────
$("loginForm").onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const email = $("loginEmail").value.trim();
    const pass  = $("loginPass").value;

    if (!email || !pass) return toast("Fill in all fields");
    loading(btn, true);

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password: pass });

    if (error) {
        const msg = error.message.toLowerCase();
        const status = error.status;

        // Supabase returns 400 with "Invalid login credentials" for BOTH
        // wrong password AND unconfirmed email. An OTP probe tells them
        // apart: success (or a rate-limit reply) means the account exists
        // but is unverified, so the code is already in the inbox.
        if (status === 400 || msg.includes("invalid login") || msg.includes("invalid email") || msg.includes("invalid credentials")) {

            const { error: otpError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });

            if (!otpError || isRateLimited(otpError.message)) {
                handOffToVerify(email);
                return;
            }

            const otpMsg = otpError.message.toLowerCase();
            if (otpMsg.includes("invalid") || otpMsg.includes("not found") || otpMsg.includes("registered")) {
                toast("Invalid email or password. Please try again.");
            } else {
                toast("Login failed. Please check your email and password.");
            }

        } else if (msg.includes("not confirmed") || msg.includes("email not confirmed")) {
            // Explicit "not confirmed" message (older Supabase versions)
            await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
            handOffToVerify(email);
            return;

        } else if (status >= 500) {
            toast("Server error. Please try again in a moment.");

        } else {
            toast(error.message);
        }
        loading(btn, false);
        return;
    }

    // Check if the signed-in user has a confirmed email
    if (signInData?.user && !signInData.user.email_confirmed_at) {
        await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
        handOffToVerify(email);
        return;
    }

    // Login successful
    toast("Welcome back!", "success");
    await routeUser("/login/login.html");
};


// ─── PASSWORD RESET ──────────────────────────────────────────────────
$("resetForm").onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const email = $("resetEmail").value.trim();
    if (!email) return toast("Enter your email");
    loading(btn, true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/login/login.html"
    });
    if (error) { toast(error.message); loading(btn, false); return; }
    toast("Reset email sent! Check your inbox.", "success");
    setTimeout(() => show("login"), 2000);
    loading(btn, false);
};


if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .catch(err => console.error('Service worker registration failed:', err));
}
