-- ====================================================================
-- RENTFLEX - SUPABASE STORAGE BUCKET & RLS POLICIES MIGRATION
-- ====================================================================

-- Create 'rentflex-files' public storage bucket if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'rentflex-files',
    'rentflex-files',
    TRUE,
    52428800, -- 50 MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing storage policies if present to prevent conflict warnings
DROP POLICY IF EXISTS "Public Read Access for rentflex-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Access for rentflex-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access for rentflex-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Access for rentflex-files" ON storage.objects;

-- 1. Public Read Access (Allows any user/role to view uploaded property images & documents)
CREATE POLICY "Public Read Access for rentflex-files"
ON storage.objects FOR SELECT
USING (bucket_id = 'rentflex-files');

-- 2. Public / Authenticated Upload Access (Allows users to upload files)
CREATE POLICY "Authenticated Upload Access for rentflex-files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'rentflex-files');

-- 3. Authenticated Update Access
CREATE POLICY "Authenticated Update Access for rentflex-files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'rentflex-files');

-- 4. Authenticated Delete Access
CREATE POLICY "Authenticated Delete Access for rentflex-files"
ON storage.objects FOR DELETE
USING (bucket_id = 'rentflex-files');
