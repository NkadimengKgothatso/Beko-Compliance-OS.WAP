/**
 * Beko ComplianceOS — required compliance documents per business profile.
 * Shared by the Documents page and the dashboard missing-documents alert.
 */

export const MAX_FILE_MB = 10;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"];
export const ACCEPT_ATTR = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png";

export const REQUIRED_DOCS = [
    {
        id: "cipc-certificate",
        label: "CIPC registration certificate",
        hint: "Your company registration certificate (CoR14.3) from CIPC."
    },
    {
        id: "director-ids",
        label: "Director ID documents",
        hint: "Certified ID copies of all directors."
    },
    {
        id: "tax-clearance",
        label: "Tax compliance status / tax clearance",
        hint: "Tax Compliance Status PIN or tax clearance certificate from SARS."
    },
    {
        id: "annual-return",
        label: "CIPC annual return proof",
        hint: "Proof of filing for your latest CIPC annual return.",
        when: p => !!p.cipc_annual_return && p.cipc_annual_return !== "not-filed"
    },
    {
        id: "vat-registration",
        label: "VAT registration certificate (VAT103)",
        hint: "Your VAT registration certificate from SARS.",
        when: p => p.vat_registered === "yes"
    },
    {
        id: "paye-uif-registration",
        label: "PAYE / UIF / SDL registration (EMP101)",
        hint: "Employer registration confirmation from SARS.",
        when: p => Number(p.employees || 0) > 0
    },
    {
        id: "coida-letter",
        label: "COIDA letter of good standing",
        hint: "Current letter of good standing from the Compensation Fund.",
        when: p => Number(p.employees || 0) > 0
    },
    {
        id: "bbbee-certificate",
        label: "B-BBEE certificate or affidavit",
        hint: "Your B-BBEE certificate, or an EME/QSE affidavit if exempt."
    },
    {
        id: "address-proof",
        label: "Proof of business address",
        hint: "Utility bill, lease agreement, or bank statement showing your business address."
    }
];

export function requiredDocsFor(profile) {
    return REQUIRED_DOCS.filter(d => !d.when || d.when(profile || {}));
}

// Map of doc_type -> most recent document, used to tell which requirements are met.
export function matchDocuments(docs) {
    const byType = new Map();
    (docs || []).forEach(doc => {
        if (!doc || !doc.doc_type) return;
        const existing = byType.get(doc.doc_type);
        if (!existing || new Date(doc.created_at) > new Date(existing.created_at)) {
            byType.set(doc.doc_type, doc);
        }
    });
    return byType;
}

export function missingDocsFor(profile, docs) {
    const matched = matchDocuments(docs);
    return requiredDocsFor(profile).filter(d => !matched.has(d.id));
}

export function docLabel(id) {
    const doc = REQUIRED_DOCS.find(d => d.id === id);
    return doc ? doc.label : null;
}

export function validateFile(file) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        return `${file.name} was skipped — only PDF, Word, Excel, and image files (jpg, png) are allowed.`;
    }
    if (file.size > MAX_FILE_BYTES) {
        return `${file.name} is too large (${formatBytes(file.size)}). Maximum allowed size is ${MAX_FILE_MB} MB.`;
    }
    return null;
}

export function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
