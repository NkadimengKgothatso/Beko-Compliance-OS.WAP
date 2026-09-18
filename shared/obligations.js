/**
 * Beko ComplianceOS — obligation engine.
 * Builds a personalised obligation set from the company profile and scores compliance.
 *
 * NOTE: the tier weights, applicability rules, and status values below are a proposal
 * that still needs legal sign-off — see docs/compliance-scoring-model.md.
 */

import { matchDocuments } from "/shared/compliance-docs.js";

export const DUE_SOON_DAYS = 14;

export const TIER_WEIGHTS = { critical: 4, high: 3, medium: 2, low: 1 };

export const BANDS = [
    { id: "excellent", min: 90, short: "Excellent", label: "Excellent — fully compliant" },
    { id: "good", min: 75, short: "Good", label: "Good — minor items need attention" },
    { id: "at-risk", min: 50, short: "At risk", label: "At risk — several obligations need action" },
    { id: "critical", min: 0, short: "Critical", label: "Critical — immediate action required" }
];

export const REGULATORS = {
    sars: { label: "SARS" },
    cipc: { label: "CIPC" },
    labour: { label: "UIF / Dept of Labour" },
    ir: { label: "Information Regulator" },
    bbbee: { label: "B-BBEE" },
    sector: { label: "Sector regulator" }
};

export const STATUS_LABELS = {
    completed: "Completed",
    pending: "Pending",
    due_soon: "Due soon",
    overdue: "Overdue",
    not_applicable: "Not applicable"
};

const FREQUENCY_LABELS = {
    monthly: "Monthly",
    "semi-annual": "Twice a year",
    annual: "Annual",
    "once-off": "Once-off",
    "per-event": "Per event",
    ongoing: "Ongoing"
};

export function bandFor(score) {
    return BANDS.find(b => score >= b.min) || BANDS[BANDS.length - 1];
}

export function statusValue(status, weeksOverdue) {
    if (status === "due_soon") return 0.9;
    if (status === "overdue") return Math.max(0, 0.5 - 0.05 * (weeksOverdue || 0));
    return 1;
}

// ---- date helpers (UTC, ISO YYYY-MM-DD strings) ----

const DAY_MS = 86400000;

function parseISO(value) {
    const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
}

function isoOf(ms) {
    return new Date(ms).toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
    return isoOf(parseISO(isoDate) + days * DAY_MS);
}

function daysBetween(fromISO, toISO) {
    return Math.round((parseISO(toISO) - parseISO(fromISO)) / DAY_MS);
}

function lastDayOfFeb(year) {
    return isoOf(Date.UTC(year, 2, 0));
}

function todayISO() {
    return isoOf(Date.now());
}

// Earliest date we know the business existed: CIPC registration date, else account creation.
function windowStart(profile) {
    const raw = profile.registration_date || profile.created_at || null;
    return raw ? String(raw).slice(0, 10) : null;
}

// ---- schedule builders ----

function scheduleMonthly(day) {
    return (profile, today) => {
        const t = new Date(parseISO(today));
        const out = [];
        for (let i = -6; i <= 1; i++) {
            const y = t.getUTCFullYear();
            const m = t.getUTCMonth() + i;
            const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
            const due = isoOf(Date.UTC(y, m, Math.min(day, lastDay)));
            out.push({ key: due, dueDate: due });
        }
        return out;
    };
}

function scheduleAnnualFeb(profile, today) {
    const year = new Date(parseISO(today)).getUTCFullYear();
    const out = [];
    for (let i = -3; i <= 1; i++) {
        const due = lastDayOfFeb(year + i);
        out.push({ key: due, dueDate: due });
    }
    return out;
}

function scheduleProvisional(profile, today) {
    const year = new Date(parseISO(today)).getUTCFullYear();
    const out = [];
    for (let i = -2; i <= 1; i++) {
        const feb = lastDayOfFeb(year + i);
        const aug = isoOf(Date.UTC(year + i, 7, 31));
        out.push({ key: feb, dueDate: feb });
        out.push({ key: aug, dueDate: aug });
    }
    return out;
}

