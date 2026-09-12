-- ====================================================================
-- RENTFLEX - ENHANCE CONTRACTORS TABLE FOR PROFILE SETUP
-- ====================================================================

ALTER TABLE public.contractors 
    ADD COLUMN IF NOT EXISTS company_name TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS years_experience NUMERIC(5,1) DEFAULT 1,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS license_number TEXT,
    ADD COLUMN IF NOT EXISTS service_areas JSONB DEFAULT '[]'::jsonb;

-- Ensure business_name and trade_category allow fallback defaults
ALTER TABLE public.contractors 
    ALTER COLUMN business_name DROP NOT NULL,
    ALTER COLUMN trade_category DROP NOT NULL;
