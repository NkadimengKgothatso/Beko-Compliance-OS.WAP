
import { supabase } from "/supabase.js";
import { buildComplianceReport, bandFor, STATUS_LABELS } from "/shared/obligations.js";

let currentUser = null;
let popiaRow = null;
let docsCache = [];
let completionsCache = [];
let migrationWarned = false;

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

function activateTab(id) {
    if (!document.getElementById(id + "Panel")) return;
    tabs.forEach(x => x.classList.remove("active"));
    panels.forEach(x => x.classList.remove("active"));
    document.querySelector(`.tab[data-tab="${id}"]`)?.classList.add("active");
    document.getElementById(id + "Panel").classList.add("active");
}

tabs.forEach(t => {
    t.onclick = () => {
        if (t.dataset.href) {
            window.location.href = t.dataset.href;
            return;
        }
        activateTab(t.dataset.tab);
        history.replaceState(null, "", "#" + t.dataset.tab);
    };
});

window.addEventListener("hashchange", () => activateTab(window.location.hash.slice(1)));

async function init() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = "/login/login.html";
        return;
    }
    currentUser = user;
    document.getElementById("userEmail").textContent = user.email;
    document.getElementById("userName").textContent = user.user_metadata?.full_name || "User";

    const hash = window.location.hash.slice(1);
    if (hash) activateTab(hash);

    await loadPopia();
    loadScore();
    loadSarsCalendar();
    loadCipcReminder();
}

document.getElementById("logoutBtn").onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login/login.html";
};

// ---- Compliance score ----

function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

