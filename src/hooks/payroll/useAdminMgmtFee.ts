'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface FeeConfig {
  id: string
  rate_pct: number
  portfolio_id: string | null
  effective_date: string
  created_at: string
}

export interface Portfolio {
  id: string
  name: string
}

export function useAdminMgmtFee() {
  const [configs, setConfigs] = useState<FeeConfig[]>([])
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const [configRes, portRes] = await Promise.all([
      supabase.from('payroll_management_fee_config').select('*').order('effective_date', { ascending: false }),
      supabase.from('portfolios').select('id, name').eq('is_active', true).order('name'),
    ])
    if (configRes.error) { setError(configRes.error.message) }
    setConfigs(configRes.data ?? [])
    setPortfolios(portRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const addRate = useCallback(async (ratePct: number, portfolioId: string | null, effectiveDate: string) => {
    const supabase = createClient()
    const { error: err } = await supabase.from('payroll_management_fee_config').insert({
      rate_pct: ratePct / 100,
      portfolio_id: portfolioId || null,
      effective_date: effectiveDate,
    })
    if (err) throw new Error(err.message)
    await load()
  }, [load])

  return { configs, portfolios, loading, error, addRate, refetch: load }
}
