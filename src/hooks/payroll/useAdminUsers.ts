'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/hooks/payroll/useAuth'

export interface UserRow {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  portfolio_names: string[]
}

export interface PortfolioOption {
  id: string
  name: string
}

export function useAdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [portfolios, setPortfolios] = useState<PortfolioOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const [profilesRes, portfolioRes] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, role, is_active, created_at').order('full_name'),
      supabase.from('portfolios').select('id, name').eq('is_active', true).order('name'),
    ])
    if (profilesRes.error) { setError(profilesRes.error.message); setLoading(false); return }

    const allPortfolios = portfolioRes.data ?? []
    setPortfolios(allPortfolios)

    const { data: puData } = await supabase.from('portfolio_users').select('user_id, portfolio_id')
    const puMap: Record<string, string[]> = {}
    for (const pu of (puData ?? [])) {
      if (!puMap[pu.user_id]) puMap[pu.user_id] = []
      puMap[pu.user_id].push(pu.portfolio_id)
    }
    const portMap: Record<string, string> = {}
    for (const p of allPortfolios) portMap[p.id] = p.name

    setUsers((profilesRes.data ?? []).map(p => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      role: (p.role as UserRole) ?? 'manager',
      is_active: p.is_active ?? true,
      created_at: p.created_at,
      portfolio_names: (puMap[p.id] ?? []).map(pid => portMap[pid] ?? pid).filter(Boolean),
    })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const inviteUser = useCallback(async (email: string, fullName: string, role: UserRole) => {
    const supabase = createClient()
    const { data, error: invErr } = await supabase.auth.admin.inviteUserByEmail(email.trim(), {
      data: { full_name: fullName },
    })
    if (invErr) throw new Error(invErr.message)
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: email.trim(),
        full_name: fullName || null,
        role,
        is_active: true,
      })
    }
    await load()
  }, [load])

  const updateUser = useCallback(async (userId: string, fullName: string, role: UserRole) => {
    const supabase = createClient()
    const { error: upErr } = await supabase.from('profiles').update({
      full_name: fullName || null,
      role,
    }).eq('id', userId)
    if (upErr) throw new Error(upErr.message)
    await load()
  }, [load])

  const deactivateUser = useCallback(async (userId: string) => {
    const supabase = createClient()
    await supabase.from('profiles').update({ is_active: false }).eq('id', userId)
    await load()
  }, [load])

  const reactivateUser = useCallback(async (userId: string) => {
    const supabase = createClient()
    await supabase.from('profiles').update({ is_active: true }).eq('id', userId)
    await load()
  }, [load])

  return { users, portfolios, loading, error, inviteUser, updateUser, deactivateUser, reactivateUser, refetch: load }
}