function scheduleAnniversary(offsetDays) {
    return (profile, today) => {
        if (!profile.registration_date) return [];
        const reg = new Date(parseISO(profile.registration_date));
        const year = new Date(parseISO(today)).getUTCFullYear();
        const out = [];
        for (let y = reg.getUTCFullYear() + 1; y <= year + 1; y++) {
            const base = isoOf(Date.UTC(y, reg.getUTCMonth(), reg.getUTCDate()));
            out.push({ key: addDays(base, offsetDays), dueDate: addDays(base, offsetDays) });
        }
        return out.slice(-6);
    };
}

function scheduleOnceOff(profile) {
    const start = windowStart(profile);
    if (!start) return [];
    const due = addDays(start, 30);
    return [{ key: due, dueDate: due }];
}

// ---- profile helpers ----

const COMPANY_TYPES = ["private-company", "non-profit"];
const SECTOR_INDUSTRIES = ["Hospitality", "Transport", "Manufacturing", "Construction", "Agriculture"];

function isCompany(p) {
    return COMPANY_TYPES.includes(p.business_type);
}

function employeesOf(p) {
    return Number(p.employees || 0);
}

function taxFiledSeed(p, monthly) {
    if (p.last_tax_filing === "current") return { completed: true, note: "Based on your profile: SARS filings up to date" };
    if (!monthly && p.last_tax_filing === "recent") return { completed: true, note: "Based on your profile: filed within the last year" };
    return null;
}

function cipcFilingsSeed(p) {
    if (p.cipc_annual_return === "current" || p.cipc_annual_return === "recent")
        return { completed: true, note: "Based on your profile: CIPC filings up to date" };
    if (p.cipc_annual_return === "overdue")
        return { overdue: true, note: "Based on your profile: annual return overdue" };
    return null;
}

// ---- master obligation set ----

