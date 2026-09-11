-- ====================================================================
-- RENTFLEX - SYSADMIN ROLE STANDARDIZATION & CLEANUP MIGRATION
-- ====================================================================

-- 1. Migrate existing 'admin' roles to 'sysAdmin'
UPDATE public.profiles
SET user_type = 'sysAdmin'
WHERE user_type = 'admin';

-- 2. Drop existing CHECK constraint on user_type if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_user_type_check'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_user_type_check;
    END IF;
END $$;

-- 3. Add updated CHECK constraint restricting roles to tenant, landlord, contractor, sysAdmin
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_type_check 
CHECK (user_type IN ('tenant', 'rentee', 'landlord', 'contractor', 'sysAdmin'));
