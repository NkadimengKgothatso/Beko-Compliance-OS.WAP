
import { supabase } from "/supabase.js";

function toast(message, type = "success") {
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, type === "error" ? 5000 : 3000);
}

const { data: { user } } = await supabase.auth.getUser();
if (!user) window.location.href = "/login/login.html";

const name = user?.user_metadata?.full_name || "User";
document.getElementById("sbName").textContent = name;
document.getElementById("sbEmail").textContent = user?.email || "—";
document.getElementById("avatar").textContent = name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase();
document.getElementById("heroName").textContent = name;
document.getElementById("fullName").value = name;

document.getElementById("logoutBtn").onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login/login.html";
};

const { data: profile } = await supabase.from("company_profiles").select("*").eq("id", user.id).maybeSingle();
const { data: userData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

if (profile) {
    document.getElementById("heroBiz").textContent = `${profile.business_name || "Company"} \u00b7 ${profile.province || "Province"}`;
    document.getElementById("heroIndustry").textContent = profile.industry || "Industry";
    document.getElementById("bizType").textContent = String(profile.business_type || "—").replace(/-/g, " ");
    document.getElementById("regStatus").textContent = profile.registration_number ? "Registered" : "Not registered";
    document.getElementById("taxStatus").textContent = profile.last_tax_filing === "current" ? "Compliant" : "Attention needed";
    document.getElementById("taxStatus").className = profile.last_tax_filing === "current" ? "green" : "amber";
    document.getElementById("vatStatus").textContent = profile.vat_registered === "yes" ? "Yes" : "No";
    document.getElementById("vatStatus").className = profile.vat_registered === "yes" ? "green" : "red";
    document.getElementById("empCount").textContent = profile.employees || 0;
    document.getElementById("revenue").textContent = String(profile.monthly_revenue || "—").replace(/-/g, " ").replace(/k/g, "K");
    document.getElementById("province").textContent = profile.province || "—";
    document.getElementById("website").value = profile.website || "";
}
if (userData) {
    document.getElementById("phone").value = userData.phone || "";
}

document.getElementById("form").onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true; btn.textContent = "Saving...";
    try {
        const updates = {
            full_name: document.getElementById("fullName").value.trim(),
            phone: document.getElementById("phone").value.trim() || null
        };
        const { error: p1 } = await supabase.auth.updateUser({ data: updates });
        if (p1) throw p1;
        const { error: p2 } = await supabase.from("profiles").update(updates).eq("id", user.id);
        if (p2) throw p2;
        if (profile) {
            const { error: p3 } = await supabase.from("company_profiles").update({ website: document.getElementById("website").value.trim() || null }).eq("id", user.id);
            if (p3) throw p3;
        }
        toast("Profile saved!");
    } catch (err) {
        console.error(err);
        toast(`Save failed: ${err.message}`, "error");
    } finally {
        btn.disabled = false; btn.textContent = "Save changes";
    }
};

document.querySelectorAll(".toggle").forEach(t => {
    t.onclick = () => t.classList.toggle("on");
});
