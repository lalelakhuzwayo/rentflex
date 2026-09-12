-- ====================================================================
-- RENTFLEX - MAINTENANCE REQUESTS & MULTI-ROLE INTERACTIONS MIGRATION
-- ====================================================================

-- 1. Relax/Update status check constraint on public.maintenance_requests table
ALTER TABLE public.maintenance_requests 
    DROP CONSTRAINT IF EXISTS maintenance_requests_status_check;

ALTER TABLE public.maintenance_requests 
    ADD CONSTRAINT maintenance_requests_status_check 
    CHECK (status IN ('open', 'submitted', 'assigned', 'in_progress', 'scheduled', 'resolved', 'completed', 'closed'))
    NOT VALID;

-- Validate constraint safely
ALTER TABLE public.maintenance_requests VALIDATE CONSTRAINT maintenance_requests_status_check;

-- 2. Add property_title column if missing
ALTER TABLE public.maintenance_requests 
    ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS property_title TEXT;

-- 3. Create index for fast multi-role filtering
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_id ON public.maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_landlord_id ON public.maintenance_requests(landlord_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_contractor_id ON public.maintenance_requests(contractor_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_requests(status);
