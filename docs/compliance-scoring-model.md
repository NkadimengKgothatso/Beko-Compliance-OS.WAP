# Beko ComplianceOS — Compliance Scoring Model

**Status: DRAFT FOR LEGAL SIGN-OFF — not final.**  
**Date:** 18 September 2026  
**Implementation:** `shared/obligations.js` (engine), consumed by the dashboard, compliance page, and onboarding score preview.

This document describes how the platform decides *which* obligations apply to a business,
how it scores compliance, and which specific rules need review and approval before the
model can be treated as authoritative. Until sign-off, all tiers, weights, and applicability
rules below are **proposals**.

---

## 1. Foundation — personalised obligation set

The system does not show a fixed checklist. Each business gets an obligation set derived
from the answers given during onboarding (stored in `company_profiles`):

| Profile input | Obligations generated |
|---|---|
| Business structure: sole proprietor, private company, NPC, partnership | CIPC annual return, beneficial ownership filing, annual financial statements, change notifications — companies and NPCs only (sole proprietors and partnerships have no CIPC company filings) |
| Size: monthly revenue band, employee count | Provisional tax, audit/independent review threshold, employer obligations |
| VAT registration | SARS VAT201 return (monthly, by the 25th) |
| Employees > 0 | PAYE/UIF/SDL employer return (EMP201), UIF employer registration, COIDA registration, COIDA letter of good standing |
| Turnover / employees above threshold | Audit or independent review (companies only) |
| Industry / sector | Sector licence or permit (currently: Hospitality, Transport, Manufacturing, Construction, Agriculture) |
| Imports / exports | SARS customs registration (importer/exporter code) |
| Always | Income tax return, POPIA compliance, B-BBEE certificate or affidavit |

Every obligation in the master set carries an `applies_if` rule. When a rule is false the
obligation is marked **Not Applicable** and is *excluded entirely from the score* — it is not
counted as zero and not counted in the denominator. The score therefore reflects only the
obligations that actually apply to that business.

## 2. Obligation attributes

Each obligation records:

- **Regulatory body** — SARS, CIPC, UIF / Dept of Labour, Information Regulator, B-BBEE, or sector regulator
- **Frequency** — once-off, annual, semi-annual, monthly, per-event, ongoing
- **Due date** — derived from the CIPC registration date (anniversary-based), a fixed statutory date (e.g. VAT by the 25th), or "first period after registration" for once-off registrations
- **Risk tier** — Critical / High / Medium / Low (see §3)
- **Status** — Completed, Pending, Due Soon, Overdue, Not Applicable

## 3. Risk tiering — **proposal, needs legal sign-off**

| Tier | Weight | Definition (proposed) | Current examples |
|---|---|---|---|
| **Critical** | 4 | Statutory tax and employee-contribution obligations where failure leads to penalties, interest, deregistration, or personal liability of directors | Income tax return, provisional tax, VAT201, PAYE/UIF/SDL (EMP201) |
| **High** | 3 | Corporate-status filings that threaten the company's legal existence or block trading | CIPC annual return, beneficial ownership filing, UIF employer registration, COIDA registration |
| **Medium** | 2 | Renewals and permits that restrict work opportunities or carry fines | B-BBEE certificate/affidavit, annual financial statements, COIDA letter of good standing, POPIA, sector licences |
| **Low** | 1 | Administrative filings with no direct punitive consequence, or optional registrations | Company change notifications |

**Open question for the reviewer:** whether any Medium item (in particular POPIA, where
fines can reach R10 million) should be escalated to High or Critical.

## 4. Scoring formula — **proposal, needs legal sign-off**

```
Score = ( Σ (weight_i × status_value_i) / Σ weight_i ) × 100
```

over all **applicable** obligations `i` (Not Applicable excluded from both sums).

Status values (proposed):

| Status | Value |
|---|---|
| Completed | 1.0 |
| Pending (not yet due) | 1.0 |
| Due soon — within 14 days of due date | 0.9 |
| Overdue | `max(0, 0.5 − 0.05 × weeks_overdue)` — decays to zero after 10 weeks |
| Not Applicable | excluded from numerator and denominator |

Because pending items score 1.0, the score is a **lateness-and-completion** measure: it
drops only when items are due soon or overdue. Completing a missed item restores its full
weight. Each overdue obligation uses its most recent missed period; older consecutive missed
periods increase `weeks_overdue` and push the value down towards zero.

**Worked example:** a company with total applicable weight 39, seven items completed or
pending, two overdue (values 0.35 and 0.45), five pending → score 88 ("Good").

## 5. Score bands (display)

| Range | Band |
|---|---|
| 90–100 | Excellent — fully compliant |
| 75–89 | Good — minor items need attention |
| 50–74 | At risk — several obligations need action |
| Below 50 | Critical — immediate action required |

The compliance page shows the band label with the numeric score, a colour-coded dial, and a
per-regulator breakdown (SARS, CIPC, UIF / Dept of Labour, etc.) so users can see *where*
they are exposed.

## 6. How to improve

For every non-compliant obligation the UI shows: a plain-language description, why it
matters (the consequence), a single next action, and the point impact —
"Completing this adds +N point(s)". Impact is computed as
`max(1, round(weight × (1 − value) / total_weight × 100))` and the list is sorted by point
impact (largest first), not by due date, so users see the biggest wins at the top.

## 7. Assumptions and simplifications (for reviewer attention)

1. **Fixed statutory dates.** Income tax return due "last day of February" for everyone;
   companies with an approved non-February financial year-end are not yet differentiated.
2. **Provisional tax applicability.** Proposed as "company OR monthly revenue above R50k";
   the statutory definition of a provisional taxpayer should be confirmed.
3. **Audit threshold.** Proposed as company AND (revenue > R500k/month OR ≥ 50 employees) —
   an approximation of the public-interest-score regime, not the actual calculation.
4. **VAT registration** is self-reported; the R1 million compulsory-registration threshold
   is not enforced by the engine.
5. **Once-off registrations** (UIF, COIDA) are approximated as due 30 days after the
   business's earliest known date (CIPC registration date, else account creation date).
6. **Seeds from self-declared profile answers.** "I filed within the last year" marks the
   item completed without verifying against SARS/CIPC. Self-declaration is disclosed in the
   UI ("Based on your profile").
7. **POPIA compliance** is assessed as a 12-item readiness checklist, not a legal audit.
8. **B-BBEE** uses the self-reported level or an uploaded certificate/affidavit.
9. **Sector licences** currently cover five industries only; the list and per-licence due
   rules need sector-specific review.
10. **Weeks overdue** decay uses whole weeks from the missed due date.

## 8. Sign-off checklist

- [ ] Tier assignment for each of the 16 obligations (Critical / High / Medium / Low)
- [ ] Tier weights (4 / 3 / 2 / 1)
- [ ] Status values: due-soon 0.9; overdue 0.5 decaying 0.05/week to 0
- [ ] "Due soon" window of 14 days
- [ ] Band thresholds (90 / 75 / 50)
- [ ] Applicability rules, especially provisional tax and audit thresholds (§7.2–7.3)
- [ ] Wording of "why it matters" consequence text per obligation (legal review of claims)
- [ ] Positioning: score described as a compliance *indicator*, not legal advice

## 9. Change control

Any change to tiers, weights, applicability rules, or bands must be approved via this
document first, then applied to the constants and definitions in `shared/obligations.js`
(`TIER_WEIGHTS`, `DUE_SOON_DAYS`, `BANDS`, `OBLIGATIONS`). The engine file header points
back to this document so the two stay in step.