async function fetchCompletions() {
    const { data, error } = await supabase
        .from("obligation_completions")
        .select("*")
        .eq("user_id", currentUser.id);
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

async function loadScore() {
    const [{ data: company, error: companyErr }, completions, { data: docs, error: docsErr }] = await Promise.all([
        supabase.from("company_profiles").select("*").eq("id", currentUser.id).maybeSingle(),
        fetchCompletions(),
        supabase.from("documents").select("*").eq("user_id", currentUser.id)
    ]);

    if (companyErr) return toast("Failed to load company profile: " + companyErr.message);
    if (docsErr) console.error("Compliance: documents query error:", docsErr);

    if (!company) {
        document.getElementById("scorePanel").classList.add("no-profile");
        document.getElementById("scoreHero").innerHTML = `
            <div class="score-hero-text">
                <h2>No business profile yet</h2>
                <p>Complete onboarding so we can work out which obligations apply to your business and score them.</p>
                <button class="btn btn-primary btn-sm" id="scoreOnboardingBtn">Complete onboarding</button>
            </div>`;
        document.getElementById("scoreOnboardingBtn").onclick = () => { window.location.href = "/onboarding/onboarding.html"; };
        return;
    }

    document.getElementById("scorePanel").classList.remove("no-profile");
    completionsCache = completions;
    docsCache = docs || [];
    renderScore(buildComplianceReport(company, {
        completions: completionsCache,
        docs: docsCache,
        popia: popiaRow
    }));
}

function renderScore(report) {
    const hero = document.getElementById("scoreHero");
    hero.className = `score-hero band-${report.band.id}`;
    const dial = document.getElementById("scoreDial");
    dial.style.setProperty("--score", report.score);

    document.getElementById("scoreValue").textContent = `${report.score}%`;
    document.getElementById("scoreBand").textContent = report.band.label;
    document.getElementById("scoreSummary").textContent =
        report.improvements.length
            ? `${report.improvements.length} obligation${report.improvements.length === 1 ? "" : "s"} need action, starting with the ones worth the most points.`
            : "Nothing needs action right now — keep your records and documents up to date.";

    const c = report.counts;
    document.getElementById("scoreCounts").textContent = [
        `${report.applicableCount} obligations apply to your business`,
        c.overdue ? `${c.overdue} overdue` : null,
        c.dueSoon ? `${c.dueSoon} due soon` : null,
        `${c.completed} completed`,
        c.notApplicable ? `${c.notApplicable} not applicable (excluded from the score)` : null
    ].filter(Boolean).join(" · ");

    document.getElementById("regulatorGrid").innerHTML = report.byRegulator.map(reg => `
        <div class="regulator-card">
            <div class="reg-name">${reg.label}</div>
            <div class="reg-score reg-${bandFor(reg.score).id}">${reg.score}%</div>
            <div class="reg-meta">${reg.count} obligation${reg.count === 1 ? "" : "s"} · ${Math.round((reg.weight / report.totalWeight) * 100)}% of your score</div>
        </div>`).join("");

    renderImprovements(report);
    renderObligations(report);
}

function renderImprovements(report) {
    const el = document.getElementById("improvements");
    if (!report.improvements.length) {
        el.innerHTML = `<div class="empty">No overdue or due-soon obligations. We'll flag the next one here when it approaches.</div>`;
        return;
    }

    el.innerHTML = report.improvements.map(item => {
        const overdue = item.status === "overdue";
        const due = overdue
            ? `Overdue since ${fmtDate(item.dueDate)}${item.weeksOverdue ? ` (${item.weeksOverdue} week${item.weeksOverdue === 1 ? "" : "s"})` : ""}`
            : `Due ${fmtDate(item.dueDate)}`;
        const periods = item.missedCount > 1 ? ` · ${item.missedCount} periods outstanding` : "";
        return `
        <div class="improvement ${overdue ? "" : "soon"}">
            <div class="improvement-head">
                <div>
                    <strong>${item.title}</strong>
                    <span class="badge ${overdue ? "badge-overdue" : "badge-soon"}">${due}${periods}</span>
                </div>
                <span class="impact-badge">Completing this adds +${item.impact} point${item.impact === 1 ? "" : "s"}</span>
            </div>
            <p>${item.why}</p>
            <p class="improvement-action"><strong>Next step:</strong> ${item.action}</p>
            ${item.periodKey ? `<button class="btn btn-green btn-sm" data-action="complete" data-id="${item.id}" data-key="${item.periodKey}"><i class="fas fa-check"></i> Mark complete</button>` : ""}
        </div>`;
    }).join("");
}

const STATUS_RANK = { overdue: 0, due_soon: 1, pending: 2, completed: 3, not_applicable: 4 };
const BADGE_CLASS = { overdue: "badge-overdue", due_soon: "badge-soon", pending: "badge-upcoming", completed: "badge-completed", not_applicable: "badge-na" };

function renderObligations(report) {
    const tbody = document.getElementById("obligationsBody");
    const rows = [...report.obligations].sort((a, b) => {
        const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        if (rank) return rank;
        return (a.dueDate || "9999-99-99") < (b.dueDate || "9999-99-99") ? -1 : 1;
    });

    tbody.innerHTML = rows.map(o => {
        const detail = [o.dueRule, o.note].filter(Boolean).join(" — ");
        let action = "";
        if (o.status === "overdue" || o.status === "due_soon") {
            action = `<button class="btn btn-secondary btn-sm" data-action="complete" data-id="${o.id}" data-key="${o.periodKey}">Mark complete</button>`;
        } else if (o.status === "completed" && o.source === "manual" && o.periodKey) {
            action = `<button class="btn btn-secondary btn-sm" data-action="undo" data-id="${o.id}" data-key="${o.periodKey}">Undo</button>`;
        }
        const sourceNote = o.status === "completed" && o.source && o.source !== "manual" ? " (from your profile)" : "";
        return `
        <tr>
            <td><strong>${o.title}</strong><div class="row-sub">${detail}</div></td>
            <td>${o.regulatorLabel}</td>
            <td>${o.frequencyLabel}</td>
            <td>${fmtDate(o.dueDate)}${o.status !== "completed" && o.nextDue ? `<div class="row-sub">Next: ${fmtDate(o.nextDue)}</div>` : ""}</td>
            <td><span class="badge ${BADGE_CLASS[o.status]}">${STATUS_LABELS[o.status]}</span>${sourceNote}</td>
            <td>${action}</td>
        </tr>`;
    }).join("");
}

document.getElementById("scorePanel").addEventListener("click", async e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const { action, id, key } = btn.dataset;
    btn.disabled = true;

    if (action === "complete") {
        const { error } = await supabase.from("obligation_completions").insert({
            user_id: currentUser.id,
            obligation_id: id,
            period_key: key
        });
        if (error) {
            btn.disabled = false;
            return toast("Could not save: " + error.message);
        }
        toast("Marked as completed — score updated", "success");
    } else {
        const { error } = await supabase.from("obligation_completions")
            .delete()
            .eq("user_id", currentUser.id)
            .eq("obligation_id", id)
            .eq("period_key", key);
        if (error) {
            btn.disabled = false;
            return toast("Could not undo: " + error.message);
        }
        toast("Completion removed — score updated", "success");
    }

    await loadScore();
});

async function refreshScore() {
    completionsCache = await fetchCompletions();
    const { data: company } = await supabase.from("company_profiles").select("*").eq("id", currentUser.id).maybeSingle();
    if (!company) return;
    renderScore(buildComplianceReport(company, {
        completions: completionsCache,
        docs: docsCache,
        popia: popiaRow
    }));
}

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
                refreshScore();
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

init();
