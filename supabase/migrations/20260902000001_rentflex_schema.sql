-- ====================================================================
-- RENTFLEX - COMPLETE SUPABASE DATABASE SCHEMA MIGRATION
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. USER PROFILES TABLE (Linked to auth.users)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    user_type TEXT CHECK (user_type IN ('tenant', 'rentee', 'landlord', 'contractor', 'admin', 'sysAdmin')) DEFAULT 'tenant',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    id_number TEXT,
    employment_status TEXT,
    employer TEXT,
    monthly_income NUMERIC(12, 2) DEFAULT 0.00,
    bank_name TEXT,
    account_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 2. PROPERTIES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    property_type TEXT CHECK (property_type IN ('apartment', 'house', 'condo', 'townhouse', 'studio')) DEFAULT 'apartment',
    bedrooms INTEGER DEFAULT 1,
    bathrooms INTEGER DEFAULT 1,
    sqft INTEGER,
    monthly_rent NUMERIC(12, 2) NOT NULL,
    deposit_amount NUMERIC(12, 2) DEFAULT 0.00,
    min_rentscore INTEGER DEFAULT 600,
    amenities JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    available_date DATE,
    status TEXT CHECK (status IN ('available', 'pending', 'rented', 'unlisted')) DEFAULT 'available',
    accepts_bidding BOOLEAN DEFAULT FALSE,
    bidding_ends TIMESTAMP WITH TIME ZONE,
    flexible_payments BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 3. LEASES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.leases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    property_title TEXT,
    landlord_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    monthly_rent NUMERIC(12, 2) NOT NULL,
    deposit_amount NUMERIC(12, 2) DEFAULT 0.00,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT CHECK (status IN ('active', 'pending', 'pending_landlord_signature', 'pending_tenant_signature', 'ended', 'cancelled', 'terminated', 'lapsed')) DEFAULT 'pending_tenant_signature',
    documents JSONB DEFAULT '[]'::jsonb,
    signed BOOLEAN DEFAULT FALSE,
    tenant_signature TEXT,
    tenant_signed_at TIMESTAMP WITH TIME ZONE,
    landlord_signature TEXT,
    landlord_signed_at TIMESTAMP WITH TIME ZONE,
    terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 4. PAYMENTS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
    tenant_id TEXT NOT NULL,
    landlord_id TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    status TEXT CHECK (status IN ('pending', 'paid', 'late', 'processing')) DEFAULT 'pending',
    type TEXT CHECK (type IN ('rent', 'deposit', 'fee', 'maintenance')) DEFAULT 'rent',
    payment_method TEXT,
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 5. MAINTENANCE REQUESTS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    landlord_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('plumbing', 'electrical', 'appliance', 'structural', 'other')) DEFAULT 'other',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'emergency')) DEFAULT 'medium',
    status TEXT CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
    images JSONB DEFAULT '[]'::jsonb,
    contractor_id TEXT,
    estimated_cost NUMERIC(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 6. JOBS TABLE (Maintenance / Repairs posted by Landlords)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_request_id UUID REFERENCES public.maintenance_requests(id) ON DELETE SET NULL,
    posted_by_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    budget_max NUMERIC(12, 2),
    location TEXT NOT NULL,
    urgency TEXT CHECK (urgency IN ('normal', 'urgent', 'emergency')) DEFAULT 'normal',
    status TEXT CHECK (status IN ('open', 'bidding_closed', 'assigned', 'completed', 'cancelled')) DEFAULT 'open',
    accepted_bid_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 7. CONTRACTOR BIDS TABLE (Bids on Landlord Maintenance Jobs)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.contractor_bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    contractor_id TEXT NOT NULL,
    contractor_name TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    estimated_days INTEGER DEFAULT 1,
    proposal TEXT,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 8. PROPERTY RENT BIDS TABLE (Bids placed by Tenants on Properties)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    tenant_name TEXT,
    proposed_rent NUMERIC(12, 2) NOT NULL,
    move_in_date DATE,
    lease_duration_months INTEGER DEFAULT 12,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'countered')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 9. CONTRACTORS PROFILES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE NOT NULL,
    business_name TEXT NOT NULL,
    trade_category TEXT NOT NULL,
    rating NUMERIC(3, 2) DEFAULT 5.00,
    hourly_rate NUMERIC(12, 2),
    service_radius_km INTEGER DEFAULT 25,
    subscription_status TEXT CHECK (subscription_status IN ('free', 'pro', 'unlimited')) DEFAULT 'pro',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 10. RENT SCORES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.rent_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE NOT NULL,
    score INTEGER DEFAULT 650,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 11. DEPOSIT DISPUTES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.deposit_disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    landlord_id TEXT NOT NULL,
    disputed_amount NUMERIC(12, 2) NOT NULL,
    resolved_amount NUMERIC(12, 2) DEFAULT 0.00,
    reason TEXT NOT NULL,
    status TEXT CHECK (status IN ('open', 'under_review', 'resolved')) DEFAULT 'open',
    evidence_urls JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 12. INSPECTIONS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
    inspector_id TEXT NOT NULL,
    type TEXT CHECK (type IN ('move_in', 'move_out', 'routine')) DEFAULT 'routine',
    report JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 13. MESSAGES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    receiver_id TEXT,
    content TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 14. APPLICATIONS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    landlord_id TEXT NOT NULL,
    rent_score INTEGER DEFAULT 650,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    landlord_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 15. INDEXES FOR PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_properties_landlord ON public.properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON public.leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_landlord ON public.leases(landlord_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_landlord ON public.payments(landlord_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant ON public.maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_contractor_bids_job ON public.contractor_bids(job_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);

-- ====================================================================
-- 16. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, user_type)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'user_type', 'tenant')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 17. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public properties read" ON public.properties;
DROP POLICY IF EXISTS "Authenticated full access properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated full access leases" ON public.leases;
DROP POLICY IF EXISTS "Authenticated full access payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated full access maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Public jobs read" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated full access jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated full access contractor_bids" ON public.contractor_bids;
DROP POLICY IF EXISTS "Authenticated full access bids" ON public.bids;
DROP POLICY IF EXISTS "Authenticated full access contractors" ON public.contractors;
DROP POLICY IF EXISTS "Authenticated full access rent_scores" ON public.rent_scores;
DROP POLICY IF EXISTS "Authenticated full access deposit_disputes" ON public.deposit_disputes;
DROP POLICY IF EXISTS "Authenticated full access inspections" ON public.inspections;
DROP POLICY IF EXISTS "Authenticated full access messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated full access applications" ON public.applications;

CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Authenticated full access profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Public properties read" ON public.properties FOR SELECT USING (true);
CREATE POLICY "Authenticated full access properties" ON public.properties FOR ALL USING (true);
CREATE POLICY "Authenticated full access leases" ON public.leases FOR ALL USING (true);
CREATE POLICY "Authenticated full access payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Authenticated full access maintenance" ON public.maintenance_requests FOR ALL USING (true);
CREATE POLICY "Public jobs read" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Authenticated full access jobs" ON public.jobs FOR ALL USING (true);
CREATE POLICY "Authenticated full access contractor_bids" ON public.contractor_bids FOR ALL USING (true);
CREATE POLICY "Authenticated full access bids" ON public.bids FOR ALL USING (true);
CREATE POLICY "Authenticated full access contractors" ON public.contractors FOR ALL USING (true);
CREATE POLICY "Authenticated full access rent_scores" ON public.rent_scores FOR ALL USING (true);
CREATE POLICY "Authenticated full access deposit_disputes" ON public.deposit_disputes FOR ALL USING (true);
CREATE POLICY "Authenticated full access inspections" ON public.inspections FOR ALL USING (true);
CREATE POLICY "Authenticated full access messages" ON public.messages FOR ALL USING (true);
CREATE POLICY "Authenticated full access applications" ON public.applications FOR ALL USING (true);

-- ====================================================================
-- 18. ROLE PERMISSIONS & GRANTS
-- ====================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