export const OBLIGATIONS = [
    // ---- SARS ----
    {
        id: "sars-income-tax-return",
        title: "Income tax return (ITR12 / ITR14)",
        regulator: "sars",
        tier: "critical",
        frequency: "annual",
        dueRule: "Annual — last day of February",
        appliesIf: () => true,
        schedule: scheduleAnnualFeb,
        seed: p => taxFiledSeed(p, false),
        description: "Your yearly income tax return to SARS for the business.",
        why: "Unfiled returns lead to penalties and interest, and SARS can issue a final demand or appoint a debt collector. Directors can be held personally liable for company tax debts in some cases.",
        action: "File your outstanding income tax return on SARS eFiling."
    },
    {
        id: "sars-provisional-tax",
        title: "Provisional tax (IRP6)",
        regulator: "sars",
        tier: "critical",
        frequency: "semi-annual",
        dueRule: "Twice a year — 31 August and last day of February",
        appliesIf: p => isCompany(p) || (!!p.monthly_revenue && p.monthly_revenue !== "under-50k"),
        schedule: scheduleProvisional,
        seed: p => taxFiledSeed(p, false),
        description: "Two prepayments of your income tax during the year.",
        why: "Missing a provisional tax payment triggers a penalty plus interest, and your final tax bill grows.",
        action: "Submit your IRP6 provisional tax return on SARS eFiling."
    },
    {
        id: "sars-vat201",
        title: "VAT return (VAT201)",
        regulator: "sars",
        tier: "critical",
        frequency: "monthly",
        dueRule: "Monthly — by the 25th",
        appliesIf: p => p.vat_registered === "yes",
        schedule: scheduleMonthly(25),
        seed: p => taxFiledSeed(p, true),
        description: "Your monthly VAT return and payment to SARS.",
        why: "Late VAT returns carry a penalty and interest, and repeated non-compliance can lead to deregistration and criminal charges.",
        action: "Submit your VAT201 return and pay the amount due on SARS eFiling."
    },
    {
        id: "sars-emp201",
        title: "Employer return — PAYE, UIF, SDL (EMP201)",
        regulator: "sars",
        tier: "critical",
        frequency: "monthly",
        dueRule: "Monthly — by the 7th",
        appliesIf: p => employeesOf(p) > 0,
        schedule: scheduleMonthly(7),
        seed: p => taxFiledSeed(p, true),
        description: "Your monthly employer return declaring PAYE, UIF, and SDL for your employees.",
        why: "Unpaid PAYE and UIF lead to penalties, and directors can be held personally liable for employee taxes withheld but not paid over.",
        action: "Submit your EMP201 and pay the amounts due on SARS eFiling."
    },
    {
        id: "sars-customs",
        title: "Customs registration (importer / exporter code)",
        regulator: "sars",
        tier: "medium",
        frequency: "once-off",
        dueRule: "Once-off — before you start importing or exporting",
        appliesIf: p => p.imports_exports === "yes",
        description: "Your SARS customs code and registration, needed to trade goods across borders legally.",
        why: "Trading without customs registration can get shipments seized and attract fines.",
        action: "Confirm your customs code and importer/exporter registration on SARS eFiling."
    },

    // ---- CIPC ----
    {
        id: "cipc-annual-return",
        title: "CIPC annual return",
        regulator: "cipc",
        tier: "high",
        frequency: "annual",
        dueRule: "Annual — within 30 days of your registration anniversary",
        appliesIf: isCompany,
        schedule: scheduleAnniversary(30),
        seed: cipcFilingsSeed,
        evidence: (p, ctx) => hasDoc(ctx, "annual-return") ? { completed: true, note: "Annual return proof uploaded" } : null,
        description: "Your company's yearly filing with CIPC to keep the company active.",
        why: "Missing annual returns lead to deregistration and directors can be disqualified. Banks and clients check CIPC status before working with you.",
        action: "File your annual return on the CIPC eServices portal."
    },
    {
        id: "cipc-beneficial-ownership",
        title: "Beneficial ownership filing",
        regulator: "cipc",
        tier: "high",
        frequency: "annual",
        dueRule: "Annual — filed with your company's annual return",
        appliesIf: isCompany,
        schedule: scheduleAnniversary(30),
        seed: cipcFilingsSeed,
        description: "CIPC filing showing who ultimately owns and controls the company.",
        why: "Not filing beneficial ownership information is a criminal offence under the Companies Act and blocks your annual return.",
        action: "Submit your beneficial ownership information on the CIPC eServices portal."
    },
    {
        id: "cipc-afs",
        title: "Annual financial statements",
        regulator: "cipc",
        tier: "medium",
        frequency: "annual",
        dueRule: "Annual — with your company's annual return",
        appliesIf: isCompany,
        schedule: scheduleAnniversary(30),
        seed: cipcFilingsSeed,
        description: "Financial statements prepared and filed together with your annual return.",
        why: "CIPC requires financial statements with your annual return, and missing statements can lead to deregistration.",
        action: "Have your financial statements prepared and file them with your annual return."
    },
    {
        id: "cipc-audit",
        title: "Audit or independent review",
        regulator: "cipc",
        tier: "medium",
        frequency: "annual",
        dueRule: "Annual — when your company meets the size threshold",
        appliesIf: p => isCompany(p) && (p.monthly_revenue === "over-500k" || employeesOf(p) >= 50),
        description: "An audit or independent review of your financial statements if your company's size requires it.",
        why: "Companies above the public interest threshold must be audited, and statements filed without the required audit can be rejected.",
        action: "Confirm with your accountant whether an audit or independent review is required."
    },
    {
        id: "cipc-change-notifications",
        title: "Company change notifications",
        regulator: "cipc",
        tier: "low",
        frequency: "per-event",
        dueRule: "Within the period set by the Companies Act after a change",
        appliesIf: isCompany,
        description: "Updating CIPC when directors, the registered address, or other company details change.",
        why: "Failing to notify CIPC in time can lead to fines and outdated records that block other filings.",
        action: "File the change on the CIPC eServices portal as soon as it happens."
    },

    // ---- Employment & labour ----
    {
        id: "dol-uif-registration",
        title: "UIF employer registration",
        regulator: "labour",
        tier: "high",
        frequency: "once-off",
        dueRule: "Once-off — within 30 days of becoming an employer",
        appliesIf: p => employeesOf(p) > 0,
        schedule: scheduleOnceOff,
        seed: p => {
            if (p.uif_number) return { completed: true, note: "UIF number on file" };
            if (!windowStart(p)) return { overdue: true, note: "No UIF number on file" };
            return null;
        },
        description: "Registering your business as an employer so staff can claim UIF benefits.",
        why: "Employing staff without UIF registration is illegal and can lead to fines and back-payment of contributions.",
        action: "Register for UIF through the Department of Employment and Labour (uFiling)."
    },
    {
        id: "dol-coida-registration",
        title: "COIDA registration",
        regulator: "labour",
        tier: "high",
        frequency: "once-off",
        dueRule: "Once-off — within 30 days of your first employee",
        appliesIf: p => employeesOf(p) > 0,
        schedule: scheduleOnceOff,
        seed: p => {
            if (p.coida_registered) return { completed: true, note: "Registered with the Compensation Fund" };
            if (!windowStart(p)) return { overdue: true, note: "Not registered with the Compensation Fund" };
            return null;
        },
        description: "Registering with the Compensation Fund so employees are covered for workplace injuries.",
        why: "Unregistered employers stay personally liable for workplace injury claims and can be fined.",
        action: "Register with the Compensation Fund (COIDA)."
    },
    {
        id: "dol-coida-logs",
        title: "Letter of good standing (COIDA)",
        regulator: "labour",
        tier: "medium",
        frequency: "annual",
        dueRule: "Annual — keep a current letter on file",
        appliesIf: p => employeesOf(p) > 0,
        evidence: (p, ctx) => hasDoc(ctx, "coida-letter") ? { completed: true, note: "Letter of good standing uploaded" } : null,
        description: "Your current letter of good standing from the Compensation Fund.",
        why: "Without a current letter you cannot bid for most government and corporate work.",
        action: "Upload your current COIDA letter of good standing."
    },

    // ---- Information Regulator ----
    {
        id: "ir-popia",
        title: "POPIA compliance",
        regulator: "ir",
        tier: "medium",
        frequency: "ongoing",
        dueRule: "Ongoing — work through the checklist",
        appliesIf: () => true,
        evidence: (p, ctx) => {
            const items = ctx.popia?.items || ctx.popia || null;
            if (!items || typeof items !== "object") return null;
            const ids = Object.keys(items);
            if (!ids.length) return null;
            const done = ids.filter(id => items[id]).length;
            return { completed: done === ids.length, note: `${done} of ${ids.length} checklist items complete` };
        },
        description: "Protecting the personal information your business processes, as POPIA requires.",
        why: "Non-compliance with POPIA can bring fines of up to R10 million and serious reputational damage.",
        action: "Work through the POPIA checklist in the Compliance centre."
    },

    // ---- B-BBEE ----
    {
        id: "bbbee-certificate",
        title: "B-BBEE certificate or affidavit",
        regulator: "bbbee",
        tier: "medium",
        frequency: "annual",
        dueRule: "Annual — when your certificate or affidavit is renewed",
        appliesIf: () => true,
        evidence: (p, ctx) => hasDoc(ctx, "bbbee-certificate") ? { completed: true, note: "Certificate uploaded" } : null,
        seed: p => {
            if (["1", "2", "3", "4"].includes(p.bbbee_level)) return { completed: true, note: `Profile: B-BBEE level ${p.bbbee_level} on file` };
            if (p.bbbee_level === "exempt") return { completed: true, note: "Profile: exempt (EME/QSE affidavit)" };
            if (p.bbbee_level === "non-compliant") return { note: "Profile: currently non-compliant" };
            return null;
        },
        description: "Your B-BBEE certificate, or an EME/QSE affidavit if you are exempt.",
        why: "Without a valid certificate you lose B-BBEE points, which can disqualify you from tenders and corporate contracts.",
        action: "Get a B-BBEE certificate or prepare an EME/QSE affidavit."
    },

    // ---- Sector ----
    {
        id: "sector-licences",
        title: "Sector licence or permit",
        regulator: "sector",
        tier: "medium",
        frequency: "annual",
        dueRule: "Annual — when your licence is renewed",
        appliesIf: p => SECTOR_INDUSTRIES.includes(p.industry),
        description: "The licence or permit your industry needs to operate legally (for example a health certificate or operating licence).",
        why: "Operating without a valid sector licence can lead to fines, closure, and loss of insurance cover.",
        action: "Confirm your sector licence is current and renew it if needed."
    }
];

