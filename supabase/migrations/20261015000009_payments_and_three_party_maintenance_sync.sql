-- ====================================================================
-- RENTFLEX - PAYMENTS ENHANCEMENT & THREE-PARTY MAINTENANCE SYNC
-- ====================================================================

-- 1. PAYMENTS TABLE ENHANCEMENTS (Paystack Integration & Metadata)
ALTER TABLE public.payments 
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Safely relax payments status and type constraints
DO $$
BEGIN
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
    ALTER TABLE public.payments ADD CONSTRAINT payments_status_check 
        CHECK (status IN ('pending', 'paid', 'late', 'processing', 'completed', 'success', 'failed', 'refunded'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_type_check;
    ALTER TABLE public.payments ADD CONSTRAINT payments_type_check 
        CHECK (type IN ('rent', 'deposit', 'fee', 'maintenance', 'payout'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. MAINTENANCE REQUESTS TABLE (Three-Party Confirmation System & Contractor Dispatch)
ALTER TABLE public.maintenance_requests 
    ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS tenant_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tenant_completed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS tenant_notes TEXT,
    ADD COLUMN IF NOT EXISTS landlord_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS landlord_completed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS landlord_notes TEXT,
    ADD COLUMN IF NOT EXISTS contractor_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS contractor_completed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS contractor_notes TEXT,
    ADD COLUMN IF NOT EXISTS contractor_name TEXT,
    ADD COLUMN IF NOT EXISTS contractor_phone TEXT;

-- Safely relax maintenance_requests status constraint
DO $$
BEGIN
    ALTER TABLE public.maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_status_check;
    ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_status_check 
        CHECK (status IN ('open', 'submitted', 'assigned', 'job_dispatched', 'in_progress', 'scheduled', 'work_completed', 'resolved', 'completed', 'closed', 'cancelled'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. JOBS TABLE (Three-Party Confirmation & Contractor Claim System)
ALTER TABLE public.jobs 
    ADD COLUMN IF NOT EXISTS tenant_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tenant_completed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS landlord_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS landlord_completed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS contractor_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS contractor_completed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS contractor_id TEXT,
    ADD COLUMN IF NOT EXISTS contractor_name TEXT,
    ADD COLUMN IF NOT EXISTS contractor_notes TEXT,
    ADD COLUMN IF NOT EXISTS tenant_notes TEXT,
    ADD COLUMN IF NOT EXISTS landlord_notes TEXT,
    ADD COLUMN IF NOT EXISTS claim_status TEXT DEFAULT 'unclaimed';

-- Indexes for three-party maintenance lookups
CREATE INDEX IF NOT EXISTS idx_maintenance_job_id ON public.maintenance_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_contractor_id ON public.jobs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_maintenance_request_id ON public.jobs(maintenance_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);
