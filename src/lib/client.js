import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    import.meta.env?.NEXT_PUBLIC_SUPABASE_URL ||
    import.meta.env?.VITE_SUPABASE_URL ||
    import.meta.env?.SUPABASE_BASE_URL;

  const supabaseKey =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env?.VITE_SUPABASE_ANON_KEY ||
    import.meta.env?.SUPABASE_PUBLIC_ANON_KEY;

  return createBrowserClient(supabaseUrl, supabaseKey);
}

