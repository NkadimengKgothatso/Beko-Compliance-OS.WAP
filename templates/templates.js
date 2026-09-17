
import { supabase } from "/supabase.js";

const templates = [
    { id: "service-agreement", name: "Service Agreement", cat: "contracts", icon: "fa-file-signature", desc: "Standard contract for providing services to a client. Includes scope, payment, and termination clauses." },
    { id: "nda", name: "Non-Disclosure Agreement", cat: "legal", icon: "fa-user-secret", desc: "Protect confidential information shared with employees, partners, or potential investors." },
    { id: "employment-contract", name: "Employment Contract", cat: "hr", icon: "fa-id-card", desc: "Basic employment terms compliant with South African labour law." },
    { id: "affidavit", name: "Affidavit Template", cat: "legal", icon: "fa-file-alt", desc: "General affidavit format for sworn statements and declarations." },
    { id: "tax-invoice", name: "Tax Invoice Template", cat: "tax", icon: "fa-file-invoice-dollar", desc: "SARS-compliant tax invoice with all required fields." },
    { id: "leave-policy", name: "Leave Policy", cat: "hr", icon: "fa-umbrella-beach", desc: "Annual, sick, and family leave policy for employees." },
    { id: "contractor-agreement", name: "Independent Contractor Agreement", cat: "contracts", icon: "fa-handshake", desc: "Agreement for freelancers and contractors to clarify deliverables and payment." },
    { id: "privacy-policy", name: "Privacy Policy", cat: "legal", icon: "fa-shield-alt", desc: "Basic privacy policy covering personal data processing for SMEs." },
    { id: "terms-of-service", name: "Terms of Service", cat: "legal", icon: "fa-gavel", desc: "Standard terms and conditions for customers using your services." },
    { id: "expense-claim", name: "Expense Claim Form", cat: "tax", icon: "fa-receipt", desc: "Employee expense claim form with VAT treatment." },
    { id: "disciplinary", name: "Disciplinary Procedure", cat: "hr", icon: "fa-exclamation-triangle", desc: "Fair disciplinary process aligned with South African labour law." },
    { id: "shareholders", name: "Shareholders Agreement", cat: "contracts", icon: "fa-users", desc: "Agreement between company shareholders covering roles, dividends, and exit." },
    { id: "loan-agreement", name: "Loan Agreement", cat: "contracts", icon: "fa-money-bill-wave", desc: "Formalise a loan between the company and a director, shareholder, or third party." },
    { id: "data-processing", name: "Data Processing Agreement", cat: "legal", icon: "fa-database", desc: "POPIA-compliant agreement for processors handling personal information on your behalf." },
    { id: "letter-of-demand", name: "Letter of Demand", cat: "legal", icon: "fa-envelope-open-text", desc: "Demand payment or performance before escalating to legal action." },
    { id: "subcontractor-agreement", name: "Subcontractor Agreement", cat: "contracts", icon: "fa-people-carry", desc: "Contract when you outsource part of a project to another party." },
    { id: "moi", name: "Memorandum of Incorporation", cat: "corporate", icon: "fa-building", desc: "Founding document that sets out the rights and duties of shareholders and directors." },
    { id: "board-resolution", name: "Board Resolution", cat: "corporate", icon: "fa-clipboard-check", desc: "Record a formal decision made by the board of directors." },
    { id: "restraint-of-trade", name: "Restraint of Trade Agreement", cat: "legal", icon: "fa-lock", desc: "Restrict an employee or seller from competing for a defined period and area." },
    { id: "health-safety-policy", name: "Health and Safety Policy", cat: "policies", icon: "fa-hard-hat", desc: "Commitment to a safe workplace aligned with the OHS Act." },
    { id: "remote-work-policy", name: "Remote Work Policy", cat: "policies", icon: "fa-laptop-house", desc: "Rules and expectations for employees working from home or off-site." },
    { id: "supplier-code", name: "Supplier Code of Conduct", cat: "policies", icon: "fa-truck", desc: "Set labour, environmental, and ethics expectations for suppliers." }
];

