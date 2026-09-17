
import { supabase } from "/supabase.js";

const { data: { user } } = await supabase.auth.getUser();
if (!user) window.location.href = "/login/login.html";
document.getElementById("userEmail").textContent = user?.email || "—";
document.getElementById("userName").textContent = user?.user_metadata?.full_name || "User";

document.getElementById("logoutBtn").onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login/login.html";
};

const weights = { low: 10, medium: 25, high: 40 };
const controls = {
    customerDueDiligence: "Implement and document a Customer Due Diligence process.",
    recordKeeping: "Maintain identity and transaction records for at least 5 years.",
    suspiciousReporting: "Register with the FIC and report suspicious transactions promptly.",
    staffTraining: "Train staff on FICA obligations and red-flag indicators."
};

function getRiskLevel(score) {
    if (score >= 70) return { label: "High risk", desc: "Your business has significant AML exposure. Strong controls and FIC registration are essential.", class: "risk-high" };
    if (score >= 40) return { label: "Medium risk", desc: "Some risk factors are present. Improve controls and monitor transactions regularly.", class: "risk-medium" };
    return { label: "Low risk", desc: "Your profile shows limited AML exposure, but basic record keeping is still required.", class: "risk-low" };
}

async function saveScreening(score, risk, recommendations) {
    const answers = {
        businessType: document.getElementById("businessType").value,
        cashTurnover: document.getElementById("cashTurnover").value,
        international: document.getElementById("international").value,
        pep: document.getElementById("pep").value,
        customerDueDiligence: document.getElementById("customerDueDiligence").checked,
        recordKeeping: document.getElementById("recordKeeping").checked,
        suspiciousReporting: document.getElementById("suspiciousReporting").checked,
        staffTraining: document.getElementById("staffTraining").checked
    };
    const { error } = await supabase.from("aml_screenings").insert({
        user_id: user.id,
        score,
        risk_level: risk.label,
        answers,
        recommendations
    });
    if (error) console.warn("Could not save AML screening:", error);
}

async function loadHistory() {
    const { data, error } = await supabase
        .from("aml_screenings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
    if (error || !data || data.length === 0) return;

    document.getElementById("historyCard").style.display = "block";
    const list = document.getElementById("historyList");
    list.innerHTML = "";
    data.forEach(h => {
        const date = new Date(h.created_at).toLocaleDateString("en-ZA");
        const el = document.createElement("div");
        el.className = "row";
        el.style = "display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F3F4F6";
        el.innerHTML = `
            <span><strong>${h.risk_level}</strong> · Score ${h.score}%</span>
            <span style="color:var(--muted);font-size:.85rem">${date}</span>
        `;
        list.appendChild(el);
    });
}

document.getElementById("screenForm").onsubmit = async e => {
    e.preventDefault();
    let score = 0;
    score += weights[document.getElementById("businessType").value] || 0;
    score += weights[document.getElementById("cashTurnover").value] || 0;
    score += weights[document.getElementById("international").value] || 0;
    score += weights[document.getElementById("pep").value] || 0;

    Object.keys(controls).forEach(id => {
        if (document.getElementById(id).checked) score = Math.max(0, score - 8);
    });

    score = Math.min(100, Math.max(0, score));
    const risk = getRiskLevel(score);

    document.getElementById("placeholderCard").style.display = "none";
    document.getElementById("resultCard").classList.add("active");

    const fill = document.getElementById("scoreFill");
    fill.setAttribute("class", `fill ${risk.class}`);
    const offset = 314 - (score / 100) * 314;
    fill.style.strokeDashoffset = offset;

    document.getElementById("scoreValue").textContent = `${score}%`;
    const labelEl = document.getElementById("riskLabel");
    labelEl.textContent = risk.label;
    labelEl.className = `risk-label ${risk.class}`;
    document.getElementById("riskDesc").textContent = risk.desc;

    const list = document.getElementById("actionList");
    list.innerHTML = "";
    const recommendations = [];
    Object.keys(controls).forEach(id => {
        if (!document.getElementById(id).checked || score >= 40) {
            const li = document.createElement("li");
            li.textContent = controls[id];
            list.appendChild(li);
            recommendations.push(controls[id]);
        }
    });
    if (score >= 70) {
        const li = document.createElement("li");
        li.textContent = "Consider an independent AML compliance review or consultation.";
        list.appendChild(li);
        recommendations.push(li.textContent);
    }

    await saveScreening(score, risk, recommendations);
    await loadHistory();
};

document.getElementById("printBtn").onclick = () => window.print();

loadHistory();
