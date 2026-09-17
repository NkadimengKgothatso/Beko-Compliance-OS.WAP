
import { supabase } from "/supabase.js";

let currentUser = null;
let isAdmin = false;

function toast(message, type = "error") {
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, type === "error" ? 5000 : 3000);
}

function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-ZA");
}

// Auth + admin check
async function init() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = "/login/login.html";
        return;
    }
    currentUser = user;
    document.getElementById("userEmail").textContent = user.email;
    document.getElementById("userName").textContent = user.user_metadata?.full_name || "User";

    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    isAdmin = profile?.is_admin === true;

    if (!isAdmin) {
        document.getElementById("adminContent").classList.add("hidden");
        document.querySelector(".tabs").classList.add("hidden");
        document.getElementById("forbidden").classList.remove("hidden");
        return;
    }

    loadTenders();
    loadNotifications();
    loadConsultations();
}

document.getElementById("logoutBtn").onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login/login.html";
};

// Tabs
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
tabs.forEach(t => {
    t.onclick = () => {
        tabs.forEach(x => x.classList.remove("active"));
        panels.forEach(x => x.classList.remove("active"));
        t.classList.add("active");
        document.getElementById(t.dataset.tab + "Panel").classList.add("active");
    };
});

// Tenders
async function loadTenders() {
    const { data, error } = await supabase.from("tenders").select("*").order("created_at", { ascending: false });
    if (error) return toast("Failed to load tenders: " + error.message);
    const term = document.getElementById("tenderSearch").value.toLowerCase();
    const rows = (data || []).filter(t =>
        !term ||
        t.title?.toLowerCase().includes(term) ||
        t.department?.toLowerCase().includes(term) ||
        t.tender_id?.toLowerCase().includes(term)
    );
    const tbody = document.getElementById("tendersBody");
    tbody.innerHTML = "";
    document.getElementById("tendersEmpty").classList.toggle("hidden", rows.length > 0);
    rows.forEach(t => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${t.tender_id}</td>
            <td>${t.title}</td>
            <td>${t.department || "—"}</td>
            <td>${t.province || "—"}</td>
            <td>${t.industry || "—"}</td>
            <td>${formatDate(t.closing_date)}</td>
            <td><span class="badge badge-${t.status}">${t.status}</span></td>
            <td>
                <button class="btn btn-secondary" style="padding:6px 12px;font-size:.75rem" data-edit="${t.id}">Edit</button>
                <button class="btn btn-danger" style="padding:6px 12px;font-size:.75rem" data-del="${t.id}">Delete</button>
            </td>
        `;
        tr.querySelector("[data-edit]").onclick = () => openTenderModal(t);
        tr.querySelector("[data-del]").onclick = () => deleteTender(t.id);
        tbody.appendChild(tr);
    });
}

document.getElementById("tenderSearch").oninput = loadTenders;

function openTenderModal(tender = null) {
    document.getElementById("tenderModalTitle").textContent = tender ? "Edit tender" : "Add tender";
    document.getElementById("tenderId").value = tender?.id || "";
    document.getElementById("tenderTid").value = tender?.tender_id || "";
    document.getElementById("tenderTitle").value = tender?.title || "";
    document.getElementById("tenderDept").value = tender?.department || "";
    document.getElementById("tenderProvince").value = tender?.province || "";
    document.getElementById("tenderIndustry").value = tender?.industry || "";
    document.getElementById("tenderClosing").value = tender?.closing_date || "";
    document.getElementById("tenderStatus").value = tender?.status || "open";
    document.getElementById("tenderUrl").value = tender?.source_url || "";
    document.getElementById("tenderDesc").value = tender?.description || "";
    document.getElementById("tenderTags").value = (tender?.tags || []).join(", ");
    document.getElementById("tenderModal").classList.add("active");
}

function closeTenderModal() {
    document.getElementById("tenderModal").classList.remove("active");
    document.getElementById("tenderForm").reset();
}

document.getElementById("addTenderBtn").onclick = () => openTenderModal();
document.getElementById("closeTenderModal").onclick = closeTenderModal;
document.getElementById("cancelTenderBtn").onclick = closeTenderModal;

document.getElementById("saveTenderBtn").onclick = async () => {
    const id = document.getElementById("tenderId").value;
    const payload = {
        tender_id: document.getElementById("tenderTid").value.trim(),
        title: document.getElementById("tenderTitle").value.trim(),
        department: document.getElementById("tenderDept").value.trim() || null,
        province: document.getElementById("tenderProvince").value.trim() || null,
        industry: document.getElementById("tenderIndustry").value.trim() || null,
        closing_date: document.getElementById("tenderClosing").value || null,
        status: document.getElementById("tenderStatus").value,
        source_url: document.getElementById("tenderUrl").value.trim() || null,
        description: document.getElementById("tenderDesc").value.trim() || null,
        tags: document.getElementById("tenderTags").value.split(",").map(s => s.trim()).filter(Boolean)
    };
    if (!payload.tender_id || !payload.title) return toast("Tender ID and title are required");

    const { error } = id
        ? await supabase.from("tenders").update(payload).eq("id", id)
        : await supabase.from("tenders").insert(payload);

    if (error) return toast("Save failed: " + error.message);
    toast("Tender saved", "success");
    closeTenderModal();
    loadTenders();
};

async function deleteTender(id) {
    if (!confirm("Delete this tender?")) return;
    const { error } = await supabase.from("tenders").delete().eq("id", id);
    if (error) return toast("Delete failed: " + error.message);
    toast("Tender deleted", "success");
    loadTenders();
}

// Notifications
function shortId(id) {
    if (!id) return "—";
    return id.slice(0, 8) + "...";
}

async function loadNotifications() {
    const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
    if (error) return toast("Failed to load notifications: " + error.message);
    const tbody = document.getElementById("notificationsBody");
    tbody.innerHTML = "";
    document.getElementById("notificationsEmpty").classList.toggle("hidden", (data || []).length > 0);
    (data || []).forEach(n => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td title="${n.user_id}">${shortId(n.user_id)}</td>
            <td>${n.title}</td>
            <td>${n.category || "—"}</td>
            <td>${n.priority || "normal"}</td>
            <td>${n.is_read ? "Yes" : "No"}</td>
            <td>${formatDate(n.created_at)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function closeNotifModal() {
    document.getElementById("notifModal").classList.remove("active");
    document.getElementById("notifForm").reset();
}

document.getElementById("addNotifBtn").onclick = () => document.getElementById("notifModal").classList.add("active");
document.getElementById("closeNotifModal").onclick = closeNotifModal;
document.getElementById("cancelNotifBtn").onclick = closeNotifModal;

document.getElementById("sendNotifBtn").onclick = async () => {
    const email = document.getElementById("notifEmail").value.trim();
    const title = document.getElementById("notifTitle").value.trim();
    const body = document.getElementById("notifBody").value.trim();
    const category = document.getElementById("notifCategory").value.trim() || "compliance";
    const priority = document.getElementById("notifPriority").value;
    if (!email || !title || !body) return toast("Email, title, and body are required");

    let userIds = [];
    if (email.toLowerCase() === "all") {
        const { data: users, error: userErr } = await supabase.from("profiles").select("id");
        if (userErr) return toast("Failed to load users: " + userErr.message);
        userIds = (users || []).map(u => u.id);
    } else {
        const { data: user } = await supabase.from("profiles").select("id,email").eq("email", email).maybeSingle();
        if (!user) return toast("User not found with that email");
        userIds = [user.id];
    }

    const rows = userIds.map(uid => ({ user_id: uid, title, body, category, priority }));
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) return toast("Send failed: " + error.message);
    toast(`Notification sent to ${userIds.length} user(s)`, "success");
    closeNotifModal();
    loadNotifications();
};

// Consultations
async function loadConsultations() {
    const status = document.getElementById("consultFilter").value;
    let query = supabase.from("consultations").select("*").order("created_at", { ascending: false });
    if (status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return toast("Failed to load consultations: " + error.message);
    const tbody = document.getElementById("consultationsBody");
    tbody.innerHTML = "";
    document.getElementById("consultationsEmpty").classList.toggle("hidden", (data || []).length > 0);
    (data || []).forEach(c => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td title="${c.user_id}">${shortId(c.user_id)}</td>
            <td>${c.type}</td>
            <td>${formatDate(c.preferred_date)}</td>
            <td>${c.message || "—"}</td>
            <td><span class="badge badge-${c.status}">${c.status}</span></td>
            <td>${formatDate(c.created_at)}</td>
            <td>
                <select class="status-select" data-id="${c.id}" style="padding:6px;border-radius:6px;border:1px solid var(--border)">
                    <option value="pending" ${c.status === "pending" ? "selected" : ""}>Pending</option>
                    <option value="confirmed" ${c.status === "confirmed" ? "selected" : ""}>Confirmed</option>
                    <option value="completed" ${c.status === "completed" ? "selected" : ""}>Completed</option>
                    <option value="cancelled" ${c.status === "cancelled" ? "selected" : ""}>Cancelled</option>
                </select>
            </td>
        `;
        tr.querySelector(".status-select").onchange = async (e) => {
            const { error } = await supabase.from("consultations").update({ status: e.target.value }).eq("id", c.id);
            if (error) return toast("Update failed: " + error.message);
            toast("Status updated", "success");
        };
        tbody.appendChild(tr);
    });
}

document.getElementById("consultFilter").onchange = loadConsultations;

init();
