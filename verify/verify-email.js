
import { supabase } from "/supabase.js";
import { routeUser } from "/shared/router.js";
import { toast, loading } from "/shared/ui.js";

const $ = id => document.getElementById(id);
const title = $("title");
const message = $("message");
const statusText = $("statusText");
const dot = $("dot");
const statusIcon = $("statusIcon");
const codeInputs = document.querySelectorAll(".code-input");
const COOLDOWN_SECONDS = 60;
let cooldownTimer = null;

function setStatus(state, text) {
    if (state === "loading") {
        statusIcon.style.display = "grid";
        statusIcon.className = "status-icon";
        dot.style.display = "none";
    } else if (state === "success") {
        statusIcon.style.display = "grid";
        statusIcon.className = "status-icon ok";
        dot.style.display = "none";
    } else if (state === "error") {
        statusIcon.style.display = "grid";
        statusIcon.className = "status-icon err";
        dot.style.display = "none";
    } else {
        statusIcon.style.display = "none";
        dot.style.display = "inline-block";
    }
    statusText.textContent = text;
}

function setVerified() {
    title.textContent = "Email verified!";
    message.innerHTML = "Your email has been confirmed. Redirecting you to the app&hellip;";
    setStatus("success", "Verified successfully");
    $("verifyBtn").textContent = "Continue to app";
    $("verifyBtn").onclick = () => routeUser("/verify/verify-email.html");
    codeInputs.forEach(i => i.disabled = true);
    $("resendBtn").classList.add("hide");
    $("cooldownFill").parentElement.classList.add("hide");
    $("cooldownText").classList.add("hide");
    clearInterval(cooldownTimer);
}

function detectEmailProvider(email) {
    const domain = email?.split("@")[1]?.toLowerCase();
    const providers = {
        "gmail.com": "https://mail.google.com",
        "outlook.com": "https://outlook.live.com",
        "hotmail.com": "https://outlook.live.com",
        "live.com": "https://outlook.live.com",
        "yahoo.com": "https://mail.yahoo.com",
        "icloud.com": "https://www.icloud.com/mail",
        "me.com": "https://www.icloud.com/mail"
    };
    return providers[domain] || "mailto:" + (email || "");
}

// ─── Resend cooldown timer ──────────────────────────────────────────
function startCooldown() {
    $("resendBtn").disabled = true;
    let remaining = COOLDOWN_SECONDS;
    const fill = $("cooldownFill");
    const text = $("cooldownText");

    fill.style.width = "100%";
    text.textContent = `Resend available in ${remaining}s`;

    clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
        remaining--;
        const pct = (remaining / COOLDOWN_SECONDS) * 100;
        fill.style.width = pct + "%";

        if (remaining <= 0) {
            clearInterval(cooldownTimer);
            $("resendBtn").disabled = false;
            text.textContent = "";
            fill.style.width = "0%";
        } else {
            text.textContent = `Resend available in ${remaining}s`;
        }
    }, 1000);
}

// ─── Code input behaviour: auto-advance, paste support, backspace ───
codeInputs.forEach((input, idx) => {
    input.addEventListener("input", e => {
        const v = e.target.value.replace(/[^0-9]/g, "");
        e.target.value = v;
        if (v) {
            e.target.classList.add("filled");
            if (idx < 7) codeInputs[idx + 1].focus();
        } else {
            e.target.classList.remove("filled");
        }
    });
    input.addEventListener("keydown", e => {
        if (e.key === "Backspace" && !e.target.value && idx > 0) {
            codeInputs[idx - 1].focus();
            codeInputs[idx - 1].value = "";
            codeInputs[idx - 1].classList.remove("filled");
        }
    });
    input.addEventListener("paste", e => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text").replace(/[^0-9]/g, "").slice(0, 8);
        for (let i = 0; i < text.length; i++) {
            codeInputs[i].value = text[i];
            codeInputs[i].classList.add("filled");
        }
        if (text.length === 8) codeInputs[7].focus();
        else if (text.length > 0) codeInputs[text.length].focus();
    });
});

function getCode() {
    return Array.from(codeInputs).map(i => i.value).join("");
}

function clearCode() {
    codeInputs.forEach(i => { i.value = ""; i.classList.remove("filled"); });
    codeInputs[0].focus();
}

// Auto-submit when 8 digits entered
codeInputs[7].addEventListener("input", () => {
    if (getCode().length === 8) verifyCode();
});

// ─── Verify the OTP ─────────────────────────────────────────────────
async function verifyCode() {
    const code = getCode();
    if (code.length !== 8) return toast("Enter all 8 digits");

    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email || $("userEmail").textContent;

    const btn = $("verifyBtn");
    loading(btn, true);
    setStatus("loading", "Verifying\u2026");

    const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email"
    });

    if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("expired")) {
            setStatus("error", "Code expired");
            toast("Code expired. Click Resend to get a new one.");
        } else if (msg.includes("invalid") || msg.includes("not found")) {
            setStatus("error", "Invalid code");
            toast("Invalid code. Please try again.");
        } else {
            setStatus("error", "Verification failed");
            toast(error.message);
        }
        clearCode();
        loading(btn, false);
        return;
    }

    setVerified();
    loading(btn, false);
    setTimeout(() => routeUser("/verify/verify-email.html"), 1500);
}

$("verifyBtn").onclick = verifyCode;

// ─── Poll for link-based verification (fallback) ────────────────────
function startPolling() {
    let attempts = 0;
    const timer = setInterval(async () => {
        attempts++;
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email_confirmed_at) {
            clearInterval(timer);
            setVerified();
            setTimeout(() => routeUser("/verify/verify-email.html"), 1500);
        }
        if (attempts >= 40) clearInterval(timer);
    }, 3000);
}

// ─── Send verification code ─────────────────────────────────────────
async function sendCode() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    try {
        const { error } = await supabase.auth.signInWithOtp({ email: user.email });
        if (error) {
            toast("Could not send code: " + error.message);
            return false;
        }
        toast("Verification code sent to " + user.email, "success");
        startCooldown();
        return true;
    } catch (err) {
        toast("Could not send code: " + err.message);
        return false;
    }
}

// ─── Init ────────────────────────────────────────────────────────────
const { data: { user }, error: userErr } = await supabase.auth.getUser();
if (userErr || !user) {
    window.location.href = "/login/login.html";
} else {
    $("userEmail").textContent = user.email;
    $("openEmailBtn").href = detectEmailProvider(user.email);

    if (user.email_confirmed_at) {
        setVerified();
        setTimeout(() => routeUser("/verify/verify-email.html"), 1500);
    } else {
        // Auto-send a verification code on page load
        codeInputs[0].focus();
        startPolling();
        await sendCode();
    }
}

// ─── Resend code ─────────────────────────────────────────────────────
$("resendBtn").onclick = async () => {
    clearCode();
    setStatus("loading", "Sending new code\u2026");
    const sent = await sendCode();
    if (sent) {
        setStatus("waiting", "Waiting for code");
    } else {
        setStatus("error", "Failed to send");
    }
};

// ─── Logout / use different account ──────────────────────────────────
$("logoutBtn").onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login/login.html";
};

// ─── Fallback: resend link-based verification ────────────────────────
$("linkFallback").onclick = async e => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
    if (error) toast(error.message);
    else toast("Verification link sent! Check your inbox.", "success");
};


if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .catch(err => console.error('Service worker registration failed:', err));
}
