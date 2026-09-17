
import { supabase } from "/supabase.js";
import { routeUser } from "/shared/router.js";
import { toast, loading } from "/shared/ui.js";

// Unregister any old service worker so stale cached files don't interfere
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
}

const $ = id => document.getElementById(id);
const views = { login: $("loginView"), code: $("codeView"), signup: $("signupView"), reset: $("resetView") };
const tabs  = { login: $("tabLogin"), code: $("tabCode"), signup: $("tabSignup") };

function show(name) {
    Object.values(views).forEach(v => v.classList.add("hide"));
    Object.values(tabs).forEach(t => t.classList.remove("active"));
    views[name].classList.remove("hide");
    if (tabs[name]) tabs[name].classList.add("active");
}

// Tab switching
tabs.login.onclick  = () => show("login");
tabs.code.onclick   = () => show("code");
tabs.signup.onclick = () => show("signup");

// Reset back-link
$("showReset").onclick = e => { e.preventDefault(); show("reset"); };
$("backLogin").onclick = e => { e.preventDefault(); show("login"); };

// Check if already logged in
const { data: { session } } = await supabase.auth.getSession();
if (session) await routeUser("/login/login.html");


// ─── SIGN IN (password) ─────────────────────────────────────────────
$("loginForm").onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const email = $("loginEmail").value.trim();
    const pass  = $("loginPass").value;

    if (!email || !pass) return toast("Fill in all fields");
    loading(btn, true);

    // Hide inline verify from previous attempts
    $("inlineVerify").classList.add("hide");

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password: pass });

    if (error) {
        const msg = error.message.toLowerCase();
        const status = error.status;

        // Supabase returns 400 with "Invalid login credentials" for BOTH
        // wrong password AND unconfirmed email. We need to check if the
        // user exists and is unverified by attempting to send an OTP.
        if (status === 400 || msg.includes("invalid login") || msg.includes("invalid email") || msg.includes("invalid credentials")) {

            // Try sending an OTP code — if this succeeds, the account exists
            // but is unverified. If it fails, the credentials are truly wrong.
            const { error: otpError } = await supabase.auth.signInWithOtp({ email });

            if (!otpError) {
                // OTP sent successfully → account exists, email is just unverified
                toast("Email not verified. Check your inbox for a code.", "success");
                showInlineVerify(email);
            } else {
                // OTP also failed — truly invalid credentials
                const otpMsg = otpError.message.toLowerCase();
                if (otpMsg.includes("invalid") || otpMsg.includes("not found") || otpMsg.includes("registered")) {
                    toast("Invalid email or password. Please try again.");
                } else {
                    toast("Login failed. Please check your email and password.");
                }
            }

        } else if (msg.includes("not confirmed") || msg.includes("email not confirmed")) {
            // Explicit "not confirmed" message (older Supabase versions)
            toast("Email not verified. Sending code...", "success");
            await supabase.auth.signInWithOtp({ email });
            showInlineVerify(email);

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
        toast("Email not verified. Sending code...", "success");
        await supabase.auth.signInWithOtp({ email });
        showInlineVerify(email);
        loading(btn, false);
        return;
    }

    // Login successful
    toast("Welcome back!", "success");
    await routeUser("/login/login.html");
};


// ─── INLINE VERIFY (unverified user on login page) ──────────────────
const inlineInputs = document.querySelectorAll("#inlineCodeInputs .code-input");
let inlineCooldownTimer = null;

function showInlineVerify(email) {
    $("inlineVerify").classList.remove("hide");
    $("inlineEmail").textContent = email;
    inlineInputs.forEach(i => { i.value = ""; i.classList.remove("filled"); });
    inlineInputs[0].focus();
    startInlineCooldown(60);
}

