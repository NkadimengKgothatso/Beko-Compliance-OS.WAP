-- ═══════════════════════════════════════════════════════
-- Beko ComplianceOS — Supabase Database Schema v4
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- WARNING: This drops existing tables. Only run in development/testing.
-- ═══════════════════════════════════════════════════════

-- Clean slate (safe for testing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_admin(UUID);
DROP TABLE IF EXISTS public.documents;
DROP TABLE IF EXISTS public.cipc_reminders;
DROP TABLE IF EXISTS public.tax_deadlines;
DROP TABLE IF EXISTS public.popia_checklists;
DROP TABLE IF EXISTS public.tender_tracks;
DROP TABLE IF EXISTS public.tender_alerts;
DROP TABLE IF EXISTS public.tenders;
DROP TABLE IF EXISTS public.aml_screenings;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.consultations;
DROP TABLE IF EXISTS public.company_profiles;
DROP TABLE IF EXISTS public.profiles;

-- 1. User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT,
    email       TEXT,
    auth_provider TEXT DEFAULT 'email',
    onboarding_complete BOOLEAN DEFAULT FALSE,
    compliance_score    INTEGER DEFAULT 0,
    company_id          UUID,  -- links to company_profiles.id
    company_name        TEXT,
    phone               TEXT,
    role                TEXT DEFAULT 'owner',
    is_admin            BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Company profiles (business details from onboarding)
CREATE TABLE company_profiles (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name       TEXT NOT NULL,
    business_type       TEXT NOT NULL,
    registration_number TEXT,
    registration_date   DATE,
    tax_number          TEXT,
    uif_number          TEXT,
    province            TEXT NOT NULL,
    city                TEXT,
    address             TEXT,
    website             TEXT,
    vat_registered      TEXT DEFAULT 'no',
    employees           INTEGER DEFAULT 0,
    directors           INTEGER DEFAULT 1,
    industry            TEXT,
    industry_subsector  TEXT,
    monthly_revenue     TEXT,
    accounting_software TEXT,
    payroll_system      TEXT,
    last_tax_filing     TEXT DEFAULT 'never',
    cipc_annual_return  TEXT DEFAULT 'not-filed',
    has_records         BOOLEAN DEFAULT FALSE,
    has_business_plan   BOOLEAN DEFAULT FALSE,
    has_contracts       BOOLEAN DEFAULT FALSE,
    bbbee_level         TEXT,
    coida_registered    BOOLEAN DEFAULT FALSE,
    sdl_registered      BOOLEAN DEFAULT FALSE,
    compliance_score    INTEGER DEFAULT 0,
    score_summary       TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Auto-create profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, auth_provider)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        NEW.email,
        CASE WHEN NEW.app_metadata->>'provider' = 'google' THEN 'google' ELSE 'email' END
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Do not block auth sign-up if profile insert fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- Admin helper (must exist before any policy references it)
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND is_admin = TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- Company profiles
CREATE POLICY "Users can view own company"
    ON company_profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own company"
    ON company_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own company"
    ON company_profiles FOR UPDATE USING (auth.uid() = id);

-- ═══════════════════════════════════════════════════════
-- 5. Feature tables
-- ═══════════════════════════════════════════════════════

CREATE TABLE consultations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type          TEXT NOT NULL,
    preferred_date DATE,
    message       TEXT,
    status        TEXT DEFAULT 'pending',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    body        TEXT,
    category    TEXT,
    is_read     BOOLEAN DEFAULT FALSE,
    priority    TEXT DEFAULT 'normal',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenders (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id    TEXT UNIQUE NOT NULL,
    title        TEXT NOT NULL,
    department   TEXT,
    province     TEXT,
    industry     TEXT,
    closing_date DATE,
    status       TEXT DEFAULT 'open',
    description  TEXT,
    tags         TEXT[],
    source_url   TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tender_alerts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    keywords    TEXT,
    province    TEXT,
    industry    TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tender_tracks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tender_id   UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tender_id)
);

