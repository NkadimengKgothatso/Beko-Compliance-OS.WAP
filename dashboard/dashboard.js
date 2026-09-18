
import { supabase } from "/supabase.js";
import { missingDocsFor } from "/shared/compliance-docs.js";
import { buildComplianceReport } from "/shared/obligations.js";

let migrationWarned = false;

function fmt(v) {
    if (v === null || v === undefined || v === "") return "Not set";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return String(v).replace(/_/g, " ").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
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

    document.getElementById("userName").textContent = userData?.full_name || user.user_metadata?.full_name || "User";
    document.getElementById("displayName").textContent = userData?.full_name || user.user_metadata?.full_name || "User";
    document.getElementById("userEmail").textContent = user.email;
    document.getElementById("companyName").textContent = profile.business_name || userData?.company_name || "Company";

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

    const [docs, completions, popia] = await Promise.all([
        supabase.from("documents").select("*").eq("user_id", user.id),
        fetchCompletions(user.id),
        supabase.from("popia_checklists").select("*").eq("user_id", user.id).maybeSingle()
    ]);
    if (docs.error) console.error("Dashboard: documents query error:", docs.error);

    const report = buildComplianceReport(profile, {
        completions,
        docs: docs.data || [],
        popia: popia.data
    });

    renderScore(report, profile);
    loadMissingDocuments(user.id, profile, docs.data || []);
}

async function fetchCompletions(userId) {
    const { data, error } = await supabase
        .from("obligation_completions")
        .select("*")
        .eq("user_id", userId);
    if (error) {
        // Table is added by docs/supabase-migration-v6.sql
        if (!migrationWarned) {
            migrationWarned = true;
            toast("Obligation tracking needs a one-time database update (supabase-migration-v6.sql).", "error");
        }
        return [];
    }
    return data || [];
}

function renderScore(report, profile) {
    document.getElementById("scoreStat").textContent = `${report.score}%`;
    document.getElementById("scoreLabel").textContent = report.band.short;
    document.getElementById("scoreBig").textContent = `${report.score}%`;
    document.getElementById("scoreBig").className = `score-big ${report.band.id}`;
    document.getElementById("scoreStatus").textContent = report.band.label;
    document.getElementById("scoreBar").value = report.score;
    document.getElementById("scoreSummary").textContent =
        `${report.summary}. ${report.applicableCount} obligations apply to your business — see the full breakdown in the Compliance centre.`;

    document.getElementById("actionsCount").textContent = report.improvements.length;

    const { overdue, dueSoon } = report.counts;
    const overdueTop = report.improvements.find(i => i.status === "overdue");
    const soonTop = report.improvements.find(i => i.status === "due_soon");

    const soonStat = document.getElementById("dueSoonStat");
    soonStat.className = `stat ${dueSoon ? "warn" : "good"}`;
    document.getElementById("dueSoonCount").textContent = dueSoon;
    document.getElementById("dueSoonNote").textContent = dueSoon ? soonTop.title : "Nothing due in the next 14 days";

    const overdueStat = document.getElementById("overdueStat");
    overdueStat.className = `stat ${overdue ? "danger" : "good"}`;
    document.getElementById("overdueCount").textContent = overdue;
    document.getElementById("overdueNote").textContent = overdue ? overdueTop.title : "None — good standing";

    renderAlerts(report);

    // Keep the stored score fresh for other pages (best effort).
    if (report.score !== (profile.compliance_score || 0)) {
        supabase.from("company_profiles")
            .update({ compliance_score: report.score, score_summary: report.band.label })
            .eq("id", profile.id)
            .then(({ error }) => { if (error) console.error("Dashboard: score sync failed:", error); });
    }
}

function renderAlerts(report) {
    const el = document.getElementById("dashboardAlerts");
    const go = () => { window.location.href = "/compliance/compliance.html#score"; };

    if (!report.improvements.length) {
        el.innerHTML = `<div class="alert alert-success"><h4>No action needed</h4><p>All applicable obligations are on track.</p></div>`;
        return;
    }

    el.innerHTML = report.improvements.slice(0, 2).map(i => {
        const when = i.status === "overdue"
            ? `${i.missedCount > 1 ? `${i.missedCount} periods outstanding — ` : ""}${i.weeksOverdue ? `${i.weeksOverdue} week${i.weeksOverdue === 1 ? "" : "s"} overdue` : "overdue since " + fmtDate(i.dueDate)}`
            : `Due ${fmtDate(i.dueDate)}`;
        return `
        <div class="alert ${i.status === "overdue" ? "alert-danger" : "alert-warn"} alert-link" role="link" tabindex="0" data-alert>
            <h4>${i.title} — ${when}</h4>
            <p>${i.action} (worth +${i.impact} point${i.impact === 1 ? "" : "s"})</p>
        </div>`;
    }).join("");

    el.querySelectorAll("[data-alert]").forEach(node => {
        node.onclick = go;
        node.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
    });
}

async function loadMissingDocuments(userId, profile, docs) {
    const alertEl = document.getElementById("missingDocsAlert");

    const missing = missingDocsFor(profile, docs || []);
    if (!missing.length) return;

    const names = missing.map(d => d.label);
    const shown = names.slice(0, 3).join(", ") + (names.length > 3 ? ` and ${names.length - 3} more` : "");
    document.getElementById("missingDocsText").textContent =
        `${missing.length} required document${missing.length === 1 ? "" : "s"} outstanding: ${shown}. Click to upload.`;

    alertEl.classList.remove("hidden");
    alertEl.onclick = () => { window.location.href = "/documents/documents.html"; };
    alertEl.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            window.location.href = "/documents/documents.html";
        }
    };
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
