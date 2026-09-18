-- ═══════════════════════════════════════════════════════
-- Beko ComplianceOS — Supabase Migration v6
-- Supports the obligation-based compliance score:
--   1. obligation_completions — one row per obligation period
--      the business has marked as done. The scoring engine
--      reads these to decide Completed / Pending / Due Soon /
--      Overdue for every applicable obligation.
--   2. imports_exports on company_profiles — drives whether
--      the SARS Customs obligation applies.
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════

-- 1. Obligation completions
CREATE TABLE IF NOT EXISTS public.obligation_completions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    obligation_id TEXT NOT NULL,   -- id from shared/obligations.js (e.g. sars-vat201)
    period_key    TEXT NOT NULL,   -- the due date of the period marked done (YYYY-MM-DD)
    completed_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, obligation_id, period_key)
);

ALTER TABLE public.obligation_completions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_obligation_completions_user
    ON public.obligation_completions (user_id, obligation_id);

DROP POLICY IF EXISTS "Users can view own obligation completions"
    ON public.obligation_completions;
CREATE POLICY "Users can view own obligation completions"
    ON public.obligation_completions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own obligation completions"
    ON public.obligation_completions;
CREATE POLICY "Users can insert own obligation completions"
    ON public.obligation_completions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own obligation completions"
    ON public.obligation_completions;
CREATE POLICY "Users can delete own obligation completions"
    ON public.obligation_completions FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all obligation completions"
    ON public.obligation_completions;
CREATE POLICY "Admins can view all obligation completions"
    ON public.obligation_completions FOR SELECT
    USING (public.is_admin(auth.uid()));

-- 2. Import / export activity (SARS Customs applicability)
ALTER TABLE public.company_profiles
ADD COLUMN IF NOT EXISTS imports_exports TEXT DEFAULT 'no';
