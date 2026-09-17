
import { supabase } from "/supabase.js";

const articles = [
    {
        id: "register-business", tag: "CIPC", title: "How to register a business in South Africa", read: "4 min",
        summary: "A step-by-step guide to company registration, from name reservation to final CIPC certificate.",
        body: `
            <h2>How to register a business in South Africa</h2>
            <p>Registering a company in South Africa is done through the Companies and Intellectual Property Commission (CIPC).</p>
            <ul>
                <li>Reserve a company name or use a registration number directly.</li>
                <li>Complete the CoR14.1 application with director and shareholder details.</li>
                <li>Pay the R175 registration fee (as of 2026).</li>
                <li>Receive your company registration certificate.</li>
            </ul>
            <p>After registration, you must file annual returns and maintain accurate company records.</p>
        `
    },
    {
        id: "tax-basics", tag: "SARS", title: "SARS tax basics for small business", read: "5 min",
        summary: "Understand income tax, VAT, PAYE, and provisional tax for your business stage.",
        body: `
            <h2>SARS tax basics for small business</h2>
            <p>Most South African businesses need to register for one or more tax types:</p>
            <ul>
                <li><strong>Income tax:</strong> All registered companies must submit annual returns.</li>
                <li><strong>Provisional tax:</strong> Pay tax in advance twice a year if you earn taxable income.</li>
                <li><strong>VAT:</strong> Compulsory once turnover exceeds R1 million in 12 months (voluntary from R50,000).</li>
                <li><strong>PAYE/UIF/SDL:</strong> Required if you employ staff.</li>
            </ul>
            <p>Keep invoices, bank statements, and expense records for at least five years.</p>
        `
    },
    {
        id: "uif-guide", tag: "UIF", title: "UIF and labour law for employers", read: "4 min",
        summary: "What you must know about UIF registration, monthly declarations, and employee rights.",
        body: `
            <h2>UIF and labour law for employers</h2>
            <p>If you employ anyone for more than 24 hours per month, you must register with UIF and deduct 1% from the employee's pay plus contribute 1% as the employer.</p>
            <ul>
                <li>Register as an employer on uFiling.</li>
                <li>Declare and pay contributions monthly.</li>
                <li>Provide payslips and maintain employment contracts.</li>
            </ul>
            <p>Non-compliance can lead to penalties and labour disputes.</p>
        `
    },
    {
        id: "annual-returns", tag: "CIPC", title: "CIPC annual returns explained", read: "3 min",
        summary: "Why annual returns matter, how much they cost, and what happens if you miss the deadline.",
        body: `
            <h2>CIPC annual returns explained</h2>
            <p>Every registered company must file an annual return with CIPC within 30 days of its anniversary date.</p>
            <ul>
                <li>Fees range from R100 to R450 depending on company turnover.</li>
                <li>Late filing leads to penalties and eventual deregistration.</li>
                <li>File online at the CIPC eServices portal.</li>
            </ul>
            <p>Deregistration means your company no longer legally exists and cannot enter contracts or open bank accounts.</p>
        `
    },
    {
        id: "contracts-101", tag: "Legal", title: "Contracts every small business needs", read: "4 min",
        summary: "Service agreements, NDAs, employment contracts, and terms of service — what they protect.",
        body: `
            <h2>Contracts every small business needs</h2>
            <ul>
                <li><strong>Service agreement:</strong> Defines scope, payment, and liability with clients.</li>
                <li><strong>NDA:</strong> Protects confidential information shared with partners or staff.</li>
                <li><strong>Employment contract:</strong> Sets out duties, salary, leave, and termination rules.</li>
                <li><strong>Terms of service:</strong> Governs how customers use your product or service.</li>
            </ul>
            <p>Use the Template Library to download starter versions of these documents.</p>
        `
    },
    {
        id: "bbbee", tag: "B-BBEE", title: "B-BBEE for small business", read: "3 min",
        summary: "Exempted Micro-Enterprises (EMEs) and Qualifying Small Enterprises (QSEs) explained.",
        body: `
            <h2>B-BBEE for small business</h2>
            <p>Broad-Based Black Economic Empowerment (B-BBEE) measures economic participation by black South Africans.</p>
            <ul>
                <li>Automatic Level 4 or better for EMEs (turnover under R10 million).</li>
                <li>Sworn affidavit or B-BBEE certificate may be required for tenders.</li>
                <li>QSEs (turnover R10m – R50m) use a scorecard with priority elements.</li>
            </ul>
            <p>Having a valid B-BBEE affidavit can help you access corporate and government contracts.</p>
        `
    },
    {
        id: "record-keeping", tag: "SARS", title: "Record keeping for SARS and CIPC", read: "3 min",
        summary: "What documents to keep, for how long, and how to organise them.",
        body: `
            <h2>Record keeping for SARS and CIPC</h2>
            <p>Good records reduce audit risk and make tax filing easier.</p>
            <ul>
                <li>Keep all invoices, receipts, and bank statements for 5 years.</li>
                <li>Store CIPC certificates, MOI, and shareholder registers safely.</li>
                <li>Reconcile your books monthly, not only at year-end.</li>
            </ul>
            <p>Cloud accounting software like Xero, Sage, or QuickBooks can automate much of this.</p>
        `
    },
    {
        id: "tendering", tag: "Tenders", title: "How to apply for tenders", read: "5 min",
        summary: "Where to find tenders, common requirements, and how to avoid disqualification.",
        body: `
            <h2>How to apply for tenders</h2>
            <p>Government and corporate tenders are published on platforms like eTenderPortal, National Treasury, and municipal websites.</p>
            <ul>
                <li>Check compliance requirements before bidding.</li>
                <li>Prepare tax clearance, B-BBEE affidavit, and company registration.</li>
                <li>Submit before the deadline and keep proof of submission.</li>
            </ul>
            <p>Use the Tenders page to see sample opportunities.</p>
        `
    },
    {
        id: "popia", tag: "POPIA", title: "POPIA basics for SMEs", read: "4 min",
        summary: "Understand lawful processing, consent, data subject rights, and security safeguards.",
        body: `
            <h2>POPIA basics for SMEs</h2>
            <p>The Protection of Personal Information Act applies to anyone who processes personal information in South Africa.</p>
            <ul>
                <li>Only collect information you really need.</li>
                <li>Get consent where required and tell people why you process their data.</li>
                <li>Keep information accurate and secure.</li>
                <li>Respond to requests to access, correct, or delete personal information.</li>
                <li>Report serious data breaches to the Information Regulator.</li>
            </ul>
            <p>Use the Compliance page to run the POPIA readiness checklist.</p>
        `
    },
    {
        id: "sarselfiling", tag: "SARS", title: "SARS eFiling for business", read: "4 min",
        summary: "How to register for eFiling, link your tax types, and submit returns online.",
        body: `
            <h2>SARS eFiling for business</h2>
            <p>SARS eFiling lets businesses submit returns, make payments, and track correspondence online.</p>
            <ul>
                <li>Register your business profile at sarsefiling.co.za.</li>
                <li>Request each tax type you are registered for.</li>
                <li>Keep login credentials safe and update contact details.</li>
                <li>Submit returns before midnight on the due date.</li>
                <li>Keep supporting documents for at least five years.</li>
            </ul>
            <p>Late submissions attract penalties and interest.</p>
        `
    },
    {
        id: "coida", tag: "COIDA", title: "COIDA registration and claims", read: "4 min",
        summary: "Why employers must register with the Compensation Fund and what happens after an injury.",
        body: `
            <h2>COIDA registration and claims</h2>
            <p>The Compensation for Occupational Injuries and Diseases Act requires most employers to register and pay annual assessments.</p>
            <ul>
                <li>Register with the Compensation Fund if you employ anyone.</li>
                <li>Submit the annual return of earnings by 31 March.</li>
                <li>Report workplace injuries within the required timeframes.</li>
                <li>Keep medical reports and incident records.</li>
            </ul>
            <p>Non-registration can lead to fines and personal liability.</p>
        `
    },
    {
        id: "ip-basics", tag: "IP", title: "Protecting your intellectual property", read: "4 min",
        summary: "Trademarks, copyrights, patents, and trade secrets explained for small business.",
        body: `
            <h2>Protecting your intellectual property</h2>
            <p>Intellectual property can be one of your business's most valuable assets.</p>
            <ul>
                <li><strong>Trademarks:</strong> Protect names, logos, and slogans through CIPC.</li>
                <li><strong>Copyright:</strong> Automatically protects original creative work.</li>
                <li><strong>Patents:</strong> Protect new inventions for up to 20 years.</li>
                <li><strong>Trade secrets:</strong> Protect through confidentiality clauses and NDAs.</li>
            </ul>
            <p>Use NDAs before sharing sensitive business information.</p>
        `
    },
    {
        id: "sars-audit", tag: "SARS", title: "How to handle a SARS audit", read: "5 min",
        summary: "What to do when SARS requests information, and how to prepare supporting documents.",
        body: `
            <h2>How to handle a SARS audit</h2>
            <p>A SARS audit or verification can be stressful, but preparation reduces risk.</p>
            <ul>
                <li>Read the letter carefully and note the deadline.</li>
                <li>Gather the specific documents requested.</li>
                <li>Reconcile your accounting records to your tax returns.</li>
                <li>Respond through eFiling or the channel SARS specifies.</li>
                <li>Consider involving your accountant or tax practitioner.</li>
            </ul>
            <p>Keep all communication and proof of submission.</p>
        `
    },
    {
        id: "ohs", tag: "OHS", title: "Workplace health and safety essentials", read: "4 min",
        summary: "Basic duties under the Occupational Health and Safety Act for small employers.",
        body: `
            <h2>Workplace health and safety essentials</h2>
            <p>Employers must provide a workplace that is safe and without risk to health, as far as reasonably practicable.</p>
            <ul>
                <li>Identify hazards and assess risks regularly.</li>
                <li>Provide information, instructions, and training.</li>
                <li>Maintain equipment and safety equipment.</li>
                <li>Keep an incident register and report serious incidents.</li>
                <li>Display evacuation plans and first-aid facilities.</li>
            </ul>
            <p>Templates include a health and safety policy you can adapt.</p>
        `
    }
];

