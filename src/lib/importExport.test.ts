import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildDemoState, DEMO_OWNER_ID } from './data/demoData'
import { applyImport, buildBackup, containsSecretKey } from './importExport'
import type { Actor } from './types'

const owner: Actor = { userId: DEMO_OWNER_ID, role: 'OWNER', canViewAll: true, fullName: 'Biswajit' }

describe('backup', () => {
  it('exports customers without passwords or secret keys', () => {
    const data = buildDemoState().workspace
    const backup = buildBackup(data, '2026-09-24T00:00:00.000Z')
    expect(backup.version).toBe(1)
    expect(backup.customers.length).toBeGreaterThan(0)
    expect(containsSecretKey(backup)).toBe(false)
    expect(JSON.stringify(backup)).not.toContain('service_role')
  })

  it('skips duplicate phones and malformed rows', () => {
    const data = buildDemoState().workspace
    const backup = buildBackup(data, '2026-09-24T00:00:00.000Z')
    backup.customers.push({
      ...backup.customers[0],
      id: 'not-a-real-new-row',
      name: '',
      phone: '123',
    })
    const result = applyImport(data, owner, backup)
    expect(result.skippedDuplicates).toBeGreaterThan(0)
    expect(result.invalid).toBeGreaterThan(0)
    expect(result.added).toBe(0)
  })
})

describe('database security', () => {
  const sql = readFileSync('supabase/schema.sql', 'utf8')
  const tables = [
    'organizations',
    'profiles',
    'organization_members',
    'products',
    'customers',
    'follow_ups',
    'test_rides',
    'sales',
    'activity_logs',
  ]

  it('enables row level security on every table', () => {
    for (const table of tables) {
      expect(sql).toContain(`alter table public.${table} enable row level security`)
    }
    expect(sql.toLowerCase()).not.toContain('disable row level security')
    expect(sql).not.toContain('service_role')
  })

  it('checks the signed-in user inside security-definer functions', () => {
    const chunks = sql.split(/create or replace function public\./i).slice(1)
    for (const chunk of chunks) {
      const name = chunk.slice(0, chunk.indexOf('(')).trim()
      const headerEnd = chunk.toLowerCase().indexOf('as $$')
      const header = chunk.slice(0, headerEnd)
      if (!/security definer/i.test(header)) continue
      const body = chunk.slice(headerEnd)
      if (name === 'handle_new_user') {
        expect(body).toContain('new.id')
        continue
      }
      expect(body).toMatch(/auth\.uid\(\)|assert_member|assert_owner|is_org_owner|can_access_customer/)
    }
  })

  it('keeps the service role key out of the example env', () => {
    const example = readFileSync('.env.example', 'utf8')
    const ignore = readFileSync('.gitignore', 'utf8')
    expect(example).toContain('VITE_SUPABASE_ANON_KEY=')
    expect(example).not.toMatch(/service_role\s*=/)
    expect(ignore).toMatch(/^\.env$/m)
  })
})