function generateDoc(template) {
    const date = new Date().toLocaleDateString('en-ZA');
    const docs = {
        "service-agreement": `SERVICE AGREEMENT\n\nDate: ${date}\n\nBetween:\n[Service Provider Name]\n[Registration number]\n[Address]\n\nAnd:\n[Client Name]\n[Address]\n\n1. SERVICES\nThe service provider agrees to perform the following services:\n[Describe services in detail]\n\n2. FEES AND PAYMENT\nThe client agrees to pay the service provider the agreed fee within 30 days of invoice.\n\n3. TERM\nThis agreement starts on [start date] and continues until [end date / project completion].\n\n4. TERMINATION\nEither party may terminate this agreement with 14 days written notice.\n\n5. GOVERNING LAW\nThis agreement is governed by the laws of the Republic of South Africa.\n\nSigned: ___________________\nService Provider\n\nSigned: ___________________\nClient`,
        "nda": `NON-DISCLOSURE AGREEMENT\n\nDate: ${date}\n\nBetween:\n[Disclosing Party]\n\nAnd:\n[Receiving Party]\n\n1. PURPOSE\nThe parties wish to explore a business opportunity and may disclose confidential information.\n\n2. CONFIDENTIAL INFORMATION\nIncludes business plans, financial data, customer lists, technical information, and trade secrets.\n\n3. OBLIGATIONS\nThe receiving party agrees to keep all confidential information secret and not disclose it to third parties.\n\n4. DURATION\nThis agreement remains in effect for 3 years from the date of signing.\n\n5. GOVERNING LAW\nThis agreement is governed by the laws of the Republic of South Africa.\n\nSigned: ___________________\nDisclosing Party\n\nSigned: ___________________\nReceiving Party`,
        "employment-contract": `EMPLOYMENT CONTRACT\n\nDate: ${date}\n\nEmployer:\n[Company name]\n[Registration number]\n[Address]\n\nEmployee:\n[Full name]\n[ID number]\n[Address]\n\n1. POSITION\nThe employee is employed as: [Job title]\n\n2. START DATE\nEmployment commences on: [Start date]\n\n3. REMUNERATION\nMonthly salary: R[Amount]\nPayment date: [Date]\n\n4. WORKING HOURS\n[Number] hours per week, Monday to Friday.\n\n5. LEAVE\nAnnual leave: 21 days per year. Sick leave in accordance with the Basic Conditions of Employment Act.\n\n6. TERMINATION\nNotice period: [1 calendar month / as per applicable law]\n\nSigned: ___________________\nEmployer\n\nSigned: ___________________\nEmployee`,
        "affidavit": `AFFIDAVIT\n\nI, the undersigned,\n\n[Full names]\n[ID number]\n[Residential address]\n\ndo hereby make oath and state that:\n\n1. [State fact 1]\n2. [State fact 2]\n3. [State fact 3]\n\nI declare that the above is true and correct to the best of my knowledge.\n\nSigned and sworn to before me at [place] on ${date}.\n\nDeponent: ___________________\n\nCommissioner of Oaths: ___________________`,
        "tax-invoice": `TAX INVOICE\n\nInvoice number: [INV-001]\nDate: ${date}\n\nSupplier:\n[Company name]\n[VAT registration number (if applicable)]\n[Address]\n\nCustomer:\n[Customer name]\n[Address]\n\nDescription | Quantity | Unit price | Amount\n[Item 1] | 1 | R0.00 | R0.00\n[Item 2] | 1 | R0.00 | R0.00\n\nSubtotal: R0.00\nVAT (15%): R0.00\nTotal: R0.00\n\nPayment terms: 30 days`,
        "leave-policy": `LEAVE POLICY\n\nEffective date: ${date}\n\n1. ANNUAL LEAVE\nAll permanent employees are entitled to 21 consecutive days of annual leave per leave cycle.\n\n2. SICK LEAVE\nEmployees are entitled to sick leave as per the Basic Conditions of Employment Act.\n\n3. FAMILY RESPONSIBILITY LEAVE\nEmployees may take up to 3 days paid family responsibility leave per year.\n\n4. MATERNITY LEAVE\nFemale employees are entitled to 4 consecutive months of maternity leave.\n\n5. LEAVE APPLICATION\nAll leave must be requested in writing and approved by a manager.`,
        "contractor-agreement": `INDEPENDENT CONTRACTOR AGREEMENT\n\nDate: ${date}\n\nBetween:\n[Company name]\n\nAnd:\n[Contractor name]\n\n1. SERVICES\nThe contractor agrees to provide the following services:\n[Describe services]\n\n2. PAYMENT\nThe company will pay the contractor R[amount] upon completion of the services.\n\n3. TAX STATUS\nThe contractor is an independent contractor and is responsible for their own tax obligations.\n\n4. TERMINATION\nEither party may terminate this agreement with 7 days written notice.\n\n5. GOVERNING LAW\nThis agreement is governed by the laws of the Republic of South Africa.\n\nSigned: ___________________\nCompany\n\nSigned: ___________________\nContractor`,
        "privacy-policy": `PRIVACY POLICY\n\nLast updated: ${date}\n\n1. INTRODUCTION\n[Company name] respects your privacy and is committed to protecting your personal information.\n\n2. INFORMATION WE COLLECT\nWe collect names, contact details, business information, and usage data.\n\n3. HOW WE USE INFORMATION\nWe use your information to provide services, communicate with you, and comply with legal obligations.\n\n4. SHARING INFORMATION\nWe do not sell your personal information. We may share it with service providers or when required by law.\n\n5. YOUR RIGHTS\nYou have the right to access, correct, or delete your personal information.\n\n6. CONTACT US\n[Email]`,
        "terms-of-service": `TERMS OF SERVICE\n\nLast updated: ${date}\n\n1. ACCEPTANCE\nBy using our services, you agree to these terms.\n\n2. SERVICES\nWe provide compliance guidance, templates, and related tools.\n\n3. USER RESPONSIBILITIES\nYou agree to provide accurate information and use the services lawfully.\n\n4. LIMITATION OF LIABILITY\nOur services are provided for guidance only and do not constitute legal advice.\n\n5. CHANGES\nWe may update these terms from time to time.\n\n6. GOVERNING LAW\nThese terms are governed by the laws of the Republic of South Africa.`,
        "expense-claim": `EXPENSE CLAIM FORM\n\nEmployee name: [Name]\nDepartment: [Department]\nDate submitted: ${date}\n\nDate | Description | Amount | VAT incl.\n[Date] | [Description] | R0.00 | Yes/No\n\nTotal claimed: R0.00\n\nApproved by: ___________________\nDate: ___________________`,
        "disciplinary": `DISCIPLINARY PROCEDURE\n\nEffective date: ${date}\n\n1. PURPOSE\nTo ensure fair and consistent handling of misconduct in the workplace.\n\n2. INFORMAL WARNING\nMinor issues may be addressed through verbal counselling.\n\n3. FORMAL WARNING\nRepeated or serious misconduct will result in a written warning.\n\n4. DISCIPLINARY HEARING\nFor gross misconduct, the employee is entitled to a disciplinary hearing.\n\n5. SANCTIONS\nSanctions may include final written warning, suspension, or dismissal.\n\n6. APPEAL\nEmployees may appeal disciplinary decisions within 5 working days.`,
        "shareholders": `SHAREHOLDERS AGREEMENT\n\nDate: ${date}\n\nBetween:\n[Shareholder 1]\n[Shareholder 2]\n\n1. COMPANY\nThe parties are shareholders of [Company name] (registration number [reg number]).\n\n2. SHAREHOLDING\nShareholder 1: [Number] shares\nShareholder 2: [Number] shares\n\n3. DIRECTORS\nThe board shall consist of [number] directors.\n\n4. DIVIDENDS\nDividends will be declared in proportion to shareholding.\n\n5. TRANSFER OF SHARES\nNo shareholder may transfer shares without first offering them to existing shareholders.\n\n6. DISPUTE RESOLUTION\nDisputes shall first be referred to mediation.\n\n7. GOVERNING LAW\nThis agreement is governed by the laws of the Republic of South Africa.\n\nSigned: ___________________\nShareholder 1\n\nSigned: ___________________\nShareholder 2`,
        "loan-agreement": `LOAN AGREEMENT\n\nDate: ${date}\n\nLender:\n[Name]\n[Address]\n\nBorrower:\n[Company name]\n[Registration number]\n[Address]\n\n1. LOAN AMOUNT\nThe lender agrees to lend R[amount] to the borrower.\n\n2. INTEREST\nInterest will be charged at [rate]% per annum, calculated monthly.\n\n3. REPAYMENT\nThe borrower will repay the loan in [number] instalments of R[amount] commencing on [date].\n\n4. DEFAULT\nIf the borrower fails to pay any instalment within 7 days of the due date, the full outstanding amount becomes immediately due.\n\n5. GOVERNING LAW\nThis agreement is governed by the laws of the Republic of South Africa.\n\nSigned: ___________________\nLender\n\nSigned: ___________________\nBorrower`,
        "data-processing": `DATA PROCESSING AGREEMENT\n\nDate: ${date}\n\nBetween:\n[Responsible party — Company name]\n\nAnd:\n[Operator — Service provider name]\n\n1. PURPOSE\nThe operator will process personal information on behalf of the responsible party for [describe service].\n\n2. POPIA COMPLIANCE\nThe operator agrees to process personal information only with the responsible party's knowledge and authorisation, and to treat it as confidential.\n\n3. SECURITY\nThe operator will implement appropriate, reasonable technical and organisational measures to safeguard personal information.\n\n4. SUB-PROCESSORS\nThe operator may not use sub-processors without the responsible party's prior written consent.\n\n5. DATA SUBJECT RIGHTS\nThe operator will assist the responsible party in responding to data subject requests.\n\n6. BREACH NOTIFICATION\nThe operator will notify the responsible party immediately on becoming aware of any personal information breach.\n\n7. TERMINATION\nOn termination, the operator will return or destroy personal information as directed by the responsible party.\n\n8. GOVERNING LAW\nThis agreement is governed by the laws of the Republic of South Africa.\n\nSigned: ___________________\nResponsible party\n\nSigned: ___________________\nOperator`,
        "letter-of-demand": `LETTER OF DEMAND\n\nDate: ${date}\n\nTo:\n[Debtor name]\n[Address]\n\nRE: Demand for payment of R[amount]\n\nDear [Debtor name],\n\nYou owe [Company name] the sum of R[amount] in respect of [invoice number / description of debt], which was due for payment on [due date].\n\nDespite repeated requests, payment has not been received.\n\nYou are hereby demanded to pay the full amount within 7 (seven) days from the date of this letter.\n\nShould payment not be received, we will institute legal proceedings against you to recover the debt, without further notice.\n\nYours faithfully,\n\n___________________\n[Authorised person]\n[Company name]`,
        "subcontractor-agreement": `SUBCONTRACTOR AGREEMENT\n\nDate: ${date}\n\nBetween:\n[Principal contractor — Company name]\n\nAnd:\n[Subcontractor name]\n[Registration number]\n\n1. SUBCONTRACT WORK\nThe subcontractor agrees to perform the following work:\n[Describe work]\n\n2. PAYMENT\nThe principal contractor will pay R[amount] on [terms].\n\n3. STANDARDS\nThe subcontractor must perform the work to the standard and timeline agreed in the main contract.\n\n4. INDEPENDENT CONTRACTOR\nThe subcontractor is an independent contractor and is responsible for its own tax and labour law compliance.\n\n5. INSURANCE\nThe subcontractor must maintain adequate public liability and workers' compensation insurance.\n\n6. TERMINATION\nEither party may terminate this agreement with 14 days written notice.\n\n7. GOVERNING LAW\nThis agreement is governed by the laws of the Republic of South Africa.\n\nSigned: ___________________\nPrincipal contractor\n\nSigned: ___________________\nSubcontractor`,
        "moi": `MEMORANDUM OF INCORPORATION\n\nCompany name: [Company name]\nRegistration number: [Registration number]\nDate: ${date}\n\n1. NAME\nThe name of the company is [Company name].\n\n2. TYPE OF COMPANY\nThe company is a [private / public] company with [number] authorised shares.\n\n3. OBJECTS\nThe primary object of the company is to [describe business objects].\n\n4. SHARE CAPITAL\nAuthorised shares: [number]\nIssued shares: [number]\n\n5. DIRECTORS\nThe board shall consist of a minimum of [number] and a maximum of [number] directors.\n\n6. MEETINGS\nDirectors' meetings require [number] days' notice and a quorum of [number] directors.\n\n7. AMENDMENTS\nThis MOI may be amended only by special resolution of shareholders.\n\nSigned: ___________________\nIncorporator`,
        "board-resolution": `BOARD RESOLUTION\n\nCompany: [Company name]\nRegistration number: [Registration number]\nDate: ${date}\n\nThe following resolution was passed by the board of directors of [Company name] at a duly convened meeting:\n\nRESOLVED THAT:\n\n1. [Resolution item 1]\n2. [Resolution item 2]\n3. [Resolution item 3]\n\nThis resolution is valid and binding on the company with effect from the date hereof.\n\nSigned by the following directors:\n\n___________________\nDirector\n\n___________________\nDirector`,
        "restraint-of-trade": `RESTRAINT OF TRADE AGREEMENT\n\nDate: ${date}\n\nBetween:\n[Company name]\n\nAnd:\n[Employee / Seller name]\n\n1. RESTRAINT\nThe restrained party agrees not to engage in [type of business] within [area] for a period of [months] years after [termination / sale].\n\n2. CONFIDENTIALITY\nThe restrained party agrees not to use or disclose any confidential information of the company.\n\n3. SEVERABILITY\nIf any part of this agreement is found unenforceable, the remainder will continue in effect.\n\n4. REASONABLENESS\nThe parties confirm that the restraint is reasonable and necessary to protect legitimate proprietary interests.\n\n5. GOVERNING LAW\nThis agreement is governed by the laws of the Republic of South Africa.\n\nSigned: ___________________\nCompany\n\nSigned: ___________________\nRestrained party`,
        "health-safety-policy": `HEALTH AND SAFETY POLICY\n\nEffective date: ${date}\n\n1. POLICY STATEMENT\n[Company name] is committed to providing a safe and healthy workplace for all employees, contractors, and visitors.\n\n2. RESPONSIBILITIES\nManagement is responsible for identifying hazards, providing training, and ensuring compliance with the Occupational Health and Safety Act.\n\n3. EMPLOYEE DUTIES\nEmployees must follow safety procedures, report hazards, and use protective equipment provided.\n\n4. INCIDENT REPORTING\nAll accidents, injuries, and near-misses must be reported to management within 24 hours.\n\n5. EMERGENCY PROCEDURES\nEmergency exits, assembly points, and first-aid kits are clearly marked and maintained.\n\n6. REVIEW\nThis policy is reviewed annually or after any serious incident.`,
        "remote-work-policy": `REMOTE WORK POLICY\n\nEffective date: ${date}\n\n1. ELIGIBILITY\nRemote work is permitted for roles approved by management and employees who meet performance and equipment requirements.\n\n2. HOURS AND AVAILABILITY\nEmployees must be available during core hours and attend virtual meetings as required.\n\n3. EQUIPMENT AND SECURITY\nThe company may provide necessary equipment. Employees must protect company data, use approved software, and keep devices secure.\n\n4. HEALTH AND SAFETY\nEmployees are responsible for maintaining a safe home workspace and reporting work-related injuries.\n\n5. EXPENSES\nApproved remote-work expenses must be submitted in accordance with the company expense policy.\n\n6. TERMINATION OF REMOTE ARRANGEMENT\nThe company may change remote-work arrangements with reasonable notice.`,
        "supplier-code": `SUPPLIER CODE OF CONDUCT\n\nEffective date: ${date}\n\n1. LEGAL COMPLIANCE\nSuppliers must comply with all applicable South African laws, including labour, tax, and environmental laws.\n\n2. LABOUR STANDARDS\nSuppliers must pay fair wages, prohibit forced and child labour, and maintain safe working conditions.\n\n3. ETHICS\nSuppliers must not engage in bribery, corruption, fraud, or anti-competitive behaviour.\n\n4. ENVIRONMENT\nSuppliers should minimise waste, emissions, and environmental harm.\n\n5. CONFIDENTIALITY\nSuppliers must protect confidential information obtained through the business relationship.\n\n6. MONITORING\nThe company reserves the right to audit supplier compliance with this code.\n\n7. NON-COMPLIANCE\nFailure to meet this code may result in termination of the supplier relationship.`
    };
    return docs[template.id] || `${template.name.toUpperCase()}\n\nDate: ${date}\n\n[This is a template placeholder. Replace with your business details.]\n\n[Company name]\n[Registration number]\n[Address]`;
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
            } catch (e) {
                logoDataUrl = null;
            }
            resolve(logoDataUrl);
        };
        img.onerror = () => resolve(null);
        img.src = "/bg.jpeg";
    });
}