function render(searchTerm = "") {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    const filtered = articles.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.summary.toLowerCase().includes(searchTerm.toLowerCase()) || a.tag.toLowerCase().includes(searchTerm.toLowerCase()));
    filtered.forEach(a => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `<span class="tag">${a.tag}</span><h3>${a.title}</h3><p>${a.summary}</p><small>\u23f5 ${a.read} read</small>`;
        card.onclick = () => openModal(a);
        grid.appendChild(card);
    });
}

function openModal(a) {
    window.currentArticle = a;
    document.getElementById("modalBody").innerHTML = `
        <div class="slide-action">
            <button class="btn-slide" onclick="downloadSlides()"><i class="fas fa-file-pdf"></i> Download slides (PDF)</button>
        </div>
        ${a.body}
    `;
    document.getElementById("modal").classList.add("active");
}

let logoDataUrl = null;
function loadLogo() {
    if (logoDataUrl) return Promise.resolve(logoDataUrl);
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                logoDataUrl = canvas.toDataURL("image/jpeg", 0.9);
            } catch (e) { logoDataUrl = null; }
            resolve(logoDataUrl);
        };
        img.onerror = () => resolve(null);
        img.src = "/beko-logo.png";
    });
}

function parseArticleSlides(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    const slides = [];
    let current = { title: "", bullets: [] };
    Array.from(div.children).forEach(node => {
        const tag = node.tagName;
        if (tag === "H2") {
            if (current.title || current.bullets.length) slides.push(current);
            current = { title: node.textContent.trim(), bullets: [] };
        } else if (tag === "P") {
            const txt = node.textContent.trim();
            if (txt) current.bullets.push(txt);
        } else if (tag === "UL" || tag === "OL") {
            Array.from(node.querySelectorAll("li")).forEach(li => {
                const t = li.textContent.trim();
                if (t) current.bullets.push(t);
            });
        }
    });
    if (current.title || current.bullets.length) slides.push(current);
    return slides;
}

