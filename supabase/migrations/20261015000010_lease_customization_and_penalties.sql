-- ====================================================================
-- RENTFLEX - LEASE CUSTOMIZATION, CANCELLATION PENALTIES & RENEWAL SYNC
-- ====================================================================

-- 1. Ensure lease status check supports 'renewed'
ALTER TABLE public.leases DROP CONSTRAINT IF EXISTS leases_status_check;
ALTER TABLE public.leases ADD CONSTRAINT leases_status_check 
    CHECK (status IN ('active', 'pending', 'pending_landlord_signature', 'pending_tenant_signature', 'ended', 'cancelled', 'terminated', 'lapsed', 'renewed'));

-- 2. Add Payment Arrangement & Cut-Off Customization Columns
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'monthly';
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS payment_due_day INTEGER DEFAULT 1;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS payment_cutoff_day INTEGER DEFAULT 5;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS payment_cutoff_time TEXT DEFAULT '23:59';
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 3;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS late_penalty_fee NUMERIC(10, 2) DEFAULT 250.00;

-- 3. Add Cancellation & Financial/Score Penalty Columns
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS cancellation_score_penalty INTEGER DEFAULT 35;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS financial_penalty_applied NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS score_penalty_applied INTEGER DEFAULT 0;

-- 4. Add Lease Renewal Columns
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS renewed_from_lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS renewal_count INTEGER DEFAULT 0;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS renewal_notes TEXT;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS last_renewed_at TIMESTAMP WITH TIME ZONE;

-- 5. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_leases_cancelled_by ON public.leases(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_leases_payment_due_day ON public.leases(payment_due_day);
CREATE INDEX IF NOT EXISTS idx_leases_payment_cutoff_day ON public.leases(payment_cutoff_day);

-- Notify schema reloads
NOTIFY pgrst, 'reload schema';
