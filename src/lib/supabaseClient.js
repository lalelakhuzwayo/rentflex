import { createClient } from '@supabase/supabase-js';

const PROD_SUPABASE_URL = 'https://agqgrotwuvqnefqryoia.supabase.co';
const PROD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFncWdyb3R3dXZxbmVmcXJ5b2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzQ3NTAsImV4cCI6MjEwMzk1MDc1MH0.VOasOykrxDANPQi2npYNh3WGT4DYW6F6bv889o4oyGc';

const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    import.meta.env.SUPABASE_BASE_URL ||
    PROD_SUPABASE_URL;

const supabaseAnonKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.SUPABASE_PUBLIC_ANON_KEY ||
    PROD_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== 'placeholder-key'
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
