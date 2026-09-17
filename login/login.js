
import { supabase } from "/supabase.js";
import { routeUser } from "/shared/router.js";
import { toast, loading } from "/shared/ui.js";

const $ = id => document.getElementById(id);
const views = { login: $("loginView"), code: $("codeView"), signup: $("signupView"), reset: $("resetView") };
const tabs  = { login: $("tabLogin"), code: $("tabCode"), signup: $("tabSignup") };

// Supabase rate-limits OTP emails per address. That message means a code is
// already in the user's inbox, so we still show the code entry UI.
const RATE_LIMIT_HINTS = ["security purposes", "only request this after", "rate limit", "too many"];
const isRateLimited = message => RATE_LIMIT_HINTS.some(hint => message.toLowerCase().includes(hint));

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
            } else if (isRateLimited(otpError.message)) {
                // A code was sent moments ago — show the entry UI anyway
                toast("A code has already been sent. Enter it below.", "success");
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

// Reusable 8-digit code input group: numeric filtering, auto-advance,
// backspace navigation, paste support, auto-submit when complete.
function setupCodeInputs(inputs, { onComplete }) {
    const getCode = () => Array.from(inputs).map(i => i.value).join("");
    const clear = () => {
        inputs.forEach(i => { i.value = ""; i.classList.remove("filled"); });
        inputs[0].focus();
    };

    inputs.forEach((input, idx) => {
        input.addEventListener("input", e => {
            const v = e.target.value.replace(/[^0-9]/g, "");
            e.target.value = v;
            if (v) {
                e.target.classList.add("filled");
                if (idx < inputs.length - 1) inputs[idx + 1].focus();
            } else {
                e.target.classList.remove("filled");
            }
            if (getCode().length === inputs.length) onComplete();
        });
        input.addEventListener("keydown", e => {
            if (e.key === "Backspace" && !e.target.value && idx > 0) {
                inputs[idx - 1].focus();
                inputs[idx - 1].value = "";
                inputs[idx - 1].classList.remove("filled");
            }
        });
        input.addEventListener("paste", e => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData("text").replace(/[^0-9]/g, "").slice(0, inputs.length);
            for (let i = 0; i < text.length; i++) {
                inputs[i].value = text[i];
                inputs[i].classList.add("filled");
            }
            if (text.length === inputs.length) onComplete();
            else if (text.length > 0) inputs[text.length].focus();
        });
    });

    return { getCode, clear };
}

function startCooldown(resendEl, labelEl, seconds) {
    let remaining = seconds;
    resendEl.style.pointerEvents = "none";
    resendEl.style.opacity = "0.4";
    clearInterval(inlineCooldownTimer);
    labelEl.textContent = `Resend available in ${remaining}s`;
    inlineCooldownTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(inlineCooldownTimer);
            labelEl.textContent = "";
            resendEl.style.pointerEvents = "";
            resendEl.style.opacity = "";
        } else {
            labelEl.textContent = `Resend available in ${remaining}s`;
        }
    }, 1000);
}

function showInlineVerify(email) {
    $("inlineVerify").classList.remove("hide");
    $("inlineEmail").textContent = email;
    inline.clear();
    startCooldown($("inlineResend"), $("inlineCooldown"), 60);
}

const inline = setupCodeInputs(inlineInputs, { onComplete: verifyInlineCode });

async function verifyInlineCode() {
    const code = inline.getCode();
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
        inline.clear();
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
    inline.clear();
    startCooldown($("inlineResend"), $("inlineCooldown"), 60);
};


// ─── SEND CODE (OTP Login) ──────────────────────────────────────────
const codeInputs = document.querySelectorAll("#codeInputs .code-input");
const codeEntry = setupCodeInputs(codeInputs, { onComplete: verifyCode });

$("codeForm").onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const email = $("codeEmail").value.trim();

    if (!email) return toast("Enter your email");
    loading(btn, true);

    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error && !isRateLimited(error.message)) {
        toast(error.message);
        loading(btn, false);
        return;
    }

    loading(btn, false);
    if (error) toast("A code has already been sent. Enter it below.", "success");
    showCodeEntry(email);
};

function showCodeEntry(email) {
    $("codeSentEmail").textContent = email;
    $("codeForm").classList.add("hide");
    $("codeEntry").classList.remove("hide");
    codeEntry.clear();
    startCooldown($("codeResend"), $("codeCooldown"), 60);
}

async function verifyCode() {
    const token = codeEntry.getCode();
    if (token.length !== 8) return toast("Enter all 8 digits");

    const email = $("codeSentEmail").textContent;
    const btn = $("codeVerifyBtn");
    loading(btn, true);

    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

    if (error) {
        toast(error.message);
        codeEntry.clear();
        loading(btn, false);
        return;
    }

    toast("Signed in!", "success");
    loading(btn, false);
    await routeUser("/login/login.html");
}

$("codeVerifyBtn").onclick = verifyCode;

$("codeResend").onclick = async e => {
    e.preventDefault();
    const email = $("codeSentEmail").textContent;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) { toast(error.message); return; }
    toast("New code sent!", "success");
    codeEntry.clear();
    startCooldown($("codeResend"), $("codeCooldown"), 60);
};

$("codeChangeEmail").onclick = e => {
    e.preventDefault();
    $("codeEntry").classList.add("hide");
    $("codeForm").classList.remove("hide");
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

    // Account created — redirect to verify page which auto-sends the code.
    // Signup leaves no session, so hand the email over to the verify page.
    toast("Account created! Sending verification code...", "success");
    sessionStorage.setItem("beko_verify_email", email);
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
