
import { supabase } from "/supabase.js";

function toast(message) {
    const el = document.createElement("div");
    el.className = "toast toast-success";
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 3000);
}

const { data: { user } } = await supabase.auth.getUser();
if (!user) window.location.href = "/login/login.html";
document.getElementById("userEmail").textContent = user?.email || "—";
document.getElementById("userName").textContent = user?.user_metadata?.full_name || "User";

document.getElementById("logoutBtn").onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login/login.html";
};

document.querySelectorAll(".toggle").forEach(t => {
    t.onclick = () => t.classList.toggle("on");
});

const sampleNotifications = [
    { title: "UIF submission overdue — penalty risk", body: "Your monthly UIF declaration is overdue. Submit now to avoid penalties.", priority: "high", is_read: false, created_at: new Date().toISOString() },
    { title: "VAT return due in 5 days — file now", body: "Your VAT return is due soon. Ensure all invoices are captured.", priority: "medium", is_read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
    { title: "CIPC Annual Return due in 20 days", body: "Remember to file your annual return within the next 20 days.", priority: "normal", is_read: false, created_at: new Date(Date.now() - 7200000).toISOString() },
    { title: "SARS filing reminder: due 15 Jan 2027", body: "Your provisional tax filing deadline is approaching.", priority: "normal", is_read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
    { title: "New template available: Employment contract", body: "An updated employment contract template is now in the library.", priority: "low", is_read: true, created_at: new Date(Date.now() - 259200000).toISOString() }
];

function priorityClass(p) {
    if (p === "high") return "red";
    if (p === "medium") return "warn";
    if (p === "low") return "gray";
    return "green";
}

function timeAgo(dateStr) {
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
}

let notifications = [];
let backendReady = false;

async function loadNotifications() {
    const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.warn("Notifications table not ready, using samples:", error);
        notifications = sampleNotifications;
        backendReady = false;
    } else {
        notifications = data || [];
        backendReady = true;
        if (notifications.length === 0) {
            // Seed sample notifications for new users
            const { error: seedErr } = await supabase.from("notifications").insert(
                sampleNotifications.map(n => ({ ...n, user_id: user.id }))
            );
            if (!seedErr) {
                const { data: fresh } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
                notifications = fresh || [];
            }
        }
    }
    render();
}

function render() {
    const list = document.getElementById("notifList");
    list.innerHTML = "";
    if (notifications.length === 0) {
        list.innerHTML = `<p style="color:var(--muted);font-size:.9rem">No notifications yet.</p>`;
        return;
    }
    notifications.forEach(n => {
        const el = document.createElement("div");
        el.className = "notif";
        el.style.opacity = n.is_read ? "0.7" : "1";
        el.innerHTML = `
            <div class="dot ${priorityClass(n.priority)}"></div>
            <div class="body">
                <div class="title">${n.title}</div>
                <div class="time">${n.body ? n.body + " · " : ""}${timeAgo(n.created_at)}</div>
            </div>
            ${n.is_read ? "" : '<span class="badge">New</span>'}
        `;
        el.onclick = async () => {
            if (backendReady && !n.is_read) {
                await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
                n.is_read = true;
                render();
            }
        };
        list.appendChild(el);
    });
}

document.getElementById("markReadBtn").onclick = async () => {
    if (backendReady) {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length) {
            await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
        }
    }
    notifications.forEach(n => n.is_read = true);
    toast("All notifications marked as read");
    render();
};

loadNotifications();
