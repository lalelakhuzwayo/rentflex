-- ====================================================================
-- RENTFLEX - AUTOMATED CONTRACTOR VERIFICATION SYSTEM MIGRATION
-- ====================================================================

ALTER TABLE public.contractors 
    ADD COLUMN IF NOT EXISTS id_number TEXT,
    ADD COLUMN IF NOT EXISTS tax_number TEXT,
    ADD COLUMN IF NOT EXISTS id_document_url TEXT,
    ADD COLUMN IF NOT EXISTS trade_certificate_url TEXT,
    ADD COLUMN IF NOT EXISTS proof_of_address_url TEXT,
    ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('pending', 'under_review', 'verified', 'rejected')) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS trade_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS verification_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Create index for high performance contractor verification queries
CREATE INDEX IF NOT EXISTS idx_contractors_verification_status ON public.contractors(verification_status);
CREATE INDEX IF NOT EXISTS idx_contractors_verified ON public.contractors(verified);
