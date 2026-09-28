-- ====================================================================
-- RENTFLEX - SUPABASE STORAGE BUCKET & RLS POLICIES MIGRATION
-- ====================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
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

        CREATE POLICY "Public Read Access for rentflex-files"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'rentflex-files');

        CREATE POLICY "Authenticated Upload Access for rentflex-files"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'rentflex-files');

        CREATE POLICY "Authenticated Update Access for rentflex-files"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'rentflex-files');

        CREATE POLICY "Authenticated Delete Access for rentflex-files"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'rentflex-files');
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