async function downloadSlides() {
    const a = window.currentArticle;
    if (!a) return;
    await loadLogo();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("landscape", "mm", "a4");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;
    const navy = [27, 42, 92];
    const teal = [44, 181, 184];

    function drawHeader() {
        if (logoDataUrl) {
            try { doc.addImage(logoDataUrl, "JPEG", margin, 10, 20, 10); } catch (e) {}
        }
        doc.setFontSize(8);
        doc.setTextColor(...navy);
        doc.setFont("helvetica", "bold");
        doc.text("BEKO COMPLIANCEOS", pageW - margin, 14, { align: "right" });
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "normal");
        doc.text("South African SME compliance tools", pageW - margin, 18, { align: "right" });
        doc.setDrawColor(...teal);
        doc.setLineWidth(0.5);
        doc.line(margin, 22, pageW - margin, 22);
    }
    function drawFooter(pg, total) {
        const y = pageH - 10;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(margin, y - 3, pageW - margin, y - 3);
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text("For educational guidance only. Seek professional advice.", margin, y);
        doc.text(`${pg} / ${total}`, pageW - margin, y, { align: "right" });
    }
    function addPage() { doc.addPage(); drawHeader(); }

    drawHeader();
    let y = 35;
    doc.setFontSize(22);
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.text(a.title, margin, y);
    y += 10;
    doc.setFontSize(11);
    doc.setTextColor(...teal);
    doc.setFont("helvetica", "italic");
    doc.text(`${a.tag} · ${a.read} read`, margin, y);
    y += 16;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    const summaryLines = doc.splitTextToSize(a.summary, pageW - margin * 2);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5 + 10;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Generated by Beko ComplianceOS", margin, y);

    const slides = parseArticleSlides(a.body);
    slides.forEach((slide) => {
        addPage();
        y = 35;
        doc.setFontSize(16);
        doc.setTextColor(...teal);
        doc.setFont("helvetica", "bold");
        doc.text(slide.title || "Key points", margin, y);
        y += 12;
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        doc.setFont("helvetica", "normal");
        slide.bullets.forEach(bullet => {
            if (y > pageH - 30) { addPage(); y = 35; }
            const wrapped = doc.splitTextToSize(bullet, pageW - margin * 2 - 8);
            doc.text("•", margin, y);
            doc.text(wrapped, margin + 6, y);
            y += wrapped.length * 5 + 5;
        });
    });

    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        drawFooter(i, total);
    }
    doc.save(`${a.id}-slides.pdf`);
}

document.getElementById("search").oninput = e => render(e.target.value);
document.getElementById("closeModal").onclick = () => document.getElementById("modal").classList.remove("active");
document.getElementById("modal").onclick = e => { if (e.target.id === "modal") document.getElementById("modal").classList.remove("active"); };

const { data: { user } } = await supabase.auth.getUser();
if (!user) window.location.href = "/login/login.html";
document.getElementById("userEmail").textContent = user?.email || "—";
document.getElementById("userName").textContent = user?.user_metadata?.full_name || "User";

document.getElementById("logoutBtn").onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login/login.html";
};

render();
