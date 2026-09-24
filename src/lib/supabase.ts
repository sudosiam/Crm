import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function readEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  return (import.meta.env[name] ?? '').trim()
}

export function jwtRole(key: string): string | null {
  const part = key.split('.')[1]
  if (!part) return null
  try {
    const padded = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = JSON.parse(atob(padded)) as { role?: unknown }
    return typeof json.role === 'string' ? json.role : null
  } catch {
    return null
  }
}

const url = readEnv('VITE_SUPABASE_URL')
const anonKey = readEnv('VITE_SUPABASE_ANON_KEY')
const role = anonKey ? jwtRole(anonKey) : null

export const configError =
  role === 'service_role'
    ? 'This app is configured with a Supabase service role key. Remove it and use the anon public key.'
    : null

export const isSupabaseConfigured =
  !configError &&
  url.startsWith('https://') &&
  !/your-project|example/i.test(url) &&
  anonKey.length > 20 &&
  !/your-anon|placeholder/i.test(anonKey)

export const supabase: SupabaseClient | null =
  isSupabaseConfigured
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'implicit',
        },
      })
    : null

if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') sessionStorage.setItem('bph.recovery', '1')
  })
}
