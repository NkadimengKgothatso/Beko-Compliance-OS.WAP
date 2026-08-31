-- ═══════════════════════════════════════════════════════
-- Beko ComplianceOS — Auth Trigger Fix
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- This fixes the 500 error on signup by re-creating the
-- auth trigger that auto-creates a profiles row.
-- ═══════════════════════════════════════════════════════

-- Step 1: Drop existing trigger and function (safe to re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Ensure profiles table exists
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
    is_admin            BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Re-create the trigger function
-- SECURITY DEFINER runs with the privileges of the function owner (postgres),
-- which bypasses RLS so the insert always succeeds.
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
    RAISE WARNING 'handle_new_user: profile insert failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Re-create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Ensure essential RLS policies exist (idempotent)
DO $$
BEGIN
    -- Users can view own profile
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile"
            ON profiles FOR SELECT USING (auth.uid() = id);
    END IF;

    -- Users can insert own profile
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
        CREATE POLICY "Users can insert own profile"
            ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;

    -- Users can update own profile
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile"
            ON profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- Step 7: Verify the trigger is working
-- After running this script, test signup again.
-- You can also verify the trigger exists by running:
--   SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- ═══════════════════════════════════════════════════════
-- IMPORTANT: After running this script, also verify in
-- Supabase Dashboard → Authentication → Settings:
--
--   Email provider:     ENABLED
--   Confirm email:      ENABLED (or DISABLE if you want no verification)
--   Secure email change: DISABLED
--   Secure password change: DISABLED
--
-- If you're using custom SMTP (bekocompliance9@gmail.com),
-- verify the SMTP settings under Authentication → SMTP Settings.
-- ═══════════════════════════════════════════════════════
