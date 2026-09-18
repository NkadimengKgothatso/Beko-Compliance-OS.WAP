
import { supabase } from "/supabase.js";

function toast(message) {
    const el = document.createElement("div");
    el.className = "toast toast-success";
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 3000);
}

function toastError(message) {
    const el = document.createElement("div");
    el.className = "toast toast-error";
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 5000);
}

const { data: { user } } = await supabase.auth.getUser();
if (!user) window.location.href = "/login/login.html";
document.getElementById("userEmail").textContent = user?.email || "—";
document.getElementById("userName").textContent = user?.user_metadata?.full_name || "User";

document.getElementById("logoutBtn").onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login/login.html";
};

// Fallback sample tenders if Supabase tables are not ready yet
const sampleTenders = [
    { id: "TND-2026-0412", title: "Supply of office cleaning services", dept: "Department of Health", province: "Gauteng", industry: "Cleaning / Facilities", closing: "2026-09-15", status: "open", desc: "Annual contract for daily office cleaning and hygiene services at provincial health facilities.", tags: ["B-BBEE Level 1-4", "Tax clearance", "CIPC"] },
    { id: "TND-2026-0389", title: "ICT support and maintenance", dept: "Municipality IT Division", province: "Western Cape", industry: "IT / Technology", closing: "2026-09-08", status: "open", desc: "Desktop support, network maintenance, and software licensing for 120 municipal users.", tags: ["B-BBEE", "CIDB", "3 years experience"] },
    { id: "TND-2026-0401", title: "Construction of rural classrooms", dept: "Department of Education", province: "Eastern Cape", industry: "Construction", closing: "2026-09-22", status: "open", desc: "Design and construction of two classroom blocks at a district primary school.", tags: ["CIDB 5GB", "B-BBEE", "Local content"] },
    { id: "TND-2026-0395", title: "Legal compliance advisory services", dept: "State-Owned Enterprise", province: "National", industry: "Professional services", closing: "2026-09-05", status: "open", desc: "Provision of annual legal and compliance advisory services covering CIPC, SARS, and labour law.", tags: ["B-BBEE Level 1-3", "Professional indemnity"] },
    { id: "TND-2026-0420", title: "Supply and delivery of PPE", dept: "Department of Public Works", province: "KwaZulu-Natal", industry: "Healthcare", closing: "2026-09-18", status: "open", desc: "Bulk supply of personal protective equipment for government buildings.", tags: ["SABS approved", "Tax clearance", "B-BBEE"] },
    { id: "TND-2026-0433", title: "Agricultural training programme", dept: "Department of Agriculture", province: "Free State", industry: "Education / Training", closing: "2026-09-30", status: "open", desc: "Facilitation of a 6-month smallholder farmer training programme.", tags: ["Accredited training", "B-BBEE", "CIPC"] },
    { id: "TND-2026-0418", title: "Cloud software subscription", dept: "Financial Services Firm", province: "Gauteng", industry: "IT / Technology", closing: "2026-09-12", status: "open", desc: "SaaS platform for document management and compliance tracking.", tags: ["ISO 27001", "B-BBEE", "POPIA compliant"] }
];

let tenders = [];
let trackedTenderIds = new Set();
let backendReady = false;

function mapTender(row) {
    return {
        dbId: row.id,
        id: row.tender_id,
        title: row.title,
        dept: row.department,
        province: row.province,
        industry: row.industry,
        closing: row.closing_date,
        status: row.status,
        desc: row.description,
        tags: row.tags || []
    };
}

async function loadData() {
    const { data: tenderRows, error: tenderErr } = await supabase.from("tenders").select("*");
    if (tenderErr) {
        console.warn("Tenders table not ready, using sample data:", tenderErr);
        tenders = sampleTenders;
        backendReady = false;
    } else {
        tenders = (tenderRows || []).map(mapTender);
        backendReady = true;
    }

    if (backendReady) {
        const { data: trackRows, error: trackErr } = await supabase
            .from("tender_tracks")
            .select("tender_id(tender_id)")
            .eq("user_id", user.id);
        if (!trackErr && trackRows) {
            trackedTenderIds = new Set(trackRows.map(r => r.tender_id?.tender_id).filter(Boolean));
        }
    } else {
        trackedTenderIds = new Set(JSON.parse(localStorage.getItem("beko_tracked_tenders") || "[]"));
    }

    render();
}

function daysUntil(dateStr) {
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
}

