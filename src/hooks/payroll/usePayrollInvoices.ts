'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PayrollInvoice } from '@/lib/supabase/types'

export function usePayrollInvoices(weekId: string | null) {
  const [invoices, setInvoices] = useState<PayrollInvoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!weekId) return
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('payroll_invoices')
      .select(`
        *,
        line_items:payroll_invoice_line_items(
          *,
          property:properties(id, code, name, total_units)
        )
      `)
      .eq('payroll_week_id', weekId)
      .order('owner_llc')
    if (err) setError(err.message)
    else setInvoices(data ?? [])
    setLoading(false)
  }, [weekId])

  useEffect(() => { fetch() }, [fetch])

  const approveInvoice = useCallback(async (invoiceId: string) => {
    const supabase = createClient()
    const userId = (await supabase.auth.getUser()).data.user?.id
    const { error: err } = await supabase
      .from('payroll_invoices')
      .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString() })
      .eq('id', invoiceId)
    if (err) throw new Error(err.message)
    await fetch()
  }, [fetch])

  const allApproved = invoices.length > 0 && invoices.every(inv => inv.status === 'approved')

  return { invoices, loading, error, refetch: fetch, approveInvoice, allApproved }
}
