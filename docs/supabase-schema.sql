-- ═══════════════════════════════════════════════════════
-- Beko ComplianceOS — Supabase Database Schema v2
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- WARNING: This drops existing tables. Only run in development/testing.
-- ═══════════════════════════════════════════════════════

-- Clean slate (safe for testing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
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
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT USING (auth.uid() = id);

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