function startInlineCooldown(seconds) {
    let remaining = seconds;
    $("inlineResend").style.pointerEvents = "none";
    $("inlineResend").style.opacity = "0.4";
    clearInterval(inlineCooldownTimer);
    $("inlineCooldown").textContent = `Resend available in ${remaining}s`;
    inlineCooldownTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(inlineCooldownTimer);
            $("inlineCooldown").textContent = "";
            $("inlineResend").style.pointerEvents = "";
            $("inlineResend").style.opacity = "";
        } else {
            $("inlineCooldown").textContent = `Resend available in ${remaining}s`;
        }
    }, 1000);
}

// Code input behaviour for inline verify
inlineInputs.forEach((input, idx) => {
    input.addEventListener("input", e => {
        const v = e.target.value.replace(/[^0-9]/g, "");
        e.target.value = v;
        if (v) {
            e.target.classList.add("filled");
            if (idx < 7) inlineInputs[idx + 1].focus();
        } else {
            e.target.classList.remove("filled");
        }
    });
    input.addEventListener("keydown", e => {
        if (e.key === "Backspace" && !e.target.value && idx > 0) {
            inlineInputs[idx - 1].focus();
            inlineInputs[idx - 1].value = "";
            inlineInputs[idx - 1].classList.remove("filled");
        }
    });
    input.addEventListener("paste", e => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text").replace(/[^0-9]/g, "").slice(0, 8);
        for (let i = 0; i < text.length; i++) {
            inlineInputs[i].value = text[i];
            inlineInputs[i].classList.add("filled");
        }
        if (text.length === 8) inlineInputs[7].focus();
        else if (text.length > 0) inlineInputs[text.length].focus();
    });
});

function getInlineCode() {
    return Array.from(inlineInputs).map(i => i.value).join("");
}

// Auto-submit when 8 digits entered
inlineInputs[7].addEventListener("input", () => {
    if (getInlineCode().length === 8) verifyInlineCode();
});

async function verifyInlineCode() {
    const code = getInlineCode();
    if (code.length !== 8) return toast("Enter all 8 digits");

    const email = $("inlineEmail").textContent;
    const btn = $("inlineVerifyBtn");
    loading(btn, true);

    const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email"
    });

    if (error) {
        toast(error.message);
        inlineInputs.forEach(i => { i.value = ""; i.classList.remove("filled"); });
        inlineInputs[0].focus();
        loading(btn, false);
        return;
    }

    toast("Email verified!", "success");
    loading(btn, false);
    await routeUser("/login/login.html");
}

$("inlineVerifyBtn").onclick = verifyInlineCode;

// Inline resend
$("inlineResend").onclick = async e => {
    e.preventDefault();
    const email = $("inlineEmail").textContent;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) { toast(error.message); return; }
    toast("New code sent!", "success");
    inlineInputs.forEach(i => { i.value = ""; i.classList.remove("filled"); });
    inlineInputs[0].focus();
    startInlineCooldown(60);
};


// ─── SEND CODE (OTP Login) ──────────────────────────────────────────
$("codeForm").onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const email = $("codeEmail").value.trim();

    if (!email) return toast("Enter your email");
    loading(btn, true);

    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
        toast(error.message);
        loading(btn, false);
        return;
    }

    toast("Code sent! Check your inbox.", "success");
    // Redirect to verify page — user enters code there
    setTimeout(() => {
        window.location.href = "/verify/verify-email.html";
    }, 800);
};


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

    const { data: signUpData, error } = await supabase.auth.signUp({
        email, password: pass,
        options: { data: { full_name: name } }
    });

    if (error) {
        const msg = error.message.toLowerCase();
        const status = error.status;

        // Log full error for debugging
        console.error("Signup error:", { status, message: error.message, code: error.code, full: error });

        if (status >= 500) {
            toast("Server error during signup. Check browser console (F12) for details.");
            console.error("500 error details:", JSON.stringify(error, null, 2));
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

    // Log success for debugging
    console.log("Signup success:", signUpData);

    // Account created — redirect to verify page which auto-sends the code
    toast("Account created! Sending verification code...", "success");
    window.location.href = "/verify/verify-email.html";
};


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
