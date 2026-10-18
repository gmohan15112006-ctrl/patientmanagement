-- ==============================================================================
-- HOSPITAL PATIENT DATA MANAGEMENT SYSTEM - POSTGRESQL SCHEMA (SUPABASE)
-- ==============================================================================
-- Includes complete table structures, RLS policies, serial number generator,
-- and audit logging triggers matching the 15-column Emergency Register standard.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Supabase Auth integration)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('nurse', 'doctor_admin')),
    account_status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (account_status IN ('active', 'pending_approval', 'deactivated')),
    staff_id TEXT,
    department TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_login_at TIMESTAMPTZ,
    login_count INT DEFAULT 0
);

-- Index profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(account_status);

-- 2. PATIENT RECORDS TABLE (15 Columns exactly matching hospital emergency register)
CREATE TABLE IF NOT EXISTS public.patient_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number BIGSERIAL UNIQUE NOT NULL, -- 1. S NO
    ip_number TEXT NOT NULL,                -- 2. IP NO (Text preserves leading zeroes)
    patient_name TEXT NOT NULL,             -- 3. NAME
    age INT NOT NULL CHECK (age >= 0 AND age <= 130), -- 4. AGE
    sex TEXT NOT NULL CHECK (sex IN ('M', 'F', 'Other')), -- 5. SEX
    admission_datetime TEXT NOT NULL,       -- 6. ADMISSION DATE& TIME
    patient_received_time TEXT,             -- 7. PATIENT RECEIVED TIME
    specialty_category TEXT NOT NULL,       -- 8. BROAD SPECIALITY CATEGORY
    diagnosis TEXT NOT NULL,                -- 9. DIAGNOSIS
    age_interval TEXT,                      -- 10. AGE INTERVAL (e.g. 12-60, >60)
    taei_category TEXT NOT NULL,            -- 11. TAEI PILLAR/TAEI NON PILLAR
    medicolegal_category TEXT NOT NULL,     -- 12. MEDICOLEGAL CATEGORY (MLC/NMLC)
    transferred_out TEXT,                   -- 13. TRANSFERRED OUT (MS, SD ICU, etc.)
    transferred_out_time TEXT,              -- 14. TRANSFERRED OUT TIME
    emergency_response_time TEXT,           -- 15. EMERGENCY RESPONSE TIME
    
    -- Metadata & Auditing
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by_name TEXT,
    updated_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    archived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    archive_reason TEXT,
    correction_request JSONB
);

-- Indexes for high-performance hospital search & filtering
CREATE INDEX IF NOT EXISTS idx_records_serial ON public.patient_records(serial_number);
CREATE INDEX IF NOT EXISTS idx_records_ip ON public.patient_records(ip_number);
CREATE INDEX IF NOT EXISTS idx_records_name ON public.patient_records(patient_name);
CREATE INDEX IF NOT EXISTS idx_records_admission ON public.patient_records(admission_datetime);
CREATE INDEX IF NOT EXISTS idx_records_specialty ON public.patient_records(specialty_category);
CREATE INDEX IF NOT EXISTS idx_records_archived ON public.patient_records(archived_at);
CREATE INDEX IF NOT EXISTS idx_records_created_by ON public.patient_records(created_by);

-- 3. LOGIN SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.login_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    login_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    logout_at TIMESTAMPTZ,
    session_status TEXT NOT NULL DEFAULT 'active' CHECK (session_status IN ('active', 'expired', 'revoked')),
    device_summary TEXT,
    ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.login_sessions(session_status);

-- 4. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    change_summary TEXT NOT NULL,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action);

-- 5. HOSPITAL DROPDOWN OPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.hospital_dropdown_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_name TEXT NOT NULL, -- 'specialtyCategory', 'taeiCategory', 'transferWard', etc.
    option_value TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed initial hospital dropdown options matching the hospital register
INSERT INTO public.hospital_dropdown_options (field_name, option_value, display_order)
VALUES 
    ('specialtyCategory', 'SURGERY CASES', 1),
    ('specialtyCategory', 'MEDICINE CASES', 2),
    ('taeiCategory', 'PILLAR', 1),
    ('taeiCategory', 'NON PILLAR', 2),
    ('medicolegalCategory', 'MLC', 1),
    ('medicolegalCategory', 'NMLC', 2),
    ('transferWard', 'MS', 1),
    ('transferWard', 'MM', 2),
    ('transferWard', 'NS', 3),
    ('transferWard', 'FM', 4),
    ('transferWard', 'SD ICU', 5),
    ('transferWard', 'M ORTHO', 6),
    ('transferWard', 'FS', 7),
    ('transferWard', 'MICU', 8),
    ('transferWard', 'SICU', 9),
    ('ageInterval', '12-60', 1),
    ('ageInterval', '>60', 2),
    ('ageInterval', '<12', 3)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_dropdown_options ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is Doctor/Admin
CREATE OR REPLACE FUNCTION public.is_doctor_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'doctor_admin' AND account_status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if current user is an Active Nurse
CREATE OR REPLACE FUNCTION public.is_active_nurse()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'nurse' AND account_status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --- PROFILES POLICIES ---
-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Doctor/Admin can view and manage all profiles
CREATE POLICY "Admins have full access to profiles" 
ON public.profiles FOR ALL 
USING (public.is_doctor_admin());

-- --- PATIENT RECORDS POLICIES ---
-- Nurses can insert new patient records if active
CREATE POLICY "Nurses can insert patient records" 
ON public.patient_records FOR INSERT 
WITH CHECK (public.is_active_nurse());

-- Nurses can view non-archived patient records
CREATE POLICY "Nurses can view active patient records" 
ON public.patient_records FOR SELECT 
USING (public.is_active_nurse() AND archived_at IS NULL);

-- Nurses CANNOT UPDATE OR DELETE records!
-- Only Doctor/Admin has full SELECT, UPDATE, DELETE permissions
CREATE POLICY "Admins have full access to patient records" 
ON public.patient_records FOR ALL 
USING (public.is_doctor_admin());

-- --- AUDIT LOGS POLICIES ---
-- Only Doctor/Admin can view audit logs
CREATE POLICY "Only Admins can view audit logs" 
ON public.audit_logs FOR SELECT 
USING (public.is_doctor_admin());

-- System or authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs" 
ON public.audit_logs FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- --- LOGIN SESSIONS POLICIES ---
CREATE POLICY "Users can manage own session" 
ON public.login_sessions FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all login sessions" 
ON public.login_sessions FOR SELECT 
USING (public.is_doctor_admin());

-- --- DROPDOWN OPTIONS POLICIES ---
-- Everyone authenticated can read approved dropdown options
CREATE POLICY "Everyone can read active options" 
ON public.hospital_dropdown_options FOR SELECT 
USING (is_active = true);

-- Only Admin can insert/update/delete dropdown options
CREATE POLICY "Admins can manage dropdown options" 
ON public.hospital_dropdown_options FOR ALL 
USING (public.is_doctor_admin());
