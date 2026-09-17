
import { supabase } from "/supabase.js";

let currentUser = null;
let popiaRow = null;

const popiaItems = [
    { id: "accountability", group: "Accountability", text: "Appoint an information officer responsible for POPIA compliance" },
    { id: "processing-limitation", group: "Processing limitation", text: "Only collect personal information for a specific, lawful purpose" },
    { id: "purpose", group: "Purpose specification", text: "Document why each type of personal information is processed" },
    { id: "information-quality", group: "Information quality", text: "Keep personal information accurate, complete, and up to date" },
    { id: "openness", group: "Openness", text: "Publish a privacy notice or policy explaining data processing" },
    { id: "security", group: "Security safeguards", text: "Implement reasonable technical and organisational security measures" },
    { id: "access", group: "Data subject participation", text: "Have a process to handle access, correction, and deletion requests" },
    { id: "consent", group: "Consent", text: "Obtain valid consent where required and keep records of consent" },
    { id: "contracts", group: "Operator agreements", text: "Have written agreements with any third parties processing personal information" },
    { id: "breach", group: "Breach response", text: "Have a data breach notification process and response plan" },
    { id: "retention", group: "Retention", text: "Define retention periods and securely destroy information when no longer needed" },
    { id: "training", group: "Training", text: "Train staff who handle personal information on POPIA obligations" }
];

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

function daysUntil(d) {
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(d); target.setHours(0,0,0,0);
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

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

async function init() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = "/login/login.html";
        return;
    }
    currentUser = user;
    document.getElementById("userEmail").textContent = user.email;
    document.getElementById("userName").textContent = user.user_metadata?.full_name || "User";

    loadPopia();
    loadSarsCalendar();
    loadCipcReminder();
    loadDocuments();
}

document.getElementById("logoutBtn").onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login/login.html";
};

// POPIA
async function loadPopia() {
    const { data, error } = await supabase.from("popia_checklists").select("*").eq("user_id", currentUser.id).maybeSingle();
    if (error) return toast("Failed to load POPIA checklist: " + error.message);
    if (data) {
        popiaRow = data;
    } else {
        const defaultItems = {};
        popiaItems.forEach(i => defaultItems[i.id] = false);
        const { data: created, error: createErr } = await supabase.from("popia_checklists").insert({ user_id: currentUser.id, items: defaultItems }).select().single();
        if (createErr) return toast("Failed to create checklist: " + createErr.message);
        popiaRow = created;
    }
    renderPopia();
}

function renderPopia() {
    const items = popiaRow?.items || {};
    const groups = {};
    popiaItems.forEach(i => {
        if (!groups[i.group]) groups[i.group] = [];
        groups[i.group].push(i);
    });

    const container = document.getElementById("popiaChecklist");
    container.innerHTML = "";
    Object.entries(groups).forEach(([group, list]) => {
        const div = document.createElement("div");
        div.className = "checklist-group";
        div.innerHTML = `<h3>${group}</h3>`;
        list.forEach(i => {
            const checked = items[i.id] ? "checked" : "";
            const row = document.createElement("label");
            row.className = "check-item " + (items[i.id] ? "checked" : "");
            row.innerHTML = `<input type="checkbox" data-id="${i.id}" ${checked}> <span>${i.text}</span>`;
            row.querySelector("input").onchange = async (e) => {
                const updated = { ...items, [i.id]: e.target.checked };
                const { error } = await supabase.from("popia_checklists").update({ items: updated }).eq("id", popiaRow.id);
                if (error) return toast("Update failed: " + error.message);
                popiaRow.items = updated;
                row.classList.toggle("checked", e.target.checked);
                updatePopiaProgress();
                toast("Progress saved", "success");
            };
            div.appendChild(row);
        });
        container.appendChild(div);
    });
    updatePopiaProgress();
}

function updatePopiaProgress() {
    const items = popiaRow?.items || {};
    const total = popiaItems.length;
    const done = popiaItems.filter(i => items[i.id]).length;
    const pct = Math.round((done / total) * 100);
    document.getElementById("popiaProgress").value = pct;
    document.getElementById("popiaPercent").textContent = `${pct}% (${done}/${total})`;
}

// SARS Calendar
async function loadSarsCalendar() {
    const { data, error } = await supabase.from("tax_deadlines").select("*").order("due_date", { ascending: true });
    if (error) return toast("Failed to load tax deadlines: " + error.message);
    renderSars(data || []);
}

