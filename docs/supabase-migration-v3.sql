-- ═══════════════════════════════════════════════════════
-- Beko ComplianceOS — Supabase Migration v3
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- This migration ADDS tables without dropping existing data.
-- Run this AFTER you have already created profiles/company_profiles.
-- ═══════════════════════════════════════════════════════

-- 1. Consultation bookings
CREATE TABLE IF NOT EXISTS consultations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type          TEXT NOT NULL,
    preferred_date DATE,
    message       TEXT,
    status        TEXT DEFAULT 'pending',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User notifications
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    body        TEXT,
    category    TEXT,
    is_read     BOOLEAN DEFAULT FALSE,
    priority    TEXT DEFAULT 'normal',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tender opportunities
CREATE TABLE IF NOT EXISTS tenders (
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

-- 4. Tender alerts created by users
CREATE TABLE IF NOT EXISTS tender_alerts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    keywords    TEXT,
    province    TEXT,
    industry    TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tenders tracked by users
CREATE TABLE IF NOT EXISTS tender_tracks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tender_id   UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tender_id)
);

-- 6. AML screening results
CREATE TABLE IF NOT EXISTS aml_screenings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score            INTEGER NOT NULL,
    risk_level       TEXT NOT NULL,
    answers          JSONB,
    recommendations  TEXT[],
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Row Level Security
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE aml_screenings ENABLE ROW LEVEL SECURITY;

-- Consultations
CREATE POLICY "Users can view own consultations"
    ON consultations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own consultations"
    ON consultations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own consultations"
    ON consultations FOR UPDATE USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications"
    ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Tenders (read-only for users, managed by admins)
CREATE POLICY "Users can view tenders"
    ON tenders FOR SELECT USING (true);

-- Tender alerts
CREATE POLICY "Users can view own tender alerts"
    ON tender_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tender alerts"
    ON tender_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tender alerts"
    ON tender_alerts FOR DELETE USING (auth.uid() = user_id);

-- Tender tracks
CREATE POLICY "Users can view own tender tracks"
    ON tender_tracks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tender tracks"
    ON tender_tracks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tender tracks"
    ON tender_tracks FOR DELETE USING (auth.uid() = user_id);

-- AML screenings
CREATE POLICY "Users can view own aml screenings"
    ON aml_screenings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own aml screenings"
    ON aml_screenings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Seed sample tenders
INSERT INTO tenders (tender_id, title, department, province, industry, closing_date, status, description, tags)
VALUES
    ('TND-2026-0412', 'Supply of office cleaning services', 'Department of Health', 'Gauteng', 'Cleaning / Facilities', '2026-09-15', 'open', 'Annual contract for daily office cleaning and hygiene services at provincial health facilities.', ARRAY['B-BBEE Level 1-4', 'Tax clearance', 'CIPC']),
    ('TND-2026-0389', 'ICT support and maintenance', 'Municipality IT Division', 'Western Cape', 'IT / Technology', '2026-09-08', 'open', 'Desktop support, network maintenance, and software licensing for 120 municipal users.', ARRAY['B-BBEE', 'CIDB', '3 years experience']),
    ('TND-2026-0401', 'Construction of rural classrooms', 'Department of Education', 'Eastern Cape', 'Construction', '2026-09-22', 'open', 'Design and construction of two classroom blocks at a district primary school.', ARRAY['CIDB 5GB', 'B-BBEE', 'Local content']),
    ('TND-2026-0395', 'Legal compliance advisory services', 'State-Owned Enterprise', 'National', 'Professional services', '2026-09-05', 'open', 'Provision of annual legal and compliance advisory services covering CIPC, SARS, and labour law.', ARRAY['B-BBEE Level 1-3', 'Professional indemnity']),
    ('TND-2026-0420', 'Supply and delivery of PPE', 'Department of Public Works', 'KwaZulu-Natal', 'Healthcare', '2026-09-18', 'open', 'Bulk supply of personal protective equipment for government buildings.', ARRAY['SABS approved', 'Tax clearance', 'B-BBEE']),
    ('TND-2026-0433', 'Agricultural training programme', 'Department of Agriculture', 'Free State', 'Education / Training', '2026-09-30', 'open', 'Facilitation of a 6-month smallholder farmer training programme.', ARRAY['Accredited training', 'B-BBEE', 'CIPC']),
    ('TND-2026-0418', 'Cloud software subscription', 'Financial Services Firm', 'Gauteng', 'IT / Technology', '2026-09-12', 'open', 'SaaS platform for document management and compliance tracking.', ARRAY['ISO 27001', 'B-BBEE', 'POPIA compliant'])
ON CONFLICT (tender_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- 9. Ensure auth trigger creates a profile row on sign-up
-- This prevents "database error saving user" when the trigger
-- is missing, the profiles table is absent, or a duplicate
-- insert is attempted.
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT,
    email       TEXT,
    auth_provider TEXT DEFAULT 'email',
    onboarding_complete BOOLEAN DEFAULT FALSE,
    compliance_score    INTEGER DEFAULT 0,
    company_id          UUID,
    company_name        TEXT,
    phone               TEXT,
    role                TEXT DEFAULT 'owner',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_profiles (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name       TEXT,
    business_type       TEXT,
    registration_number TEXT,
    registration_date   DATE,
    tax_number          TEXT,
    uif_number          TEXT,
    province            TEXT,
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

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own company" ON company_profiles;
DROP POLICY IF EXISTS "Users can insert own company" ON company_profiles;
DROP POLICY IF EXISTS "Users can update own company" ON company_profiles;
CREATE POLICY "Users can view own company" ON company_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own company" ON company_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own company" ON company_profiles FOR UPDATE USING (auth.uid() = id);

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
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

