
import { supabase } from "/supabase.js";

function fmt(v) {
    if (v === null || v === undefined || v === "") return "Not set";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return String(v).replace(/_/g, " ").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function toast(message, type = "error") {
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, type === "error" ? 5000 : 3000);
}

async function loadDashboard() {
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) console.error("Dashboard: getUser error:", userErr);
    if (!user) {
        window.location.href = "/login/login.html";
        return;
    }

    console.log("Dashboard: loading for user", user.id);

    // Load company profile and user profile with maybeSingle (no error on missing row)
    const { data: profile, error: profileErr } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    const { data: userData, error: userDataErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (profileErr) console.error("Dashboard: company query error:", profileErr);
    if (userDataErr) console.error("Dashboard: profile query error:", userDataErr);

    console.log("Dashboard: company =", profile, "user profile =", userData);

    if (!profile) {
        // No company profile — show a friendly state instead of bouncing to onboarding
        document.getElementById("dashboardContent").innerHTML = `
            <div class="empty-state">
                <h2>No business profile yet</h2>
                <p>We couldn't load a company profile for your account. Complete onboarding to set up your business details and see your dashboard.</p>
                <button class="btn btn-primary" id="goOnboardingBtn">Complete onboarding</button>
            </div>
        `;
        document.getElementById("goOnboardingBtn").onclick = () => {
            window.location.href = "/onboarding/onboarding.html";
        };
        return;
    }

    // We have a company profile. Make sure onboarding flag is true.
    if (!userData?.onboarding_complete) {
        const { error: fixErr } = await supabase
            .from("profiles")
            .update({ onboarding_complete: true, company_id: user.id, company_name: profile.business_name })
            .eq("id", user.id);
        if (fixErr) console.error("Dashboard: failed to fix onboarding flag:", fixErr);
    }

    const score = profile.compliance_score || 0;
    const statusLabel = score >= 80 ? "Strong position" : score >= 60 ? "Needs attention" : score >= 40 ? "Moderate risk" : "High risk";

    document.getElementById("userName").textContent = userData?.full_name || user.user_metadata?.full_name || "User";
    document.getElementById("displayName").textContent = userData?.full_name || user.user_metadata?.full_name || "User";
    document.getElementById("userEmail").textContent = user.email;
    document.getElementById("companyName").textContent = profile.business_name || userData?.company_name || "Company";

    document.getElementById("scoreStat").textContent = `${score}%`;
    document.getElementById("scoreLabel").textContent = statusLabel;
    document.getElementById("scoreBig").textContent = `${score}%`;
    document.getElementById("scoreStatus").textContent = statusLabel;
    document.getElementById("scoreBar").value = score;
    document.getElementById("scoreSummary").textContent = profile.score_summary || "Your compliance profile is loaded.";

    const actions = score >= 80 ? 2 : score >= 60 ? 4 : score >= 40 ? 6 : 8;
    document.getElementById("actionsCount").textContent = actions;

    document.getElementById("businessList").innerHTML = `
        <li><span>Registration number</span><strong>${fmt(profile.registration_number)}</strong></li>
        <li><span>Tax number</span><strong>${fmt(profile.tax_number)}</strong></li>
        <li><span>VAT status</span><strong>${fmt(profile.vat_registered)}</strong></li>
        <li><span>Employees</span><strong>${profile.employees || 0}</strong></li>
        <li><span>Directors</span><strong>${profile.directors || 1}</strong></li>
        <li><span>Industry</span><strong>${fmt(profile.industry)}</strong></li>
        <li><span>Monthly revenue</span><strong>${fmt(profile.monthly_revenue)}</strong></li>
        <li><span>Province</span><strong>${fmt(profile.province)}</strong></li>
    `;

    document.getElementById("complianceList").innerHTML = `
        <li><span>Accounting software</span><strong>${fmt(profile.accounting_software)}</strong></li>
        <li><span>Payroll system</span><strong>${fmt(profile.payroll_system)}</strong></li>
        <li><span>Records organised</span><strong>${fmt(profile.has_records)}</strong></li>
        <li><span>Business plan</span><strong>${fmt(profile.has_business_plan)}</strong></li>
        <li><span>Written contracts</span><strong>${fmt(profile.has_contracts)}</strong></li>
        <li><span>CIPC annual return</span><strong>${fmt(profile.cipc_annual_return)}</strong></li>
        <li><span>Last tax filing</span><strong>${fmt(profile.last_tax_filing)}</strong></li>
        <li><span>B-BBEE level</span><strong>${fmt(profile.bbbee_level)}</strong></li>
        <li><span>COIDA registered</span><strong>${fmt(profile.coida_registered)}</strong></li>
        <li><span>SDL registered</span><strong>${fmt(profile.sdl_registered)}</strong></li>
    `;
}

document.getElementById("logoutBtn").onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login/login.html";
};

// PWA install prompt
let deferredPrompt = null;
const pwaBanner = document.getElementById("pwaInstall");
const pwaInstallBtn = document.getElementById("pwaInstallBtn");
const pwaDismiss = document.getElementById("pwaDismiss");

window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
    if (localStorage.getItem("pwaDismissed") !== "1") {
        pwaBanner.classList.add("show");
    }
});

pwaInstallBtn.onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") pwaBanner.classList.remove("show");
    deferredPrompt = null;
};

pwaDismiss.onclick = () => {
    pwaBanner.classList.remove("show");
    localStorage.setItem("pwaDismissed", "1");
};

loadDashboard();
