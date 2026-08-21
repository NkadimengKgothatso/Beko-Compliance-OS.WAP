-- ═══════════════════════════════════════════════════════
-- Beko ComplianceOS — Supabase Migration v4
-- Non-destructive migration: adds compliance tables,
-- document storage, SARS deadline seeds, and admin policies.
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════

-- 1. Ensure admin flag and helper exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND is_admin = TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. New compliance tables
CREATE TABLE IF NOT EXISTS popia_checklists (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    items      JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS tax_deadlines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    due_date    DATE NOT NULL,
    category    TEXT NOT NULL,
    description TEXT NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cipc_reminders (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reminder_days INTEGER DEFAULT 30,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS documents (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename     TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type    TEXT,
    size_bytes   INTEGER DEFAULT 0,
    description  TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on new tables
ALTER TABLE popia_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cipc_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 4. Idempotent policies for new tables
DROP POLICY IF EXISTS "Users can manage own popia checklist" ON popia_checklists;
CREATE POLICY "Users can manage own popia checklist"
    ON popia_checklists FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all popia checklists" ON popia_checklists;
CREATE POLICY "Admins can view all popia checklists"
    ON popia_checklists FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view tax deadlines" ON tax_deadlines;
CREATE POLICY "Users can view tax deadlines"
    ON tax_deadlines FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage tax deadlines" ON tax_deadlines;
CREATE POLICY "Admins can manage tax deadlines"
    ON tax_deadlines FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can manage own cipc reminders" ON cipc_reminders;
CREATE POLICY "Users can manage own cipc reminders"
    ON cipc_reminders FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all cipc reminders" ON cipc_reminders;
CREATE POLICY "Admins can view all cipc reminders"
    ON cipc_reminders FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can manage own documents" ON documents;
CREATE POLICY "Users can manage own documents"
    ON documents FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all documents" ON documents;
CREATE POLICY "Admins can view all documents"
    ON documents FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete any document" ON documents;
CREATE POLICY "Admins can delete any document"
    ON documents FOR DELETE USING (public.is_admin(auth.uid()));

-- 5. Idempotent admin policies for existing feature tables (in case they are missing)
DROP POLICY IF EXISTS "Admins can manage tenders" ON tenders;
CREATE POLICY "Admins can manage tenders"
    ON tenders FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all consultations" ON consultations;
CREATE POLICY "Admins can view all consultations"
    ON consultations FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update any consultation" ON consultations;
CREATE POLICY "Admins can update any consultation"
    ON consultations FOR UPDATE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
CREATE POLICY "Admins can view all notifications"
    ON notifications FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert notifications for any user" ON notifications;
CREATE POLICY "Admins can insert notifications for any user"
    ON notifications FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update any notification" ON notifications;
CREATE POLICY "Admins can update any notification"
    ON notifications FOR UPDATE USING (public.is_admin(auth.uid()));

-- 6. Supabase Storage bucket for document vault
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents"
    ON storage.objects FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents"
    ON storage.objects FOR SELECT USING (
        bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
CREATE POLICY "Users can update own documents"
    ON storage.objects FOR UPDATE USING (
        bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents"
    ON storage.objects FOR DELETE USING (
        bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Admins can manage all documents" ON storage.objects;
CREATE POLICY "Admins can manage all documents"
    ON storage.objects FOR ALL USING (
        bucket_id = 'documents' AND public.is_admin(auth.uid())
    );

-- 7. Seed SARS / CIPC deadlines (avoid duplicates on re-run)
WITH seed AS (
    SELECT *
    FROM (VALUES
        ('2026-08-07'::date, 'PAYE/UIF', 'Monthly PAYE, UIF and SDL payment to SARS (7th of the month, or last business day before)', true),
        ('2026-08-25'::date, 'VAT', 'VAT return and payment for Category A vendors (25th of the month, or last business day before)', true),
        ('2026-08-31'::date, 'Provisional tax', 'Provisional tax first period top-up for February year-end taxpayers', false),
        ('2026-09-07'::date, 'PAYE/UIF', 'Monthly PAYE, UIF and SDL payment to SARS', true),
        ('2026-09-25'::date, 'VAT', 'VAT return and payment for Category A vendors', true),
        ('2026-09-30'::date, 'CIPC/Annual', 'CIPC annual return filing deadline for companies with an August anniversary date', false),
        ('2026-10-07'::date, 'PAYE/UIF', 'Monthly PAYE, UIF and SDL payment to SARS', true),
        ('2026-10-25'::date, 'VAT', 'VAT return and payment for Category A vendors', true),
        ('2026-10-31'::date, 'Provisional tax', 'Second provisional tax payment for February year-end taxpayers', false),
        ('2026-11-07'::date, 'PAYE/UIF', 'Monthly PAYE, UIF and SDL payment to SARS', true),
        ('2026-11-25'::date, 'VAT', 'VAT return and payment for Category A vendors', true),
        ('2026-12-07'::date, 'PAYE/UIF', 'Monthly PAYE, UIF and SDL payment to SARS', true),
        ('2026-12-25'::date, 'VAT', 'VAT return and payment for Category A vendors', true),
        ('2027-01-31'::date, 'CIPC/Annual', 'CIPC annual return filing deadline for companies with a December anniversary date', false),
        ('2027-02-28'::date, 'Provisional tax', 'First provisional tax payment for February year-end taxpayers', false)
    ) AS t(due_date, category, description, is_recurring)
)
INSERT INTO tax_deadlines (due_date, category, description, is_recurring)
SELECT s.due_date, s.category, s.description, s.is_recurring
FROM seed s
WHERE NOT EXISTS (
    SELECT 1 FROM tax_deadlines t
    WHERE t.due_date = s.due_date AND t.category = s.category AND t.description = s.description
);