function renderSars(data) {
    const filter = document.getElementById("sarsFilter").value;
    const rows = filter === "all" ? data : data.filter(d => d.category === filter);
    const tbody = document.getElementById("sarsBody");
    tbody.innerHTML = "";
    document.getElementById("sarsEmpty").classList.toggle("hidden", rows.length > 0);

    rows.forEach(d => {
        const days = daysUntil(d.due_date);
        let status, badgeClass;
        if (days < 0) { status = "Overdue"; badgeClass = "badge-overdue"; }
        else if (days <= 7) { status = "Due soon"; badgeClass = "badge-soon"; }
        else { status = "Upcoming"; badgeClass = "badge-upcoming"; }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${formatDate(d.due_date)}</td>
            <td>${d.category}</td>
            <td>${d.description}</td>
            <td><span class="badge ${badgeClass}">${status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById("sarsFilter").onchange = loadSarsCalendar;

// CIPC Reminder
async function loadCipcReminder() {
    const [{ data: company }, { data: reminder }] = await Promise.all([
        supabase.from("company_profiles").select("registration_date").eq("id", currentUser.id).maybeSingle(),
        supabase.from("cipc_reminders").select("*").eq("user_id", currentUser.id).maybeSingle()
    ]);

    if (company?.registration_date) {
        document.getElementById("cipcRegDate").value = company.registration_date;
    }
    if (reminder) {
        if (reminder.reminder_days) document.getElementById("cipcReminderDays").value = reminder.reminder_days;
        if (reminder.notes) document.getElementById("cipcNotes").value = reminder.notes;
    }
    updateCipcStatus(company?.registration_date);
}

function updateCipcStatus(regDate) {
    const el = document.getElementById("cipcNextDue");
    if (!regDate) {
        el.textContent = "Enter your registration date to calculate the next due date.";
        return;
    }
    const today = new Date();
    const reg = new Date(regDate);
    let nextDue = new Date(today.getFullYear(), reg.getMonth(), reg.getDate());
    if (nextDue < today) nextDue.setFullYear(today.getFullYear() + 1);
    // CIPC annual return is due within 30 days of incorporation anniversary
    const deadline = new Date(nextDue); deadline.setDate(deadline.getDate() + 30);
    const days = daysUntil(deadline);
    const suffix = days < 0 ? "overdue" : days === 0 ? "due today" : `due in ${days} day${days === 1 ? "" : "s"}`;
    el.innerHTML = `<strong>${formatDate(deadline)}</strong> — your annual return filing window closes ${suffix}.`;
}

document.getElementById("saveCipcBtn").onclick = async () => {
    const regDate = document.getElementById("cipcRegDate").value;
    const reminderDays = parseInt(document.getElementById("cipcReminderDays").value, 10) || 30;
    const notes = document.getElementById("cipcNotes").value.trim();

    if (regDate) {
        const { error: compErr } = await supabase.from("company_profiles").update({ registration_date: regDate }).eq("id", currentUser.id);
        if (compErr) return toast("Failed to save registration date: " + compErr.message);
    }

    const { data: existing } = await supabase.from("cipc_reminders").select("id").eq("user_id", currentUser.id).maybeSingle();
    const payload = { user_id: currentUser.id, reminder_days: reminderDays, notes };
    const { error } = existing
        ? await supabase.from("cipc_reminders").update(payload).eq("id", existing.id)
        : await supabase.from("cipc_reminders").insert(payload);

    if (error) return toast("Failed to save reminder: " + error.message);
    updateCipcStatus(regDate);
    toast("Reminder saved", "success");
};

// Document Vault
const fileDrop = document.getElementById("fileDrop");
const fileInput = document.getElementById("fileInput");

fileDrop.onclick = () => fileInput.click();
fileDrop.ondragover = (e) => { e.preventDefault(); fileDrop.style.borderColor = "var(--teal)"; };
fileDrop.ondragleave = () => { fileDrop.style.borderColor = ""; };
fileDrop.ondrop = (e) => {
    e.preventDefault();
    fileDrop.style.borderColor = "";
    handleFiles(e.dataTransfer.files);
};
fileInput.onchange = (e) => handleFiles(e.target.files);

async function handleFiles(files) {
    for (const file of files) {
        await uploadFile(file);
    }
    fileInput.value = "";
}

async function uploadFile(file) {
    const path = `${currentUser.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
    if (upErr) return toast(`Upload failed for ${file.name}: ${upErr.message}`);

    const { error: dbErr } = await supabase.from("documents").insert({
        user_id: currentUser.id,
        filename: file.name,
        storage_path: path,
        file_type: file.type,
        size_bytes: file.size
    });
    if (dbErr) return toast("Failed to save document record: " + dbErr.message);
    toast(`${file.name} uploaded`, "success");
    loadDocuments();
}

function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

async function loadDocuments() {
    const { data, error } = await supabase.from("documents").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false });
    if (error) return toast("Failed to load documents: " + error.message);
    const list = document.getElementById("fileList");
    list.innerHTML = "";
    document.getElementById("filesEmpty").classList.toggle("hidden", (data || []).length > 0);

    (data || []).forEach(doc => {
        const row = document.createElement("div");
        row.className = "file-row";
        row.innerHTML = `
            <div class="meta">
                <span class="name"><i class="fas fa-file"></i> ${doc.filename}</span>
                <span class="size">${formatBytes(doc.size_bytes || 0)} · ${formatDate(doc.created_at)}</span>
            </div>
            <div class="actions">
                <button class="btn btn-secondary btn-sm" data-download="${doc.id}" style="padding:6px 12px;font-size:.75rem">Download</button>
                <button class="btn btn-danger btn-sm" data-delete="${doc.id}" style="padding:6px 12px;font-size:.75rem">Delete</button>
            </div>
        `;
        row.querySelector("[data-download]").onclick = () => downloadDocument(doc);
        row.querySelector("[data-delete]").onclick = () => deleteDocument(doc);
        list.appendChild(row);
    });
}

async function downloadDocument(doc) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
    if (error) return toast("Download link failed: " + error.message);
    window.open(data.signedUrl, "_blank");
}

async function deleteDocument(doc) {
    if (!confirm(`Delete ${doc.filename}?`)) return;
    const { error: storageErr } = await supabase.storage.from("documents").remove([doc.storage_path]);
    if (storageErr) return toast("Delete failed: " + storageErr.message);
    const { error: dbErr } = await supabase.from("documents").delete().eq("id", doc.id);
    if (dbErr) return toast("Failed to remove record: " + dbErr.message);
    toast("Document deleted", "success");
    loadDocuments();
}

init();
