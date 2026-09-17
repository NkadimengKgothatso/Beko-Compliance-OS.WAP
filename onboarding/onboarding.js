
import { supabase } from "/supabase.js";
import { routeUser } from "/shared/router.js";
import { toast, loading } from "/shared/ui.js";

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

function calcScore() {
    const g = id => document.getElementById(id).value;
    let s = 45;
    if (g("businessName")) s += 5;
    if (g("businessType")) s += 5;
    if (g("businessType") === "sole-proprietor" || g("regNumber")) s += 8;
    if (g("province")) s += 5;
    if (g("industry")) s += 3;
    if (g("industrySubsector")) s += 2;
    if (g("vat") === "yes") s += 7;
    if (g("vat") === "unsure") s -= 5;
    if (g("taxNumber")) s += 5;
    if (g("uifNumber")) s += 3;
    if (g("cipcReturn") === "current") s += 5;
    if (g("cipcReturn") === "overdue") s -= 5;
    if (Number(g("employees")) > 0) s += 5;
    if (Number(g("directors")) >= 1) s += 2;
    if (g("industry")) s += 5;
    if (g("revenue")) s += 5;
    if (g("accounting") && g("accounting") !== "none") s += 5;
    if (g("payroll") && g("payroll") !== "none") s += 5;
    if (g("taxFiling") === "current") s += 10;
    if (g("taxFiling") === "recent") s += 5;
    if (g("taxFiling") === "late") s -= 8;
    if (g("taxFiling") === "never") s -= 12;
    if (document.getElementById("hasRecords").checked) s += 5;
    if (document.getElementById("hasBusinessPlan").checked) s += 3;
    if (document.getElementById("hasContracts").checked) s += 2;
    if (g("bbbeeLevel") && g("bbbeeLevel") !== "non-compliant") s += 4;
    if (g("coida") === "yes") s += 3;
    if (document.getElementById("sdlRegistered").checked) s += 2;
    s = Math.max(0, Math.min(100, s));
    document.getElementById("scoreVal").textContent = `${s}%`;
    const msgs = [[80,"Strong start! Your dashboard will focus on upcoming deadlines."],[60,"Good foundation. A few gaps to address."],[40,"Moderate risk. Your dashboard starts with urgent basics."],[0,"High risk. We'll focus on stabilising core obligations."]];
    document.getElementById("scoreMsg").textContent = msgs.find(([t]) => s >= t)?.[1] || "";
    return s;
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
    const profile = {
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
    };
    const score = calcScore();
    const summary = score >= 80 ? "Strong position" : score >= 60 ? "Needs attention" : score >= 40 ? "Moderate risk" : "High risk";

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
            ...profile, compliance_score: score, score_summary: summary
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
