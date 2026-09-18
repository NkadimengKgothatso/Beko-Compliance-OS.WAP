
import { supabase } from "/supabase.js";
import { routeUser } from "/shared/router.js";
import { toast, loading } from "/shared/ui.js";
import { buildComplianceReport } from "/shared/obligations.js";

const steps = document.querySelectorAll(".step");
const journeyItems = document.querySelectorAll("#journey li");
const TOTAL = steps.length;
let current = 0;

// Auth check
const { data: { user } } = await supabase.auth.getUser();
if (!user) window.location.href = "/login/login.html";
else await routeUser("/onboarding/onboarding.html");

function goTo(idx) {
    current = idx;
    steps.forEach((s, i) => s.classList.toggle("active", i === current));
    journeyItems.forEach((li, i) => li.classList.toggle("active", i <= current));
    document.getElementById("stepLabel").textContent = `Step ${current + 1} of ${TOTAL}`;
    document.getElementById("progressFill").style.width = `${((current + 1) / TOTAL) * 100}%`;
    document.getElementById("backBtn").disabled = current === 0;
    document.getElementById("nextBtn").style.display = current === TOTAL - 1 ? "none" : "inline-block";
    document.getElementById("finishBtn").style.display = current === TOTAL - 1 ? "inline-block" : "none";
    if (current === TOTAL - 1) calcScore();
}

function validate() {
    const fields = steps[current].querySelectorAll("input[required], select[required]");
    for (const f of fields) { if (!f.checkValidity()) { f.reportValidity(); return false; } }
    return true;
}

document.getElementById("nextBtn").onclick = () => { if (validate()) goTo(current + 1); };
document.getElementById("backBtn").onclick = () => goTo(Math.max(0, current - 1));

function buildProfileDraft() {
    const g = id => document.getElementById(id).value;
    return {
        id: user.id,
        business_name: g("businessName"), business_type: g("businessType"),
        registration_number: g("regNumber") || null,
        registration_date: g("regDate") || null,
        tax_number: g("taxNumber") || null,
        uif_number: g("uifNumber") || null,
        province: g("province"), city: g("city") || null,
        address: g("address") || null, website: g("website") || null,
        vat_registered: g("vat"), employees: Number(g("employees")),
        directors: Number(g("directors") || 1),
        industry: g("industry"), industry_subsector: g("industrySubsector") || null,
        monthly_revenue: g("revenue"), accounting_software: g("accounting") || null,
        payroll_system: g("payroll") || null,
        last_tax_filing: g("taxFiling"), cipc_annual_return: g("cipcReturn") || "not-filed",
        bbbee_level: g("bbbeeLevel") || null,
        coida_registered: g("coida") === "yes",
        sdl_registered: document.getElementById("sdlRegistered").checked,
        has_records: document.getElementById("hasRecords").checked,
        has_business_plan: document.getElementById("hasBusinessPlan").checked,
        has_contracts: document.getElementById("hasContracts").checked,
        imports_exports: g("importsExports"),
    };
}

function calcScore() {
    const report = buildComplianceReport(buildProfileDraft(), {});
    document.getElementById("scoreVal").textContent = `${report.score}%`;
    document.getElementById("scoreMsg").textContent =
        `${report.band.label} — ${report.applicableCount} obligation${report.applicableCount === 1 ? "" : "s"} apply to your business.`;
    const card = document.getElementById("scoreCard");
    card.classList.remove("band-excellent", "band-good", "band-at-risk", "band-critical");
    card.classList.add(`band-${report.band.id}`);
    return report;
}

function setValue(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function setChecked(id, val) { const el = document.getElementById(id); if (el) el.checked = val; }

document.getElementById("form").onsubmit = async e => {
    e.preventDefault();
    if (!user) return toast("Not signed in. Please log in again.");
    const btn = document.getElementById("finishBtn");
    loading(btn, true);
    console.log("Onboarding: starting save for user", user.id);

    const g = id => document.getElementById(id).value;
    const profile = buildProfileDraft();
    const { imports_exports, ...profileCore } = profile;
    const report = calcScore();
    const score = report.score;
    const summary = report.band.label;

    try {
        // Ensure profile row exists then update it (fixes users who signed up before trigger)
        const { error: profileUpsertErr } = await supabase.from("profiles").upsert({
            id: user.id,
            full_name: user.user_metadata?.full_name || null,
            email: user.email,
            onboarding_complete: true,
            compliance_score: score,
            company_id: user.id,
            company_name: profile.business_name,
            phone: g("phone") || null
        });
        if (profileUpsertErr) {
            console.error("Onboarding: profile upsert error:", profileUpsertErr);
            throw profileUpsertErr;
        }
        console.log("Onboarding: profile upsert OK");

        // Save company profile
        const { error: companyErr } = await supabase.from("company_profiles").upsert({
            ...profileCore, compliance_score: score, score_summary: summary
        });
        if (companyErr) {
            console.error("Onboarding: company upsert error:", companyErr);
            throw companyErr;
        }
        console.log("Onboarding: company upsert OK");

        // Verify the row is readable before leaving
        const { data: verify, error: verifyErr } = await supabase
            .from("company_profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();
        if (verifyErr) {
            console.error("Onboarding: verify read error:", verifyErr);
            throw verifyErr;
        }
        if (!verify) {
            console.warn("Onboarding: save reported OK but row not readable yet");
        } else {
            console.log("Onboarding: verified company row exists");
        }

        // Best-effort: column added in docs/supabase-migration-v6.sql — don't block onboarding if it's missing
        const { error: ieErr } = await supabase
            .from("company_profiles")
            .update({ imports_exports })
            .eq("id", user.id);
        if (ieErr) console.warn("Onboarding: imports_exports not saved (run docs/supabase-migration-v6.sql):", ieErr.message);

        toast("Profile saved! Loading dashboard...", "success");
        setTimeout(() => { window.location.href = "/dashboard/dashboard.html"; }, 600);
    } catch (err) {
        console.error("Save failed:", err);
        toast(`Save failed: ${err.message}. Try again.`);
        loading(btn, false);
    }
};

goTo(0);


if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .catch(err => console.error('Service worker registration failed:', err));
}