CREATE TABLE aml_screenings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score            INTEGER NOT NULL,
    risk_level       TEXT NOT NULL,
    answers          JSONB,
    recommendations  TEXT[],
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- New compliance tables
CREATE TABLE popia_checklists (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    items      JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE tax_deadlines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    due_date    DATE NOT NULL,
    category    TEXT NOT NULL,
    description TEXT NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cipc_reminders (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reminder_days INTEGER DEFAULT 30,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE documents (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename     TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type    TEXT,
    size_bytes   INTEGER DEFAULT 0,
    description  TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- 6. Row Level Security for feature tables
-- ═══════════════════════════════════════════════════════

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE popia_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cipc_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consultations"
    ON consultations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own consultations"
    ON consultations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own consultations"
    ON consultations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications"
    ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view tenders"
    ON tenders FOR SELECT USING (true);

CREATE POLICY "Users can view own tender alerts"
    ON tender_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tender alerts"
    ON tender_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tender alerts"
    ON tender_alerts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tender tracks"
    ON tender_tracks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tender tracks"
    ON tender_tracks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tender tracks"
    ON tender_tracks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own aml screenings"
    ON aml_screenings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own aml screenings"
    ON aml_screenings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own popia checklist"
    ON popia_checklists FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view tax deadlines"
    ON tax_deadlines FOR SELECT USING (true);

CREATE POLICY "Users can manage own cipc reminders"
    ON cipc_reminders FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own documents"
    ON documents FOR ALL USING (auth.uid() = user_id);

-- Admin policies (admins can manage feature tables)
CREATE POLICY "Admins can manage tenders"
    ON tenders FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all consultations"
    ON consultations FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update any consultation"
    ON consultations FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all notifications"
    ON notifications FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert notifications for any user"
    ON notifications FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update any notification"
    ON notifications FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage tax deadlines"
    ON tax_deadlines FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all documents"
    ON documents FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete any document"
    ON documents FOR DELETE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all popia checklists"
    ON popia_checklists FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all cipc reminders"
    ON cipc_reminders FOR SELECT USING (public.is_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════
-- 7. Supabase Storage bucket for document vault
-- ═══════════════════════════════════════════════════════

-- Create bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage object policies: users can only access files inside their own folder
CREATE POLICY "Users can upload own documents"
    ON storage.objects FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own documents"
    ON storage.objects FOR SELECT USING (
        bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own documents"
    ON storage.objects FOR UPDATE USING (
        bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own documents"
    ON storage.objects FOR DELETE USING (
        bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Admins can manage all documents"
    ON storage.objects FOR ALL USING (
        bucket_id = 'documents' AND public.is_admin(auth.uid())
    );

-- ═══════════════════════════════════════════════════════
-- 8. Seed sample data
-- ═══════════════════════════════════════════════════════

INSERT INTO tenders (tender_id, title, department, province, industry, closing_date, status, description, tags)
VALUES
    ('TND-2026-0412', 'Supply of office cleaning services', 'Department of Health', 'Gauteng', 'Cleaning / Facilities', '2026-09-15', 'open', 'Annual contract for daily office cleaning and hygiene services at provincial health facilities.', ARRAY['B-BBEE Level 1-4', 'Tax clearance', 'CIPC']),
    ('TND-2026-0389', 'ICT support and maintenance', 'Municipality IT Division', 'Western Cape', 'IT / Technology', '2026-09-08', 'open', 'Desktop support, network maintenance, and software licensing for 120 municipal users.', ARRAY['B-BBEE', 'CIDB', '3 years experience']),
    ('TND-2026-0401', 'Construction of rural classrooms', 'Department of Education', 'Eastern Cape', 'Construction', '2026-09-22', 'open', 'Design and construction of two classroom blocks at a district primary school.', ARRAY['CIDB 5GB', 'B-BBEE', 'Local content']),
    ('TND-2026-0395', 'Legal compliance advisory services', 'State-Owned Enterprise', 'National', 'Professional services', '2026-09-05', 'open', 'Provision of annual legal and compliance advisory services covering CIPC, SARS, and labour law.', ARRAY['B-BBEE Level 1-3', 'Professional indemnity']),
    ('TND-2026-0420', 'Supply and delivery of PPE', 'Department of Public Works', 'KwaZulu-Natal', 'Healthcare', '2026-09-18', 'open', 'Bulk supply of personal protective equipment for government buildings.', ARRAY['SABS approved', 'Tax clearance', 'B-BBEE']),
    ('TND-2026-0433', 'Agricultural training programme', 'Department of Agriculture', 'Free State', 'Education / Training', '2026-09-30', 'open', 'Facilitation of a 6-month smallholder farmer training programme.', ARRAY['Accredited training', 'B-BBEE', 'CIPC']),
    ('TND-2026-0418', 'Cloud software subscription', 'Financial Services Firm', 'Gauteng', 'IT / Technology', '2026-09-12', 'open', 'SaaS platform for document management and compliance tracking.', ARRAY['ISO 27001', 'B-BBEE', 'POPIA compliant']);

INSERT INTO tax_deadlines (due_date, category, description, is_recurring)
VALUES
    ('2026-08-07', 'PAYE/UIF', 'Monthly PAYE, UIF and SDL payment to SARS (7th of the month, or last business day before)', true),
    ('2026-08-25', 'VAT', 'VAT return and payment for Category A vendors (25th of the month, or last business day before)', true),
    ('2026-08-31', 'Provisional tax', 'Provisional tax first period top-up for February year-end taxpayers', false),
    ('2026-09-07', 'PAYE/UIF', 'Monthly PAYE, UIF and SDL payment to SARS', true),
    ('2026-09-25', 'VAT', 'VAT return and payment for Category A vendors', true),
    ('2026-09-30', 'CIPC/Annual', 'CIPC annual return filing deadline for companies with an August anniversary date', false),
    ('2026-10-07', 'PAYE/UIF', 'Monthly PAYE, UIF and SDL payment to SARS', true),
    ('2026-10-25', 'VAT', 'VAT return and payment for Category A vendors', true),
    ('2026-10-31', 'Provisional tax', 'Second provisional tax payment for February year-end taxpayers', false),
    ('2026-11-07', 'PAYE/UIF', 'Monthly PAYE, UIF and SDL payment to SARS', true),
    ('2026-11-25', 'VAT', 'VAT return and payment for Category A vendors', true),
    ('2026-12-07', 'PAYE/UIF', 'Monthly PAYE, UIF and SDL payment to SARS', true),
    ('2026-12-25', 'VAT', 'VAT return and payment for Category A vendors', true),
    ('2027-01-31', 'CIPC/Annual', 'CIPC annual return filing deadline for companies with a December anniversary date', false),
    ('2027-02-28', 'Provisional tax', 'First provisional tax payment for February year-end taxpayers', false);
