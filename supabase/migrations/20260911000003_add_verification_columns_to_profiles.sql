-- ====================================================================
-- RENTFLEX - ADD VERIFICATION COLUMNS TO PROFILES TABLE
-- ====================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Update existing profiles status column if null
UPDATE public.profiles
SET status = 'pending'
WHERE status IS NULL;
