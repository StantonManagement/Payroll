'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PayrollTravelPremium, TravelPremiumType } from '@/lib/supabase/types'

export function usePayrollTravelPremiums(propertyId?: string) {
  const [premiums, setPremiums] = useState<PayrollTravelPremium[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    let query = supabase
      .from('payroll_travel_premiums')
      .select('*, property:properties(id, code, name)')
      .order('effective_date', { ascending: false })
    if (propertyId) query = query.eq('property_id', propertyId)
    const { data, error: err } = await query
    if (err) setError(err.message)
    else setPremiums(data ?? [])
    setLoading(false)
  }, [propertyId])

  useEffect(() => { fetch() }, [fetch])

  const addPremium = useCallback(async (params: {
    propertyId: string
    premiumType: TravelPremiumType
    amount: number
    effectiveDate: string
  }) => {
    const supabase = createClient()
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null
    const { error: err } = await supabase.from('payroll_travel_premiums').insert({
      property_id: params.propertyId,
      premium_type: params.premiumType,
      amount: params.amount,
      effective_date: params.effectiveDate,
      created_by: userId,
    })
    if (err) throw new Error(err.message)
    await fetch()
  }, [fetch])

  const deletePremium = useCallback(async (id: string) => {
    const supabase = createClient()
    const { error: err } = await supabase.from('payroll_travel_premiums').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }, [fetch])

  return { premiums, loading, error, refetch: fetch, addPremium, deletePremium }
}