// ---- resolution ----

function hasDoc(ctx, docType) {
    const docs = ctx.docs || [];
    return matchDocuments(docs).has(docType);
}

function nextStatusFor(dueDate, today) {
    return daysBetween(today, dueDate) <= DUE_SOON_DAYS ? "due_soon" : "pending";
}

function resolveObligation(def, profile, ctx) {
    const base = {
        id: def.id,
        title: def.title,
        regulator: def.regulator,
        regulatorLabel: REGULATORS[def.regulator]?.label || def.regulator,
        tier: def.tier,
        weight: TIER_WEIGHTS[def.tier],
        frequency: def.frequency,
        frequencyLabel: FREQUENCY_LABELS[def.frequency] || def.frequency,
        dueRule: def.dueRule,
        description: def.description,
        why: def.why,
        action: def.action
    };

    if (def.appliesIf && !def.appliesIf(profile)) {
        return {
            ...base,
            status: "not_applicable",
            statusLabel: STATUS_LABELS.not_applicable,
            value: null,
            dueDate: null,
            nextDue: null,
            weeksOverdue: null,
            periodKey: null,
            missedCount: 0,
            source: null,
            note: null
        };
    }

    const today = ctx.today || todayISO();
    const start = windowStart(profile);
    const doneKeys = new Set(
        (ctx.completions || [])
            .filter(c => c && c.obligation_id === def.id)
            .map(c => c.period_key)
    );
    const windows = (def.schedule ? def.schedule(profile, today) || [] : [])
        .filter(w => w && w.dueDate && (!start || w.dueDate >= start))
        .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
    const past = windows.filter(w => w.dueDate <= today);
    const future = windows.filter(w => w.dueDate > today);

    // Most recent past window that has no completion row.
    let missed = null;
    let missedCount = 0;
    for (let i = past.length - 1; i >= 0; i--) {
        if (doneKeys.has(past[i].key)) break;
        missedCount++;
        if (!missed) missed = past[i];
    }

    let status;
    let dueDate = null;
    let periodKey = null;
    let nextDue = future[0]?.dueDate || null;
    let weeksOverdue = null;
    let source = doneKeys.size ? "manual" : null;
    let note = null;

    if (!doneKeys.size) {
        // No manual completions yet — fall back to evidence, then profile declarations.
        const ev = def.evidence ? def.evidence(profile, ctx) : null;
        if (ev?.note) note = ev.note;
        const sd = def.seed ? def.seed(profile, ctx) : null;
        if (!note && sd?.note) note = sd.note;

        const credited = (ev?.completed && "evidence") || (sd?.completed && "profile");
        if (credited) {
            source = credited;
            if (past.length) {
                status = "completed";
                dueDate = past[past.length - 1].dueDate;
                periodKey = past[past.length - 1].key;
            } else if (future.length) {
                status = nextStatusFor(future[0].dueDate, today);
                dueDate = future[0].dueDate;
                periodKey = future[0].key;
            } else {
                status = "completed";
            }
            return finish(base, status, dueDate, periodKey, nextDue, weeksOverdue, source, note);
        }
        if (sd?.overdue) {
            status = "overdue";
            source = "profile";
            dueDate = missed ? missed.dueDate : null;
            periodKey = missed?.key || null;
            weeksOverdue = missed ? Math.floor(daysBetween(missed.dueDate, today) / 7) : 0;
            return finish(base, status, dueDate, periodKey, nextDue, weeksOverdue, source, note, missedCount);
        }
    }

    if (missed) {
        status = "overdue";
        dueDate = missed.dueDate;
        periodKey = missed.key;
        weeksOverdue = Math.floor(daysBetween(missed.dueDate, today) / 7);
    } else if (future.length) {
        status = nextStatusFor(future[0].dueDate, today);
        dueDate = future[0].dueDate;
        periodKey = future[0].key;
        nextDue = null;
    } else if (doneKeys.size) {
        status = "completed";
        const dated = [...doneKeys].filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
        dueDate = dated.length ? dated[dated.length - 1] : null;
        periodKey = dated.length ? dated[dated.length - 1] : null;
    } else {
        status = "pending";
    }

    return finish(base, status, dueDate, periodKey, nextDue, weeksOverdue, source, note, missedCount);
}

