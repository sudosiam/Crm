import { configError, isSupabaseConfigured, supabase } from '../supabase'
import { browserKv } from './storage'
import { DemoRepository, type Repository } from './repository'
import { SupabaseRepository } from './supabaseRepository'

export type { Repository } from './repository'

let repository: Repository | null = null

export function getRepository(): Repository {
  if (repository) return repository
  repository = isSupabaseConfigured && supabase ? new SupabaseRepository(supabase, browserKv()) : new DemoRepository(browserKv())
  return repository
}

export { configError, isSupabaseConfigured }
