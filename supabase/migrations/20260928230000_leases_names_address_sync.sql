-- ====================================================================
-- RENTFLEX - LEASES TABLE ENHANCEMENTS & SCHEMA CACHE SYNC
-- Adds landlord_name, tenant_name, property_address, property_image
-- ====================================================================

ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS landlord_name TEXT;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS tenant_name TEXT;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS property_address TEXT;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS property_image TEXT;

-- Ensure leases table is included in Realtime publication
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.leases;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