function isHeading(line) {
    const text = line.trim();
    if (!text) return false;
    // "1. INTRODUCTION" or "ARTICLE 1" style
    if (/^(\d+\.\s+[A-Z]|ARTICLE\s+\d+|SECTION\s+\d+|CLAUSE\s+\d+)/i.test(text)) return true;
    // Short all-caps lines like "INTRODUCTION" or "PAYMENT"
    if (text.length <= 40 && text === text.toUpperCase() && !text.startsWith("[") && !text.includes("R0")) return true;
    return false;
}

async function download(template) {
    await loadLogo();
    const content = generateDoc(template);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 16;
    const maxWidth = pageW - margin * 2;
    const navy = [27, 42, 92];
    const teal = [44, 181, 184];

    function drawHeader() {
        // Logo
        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, "JPEG", margin, 12, 28, 14);
            } catch (e) {
                // Ignore logo errors
            }
        }

        // Brand text
        doc.setFontSize(9);
        doc.setTextColor(...navy);
        doc.setFont("helvetica", "bold");
        doc.text("BEKO COMPLIANCEOS", pageW - margin, 18, { align: "right" });

        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "normal");
        doc.text("South African SME compliance tools", pageW - margin, 23, { align: "right" });

        // Accent rule
        doc.setDrawColor(...teal);
        doc.setLineWidth(1);
        doc.line(margin, 30, pageW - margin, 30);
    }

    function drawFooter(pageNum, totalPages) {
        const y = doc.internal.pageSize.getHeight() - 14;
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(margin, y - 4, pageW - margin, y - 4);

        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.setFont("helvetica", "normal");
        doc.text(`Generated ${new Date().toLocaleDateString("en-ZA")} · For guidance only. Seek professional legal advice before use.`, margin, y);
        doc.text(`${pageNum} / ${totalPages}`, pageW - margin, y, { align: "right" });
    }

    function addPage() {
        doc.addPage();
        drawHeader();
    }

    // Title page / first page header
    drawHeader();

    // Document title block
    let y = 42;
    doc.setFontSize(20);
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.text(template.name.toUpperCase(), margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "italic");
    doc.text(`Template reference: ${template.id} · Category: ${template.cat.toUpperCase()}`, margin, y);
    y += 14;

    // Body
    const lines = content.split("\n");
    const lineHeight = 5.5;
    const pageH = doc.internal.pageSize.getHeight();
    const contentBottom = pageH - 22;

    lines.forEach(line => {
        if (y > contentBottom) {
            addPage();
            y = 42;
        }

        const trimmed = line.trim();
        const heading = isHeading(line);

        if (heading) {
            // Section heading
            y += 3;
            doc.setFontSize(11);
            doc.setTextColor(...teal);
            doc.setFont("helvetica", "bold");
            const wrapped = doc.splitTextToSize(trimmed, maxWidth);
            doc.text(wrapped, margin, y);
            y += wrapped.length * lineHeight + 3;
        } else if (trimmed === "") {
            y += 3;
        } else {
            // Normal paragraph / list item
            doc.setFontSize(10);
            doc.setTextColor(30, 30, 30);
            doc.setFont("helvetica", "normal");
            const wrapped = doc.splitTextToSize(line, maxWidth);
            doc.text(wrapped, margin, y);
            y += wrapped.length * lineHeight + 1.5;
        }
    });

    // Footer on every page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(i, totalPages);
    }

    doc.save(`${template.id}.pdf`);
    toast(`Downloaded ${template.name}`);
}

