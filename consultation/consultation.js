
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
document.getElementById("userEmail").textContent = user?.email || "—";
document.getElementById("userName").textContent = user?.user_metadata?.full_name || "User";

document.getElementById("logoutBtn").onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login/login.html";
};

async function loadConsultations() {
    const list = document.getElementById("consultationList");
    const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        list.innerHTML = `<p style="font-size:.85rem;color:var(--muted)">Could not load consultations. The table may not exist yet.</p>`;
        return;
    }

    if (!data || data.length === 0) {
        list.innerHTML = `<p style="font-size:.85rem;color:var(--muted)">No consultations requested yet.</p>`;
        return;
    }

    list.innerHTML = "";
    data.forEach(c => {
        const date = c.preferred_date ? new Date(c.preferred_date).toLocaleDateString("en-ZA") : "No date";
        const el = document.createElement("div");
        el.className = "row";
        el.innerHTML = `
            <span>${c.type} <small>${c.status}</small></span>
            <span class="pill">${date}</span>
        `;
        list.appendChild(el);
    });
}

document.getElementById("form").onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true; btn.textContent = "Sending...";
    try {
        const { error } = await supabase.from("consultations").insert({
            user_id: user.id,
            type: document.getElementById("type").value,
            preferred_date: document.getElementById("date").value,
            message: document.getElementById("message").value || null
        });
        if (error) throw error;
        toast("Consultation request sent!");
        e.target.reset();
        await loadConsultations();
    } catch (err) {
        console.error(err);
        toast(`Request failed: ${err.message}. The consultations table may not exist yet.`, "error");
    } finally {
        btn.disabled = false; btn.textContent = "Request consultation";
    }
};

loadConsultations();