function statusBadge(t) {
    const days = daysUntil(t.closing);
    if (t.status === "closed" || days < 0) return `<span class="badge badge-closed">Closed</span>`;
    if (days <= 7) return `<span class="badge badge-closing">Closing in ${days} day${days === 1 ? "" : "s"}</span>`;
    return `<span class="badge badge-open">Open</span>`;
}

function render() {
    const search = document.getElementById("search").value.toLowerCase();
    const province = document.getElementById("province").value;
    const industry = document.getElementById("industry").value;
    const grid = document.getElementById("grid");
    grid.innerHTML = "";

    const filtered = tenders.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(search) || t.dept.toLowerCase().includes(search) || t.id.toLowerCase().includes(search);
        const matchesProvince = !province || t.province === province;
        const matchesIndustry = !industry || t.industry === industry;
        return matchesSearch && matchesProvince && matchesIndustry;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty"><h3>No tenders found</h3><p>Try changing your filters or create an alert to be notified of new opportunities.</p></div>`;
        return;
    }

    filtered.forEach(t => {
        const isTracked = trackedTenderIds.has(t.id);
        const card = document.createElement("div");
        card.className = `card ${isTracked ? "tracked" : ""}`;
        card.innerHTML = `
            <div class="card-header">
                <h3>${t.title}</h3>
                ${statusBadge(t)}
            </div>
            <div class="meta">
                <span><strong>${t.id}</strong></span>
                <span>${t.dept}</span>
                <span>${t.province}</span>
            </div>
            <div class="tags">${t.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}</div>
            <p class="desc">${t.desc}</p>
            <div class="card-actions">
                <button class="btn btn-secondary track-btn" data-id="${t.id}" data-dbid="${t.dbId || ""}">${isTracked ? "Untrack" : "Track tender"}</button>
                <button class="btn btn-primary" onclick="alert('Apply via the ${t.dept.replace(/'/g, "\\'")} portal using tender reference ${t.id}.')">Apply</button>
            </div>
        `;
        grid.appendChild(card);
    });

    document.querySelectorAll(".track-btn").forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            const dbId = btn.dataset.dbid;
            if (trackedTenderIds.has(id)) {
                if (backendReady && dbId) {
                    const { error } = await supabase.from("tender_tracks").delete().eq("user_id", user.id).eq("tender_id", dbId);
                    if (error) { toastError("Could not untrack: " + error.message); return; }
                }
                trackedTenderIds.delete(id);
                toast("Tender removed from tracked list");
            } else {
                if (backendReady && dbId) {
                    const { error } = await supabase.from("tender_tracks").insert({ user_id: user.id, tender_id: dbId });
                    if (error) { toastError("Could not track: " + error.message); return; }
                }
                trackedTenderIds.add(id);
                toast("Tender saved to tracked list");
            }
            if (!backendReady) {
                localStorage.setItem("beko_tracked_tenders", JSON.stringify([...trackedTenderIds]));
            }
            render();
        };
    });
}

document.getElementById("search").oninput = render;
document.getElementById("province").onchange = render;
document.getElementById("industry").onchange = render;
document.getElementById("resetBtn").onclick = () => {
    document.getElementById("search").value = "";
    document.getElementById("province").value = "";
    document.getElementById("industry").value = "";
    render();
};

document.getElementById("openAlertBtn").onclick = () => document.getElementById("alertModal").classList.add("active");
document.getElementById("closeAlert").onclick = () => document.getElementById("alertModal").classList.remove("active");
document.getElementById("alertModal").onclick = e => { if (e.target.id === "alertModal") document.getElementById("alertModal").classList.remove("active"); };

document.getElementById("alertForm").onsubmit = async e => {
    e.preventDefault();
    const keywords = document.getElementById("alertKeywords").value.trim();
    const province = document.getElementById("alertProvince").value;
    if (backendReady) {
        const { error } = await supabase.from("tender_alerts").insert({ user_id: user.id, keywords, province });
        if (error) { toastError("Could not save alert: " + error.message); return; }
    } else {
        const alerts = JSON.parse(localStorage.getItem("beko_tender_alerts") || "[]");
        alerts.push({ keywords, province, created: new Date().toISOString() });
        localStorage.setItem("beko_tender_alerts", JSON.stringify(alerts));
    }
    toast("Alert saved. You will be notified of matching tenders.");
    document.getElementById("alertModal").classList.remove("active");
    e.target.reset();
};

loadData();