// Preload logo as soon as the page loads
loadLogo();

function toast(message) {
    const el = document.createElement("div");
    el.className = "toast toast-success";
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 3000);
}

function render(filterCat = "all", searchTerm = "") {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    const filtered = templates.filter(t => {
        const matchCat = filterCat === "all" || t.cat === filterCat;
        const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.desc.toLowerCase().includes(searchTerm.toLowerCase());
        return matchCat && matchSearch;
    });
    filtered.forEach(t => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="icon"><i class="fas ${t.icon}"></i></div>
            <h3>${t.name}</h3>
            <div class="cat">${t.cat.charAt(0).toUpperCase() + t.cat.slice(1)}</div>
            <p>${t.desc}</p>
            <button class="btn">Download</button>
        `;
        card.querySelector("button").onclick = () => download(t);
        grid.appendChild(card);
    });
    if (filtered.length === 0) {
        grid.innerHTML = `<p style="color:var(--muted)">No templates match your search.</p>`;
    }
}

let currentCat = "all";
document.getElementById("tabs").onclick = e => {
    if (e.target.classList.contains("tab")) {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        e.target.classList.add("active");
        currentCat = e.target.dataset.cat;
        render(currentCat, document.getElementById("search").value);
    }
};
document.getElementById("search").oninput = e => render(currentCat, e.target.value);

const { data: { user } } = await supabase.auth.getUser();
if (!user) window.location.href = "/login/login.html";
document.getElementById("userEmail").textContent = user?.email || "—";
document.getElementById("userName").textContent = user?.user_metadata?.full_name || "User";

document.getElementById("logoutBtn").onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login/login.html";
};

render();