function finish(base, status, dueDate, periodKey, nextDue, weeksOverdue, source, note, missedCount) {
    return {
        ...base,
        status,
        statusLabel: STATUS_LABELS[status],
        value: statusValue(status, weeksOverdue),
        dueDate,
        nextDue,
        weeksOverdue,
        periodKey,
        missedCount: missedCount || 0,
        source,
        note
    };
}

// ---- report ----

function emptyCounts() {
    return { completed: 0, pending: 0, dueSoon: 0, overdue: 0, notApplicable: 0 };
}

function countOf(counts, status) {
    if (status === "due_soon") return "dueSoon";
    if (status === "not_applicable") return "notApplicable";
    return status;
}

export function buildComplianceReport(profile, ctx = {}) {
    const p = profile || {};
    const context = { ...ctx, today: ctx.today || todayISO() };
    const obligations = OBLIGATIONS.map(def => resolveObligation(def, p, context));

    const applicable = obligations.filter(o => o.status !== "not_applicable");
    const totalWeight = applicable.reduce((s, o) => s + o.weight, 0);
    const earned = applicable.reduce((s, o) => s + o.weight * o.value, 0);
    const score = totalWeight ? Math.round((earned / totalWeight) * 100) : 100;

    const counts = emptyCounts();
    obligations.forEach(o => { counts[countOf(counts, o.status)]++; });

    const byRegulator = Object.keys(REGULATORS)
        .map(id => {
            const items = applicable.filter(o => o.regulator === id);
            if (!items.length) return null;
            const w = items.reduce((s, o) => s + o.weight, 0);
            const e = items.reduce((s, o) => s + o.weight * o.value, 0);
            const c = emptyCounts();
            items.forEach(o => { c[countOf(c, o.status)]++; });
            return {
                id,
                label: REGULATORS[id].label,
                score: w ? Math.round((e / w) * 100) : null,
                weight: w,
                count: items.length,
                counts: c
            };
        })
        .filter(Boolean);

    const improvements = applicable
        .filter(o => o.status === "overdue" || o.status === "due_soon")
        .map(o => ({
            id: o.id,
            title: o.title,
            regulatorLabel: o.regulatorLabel,
            tier: o.tier,
            status: o.status,
            statusLabel: o.statusLabel,
            dueDate: o.dueDate,
            weeksOverdue: o.weeksOverdue,
            periodKey: o.periodKey,
            missedCount: o.missedCount,
            description: o.description,
            why: o.why,
            action: o.action,
            impact: Math.max(1, Math.round((o.weight * (1 - o.value) / totalWeight) * 100))
        }))
        .sort((a, b) => b.impact - a.impact || TIER_WEIGHTS[b.tier] - TIER_WEIGHTS[a.tier]);

    const band = bandFor(score);

    return {
        score,
        band,
        totalWeight,
        applicableCount: applicable.length,
        counts,
        byRegulator,
        obligations,
        improvements,
        summary: summarize({ band, counts, applicableCount: applicable.length })
    };
}

export function summarize(report) {
    const c = report.counts;
    const bits = [];
    if (c.overdue) bits.push(`${c.overdue} overdue`);
    if (c.dueSoon) bits.push(`${c.dueSoon} due soon`);
    if (!bits.length) bits.push(`${c.completed} of ${report.applicableCount} obligations met`);
    return `${report.band.short}: ${bits.join(", ")}`;
}
