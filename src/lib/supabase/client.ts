import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/lib/supabase/config'

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel. Browser fallback supports SUPABASE_URL/SUPABASE_KEY.'
    )
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
