'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { Download, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, FormButton, InfoBlock } from '@/components/form'
import { formatCurrency } from '@/lib/payroll/calculations'
import type { PayrollWeek } from '@/lib/supabase/types'

interface ADPRow {
  employee_name: string
  regular_hours: number
  ot_hours: number
  pto_hours: number
  gross_pay: number
  adjustments: number
  advances: number
  net_pay: number
}

export default function ADPExportPage({ params }: { params: Promise<{ weekId: string }> }) {
  const { weekId } = use(params)
  const [week, setWeek] = useState<PayrollWeek | null>(null)
  const [rows, setRows] = useState<ADPRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statementApproved, setStatementApproved] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const supabase = createClient()
      const [weekRes, empRes, entRes, adjRes, approvalRes] = await Promise.all([
        supabase.from('payroll_weeks').select('*').eq('id', weekId).single(),
        supabase.from('payroll_employees').select('*').eq('is_active', true),
        supabase.from('payroll_time_entries').select('*').eq('payroll_week_id', weekId).eq('is_flagged', false),
        supabase.from('payroll_adjustments').select('*').eq('payroll_week_id', weekId),
        supabase.from('payroll_approvals').select('*').eq('payroll_week_id', weekId).eq('stage', 'statement'),
      ])
      setWeek(weekRes.data)
      setStatementApproved((approvalRes.data?.length ?? 0) > 0)

      const employees = empRes.data ?? []
      const entries = entRes.data ?? []
      const adjustments = adjRes.data ?? []

      const empMap: Record<string, typeof employees[0]> = {}
      for (const e of employees) empMap[e.id] = e

      const summary: Record<string, ADPRow> = {}
      for (const e of employees) {
        summary[e.id] = {
          employee_name: e.name,
          regular_hours: 0, ot_hours: 0, pto_hours: 0,
          gross_pay: e.type === 'salaried' ? (Number(e.weekly_rate) || 0) : 0,
          adjustments: 0, advances: 0, net_pay: 0,
        }
      }

      for (const entry of entries) {
        const emp = empMap[entry.employee_id]
        if (!emp || !summary[entry.employee_id]) continue
        summary[entry.employee_id].regular_hours += entry.regular_hours ?? 0
        summary[entry.employee_id].ot_hours += entry.ot_hours ?? 0
        summary[entry.employee_id].pto_hours += entry.pto_hours ?? 0
        if (emp.type !== 'salaried') {
          const rate = emp.hourly_rate ?? 0
          summary[entry.employee_id].gross_pay += ((entry.regular_hours ?? 0) + (entry.ot_hours ?? 0)) * rate
        }
      }

      for (const adj of adjustments) {
        if (!summary[adj.employee_id]) continue
        if (adj.type === 'advance' || adj.type === 'deduction_other') {
          summary[adj.employee_id].advances += Math.abs(adj.amount)
        } else {
          summary[adj.employee_id].adjustments += adj.amount
          summary[adj.employee_id].gross_pay += adj.amount
        }
      }

      for (const row of Object.values(summary)) {
        row.net_pay = row.gross_pay - row.advances
        row.regular_hours = Math.round(row.regular_hours * 100) / 100
        row.ot_hours = Math.round(row.ot_hours * 100) / 100
        row.gross_pay = Math.round(row.gross_pay * 100) / 100
        row.net_pay = Math.round(row.net_pay * 100) / 100
      }

      setRows(Object.values(summary).filter(r => r.gross_pay > 0 || r.regular_hours > 0))
      setLoading(false)
    }
    load()
  }, [weekId])

  const exportCSV = () => {
    const headers = ['Employee Name', 'Regular Hours', 'OT Hours', 'PTO Hours', 'Adjustments', 'Advances', 'Gross Pay', 'Net Pay']
    const csvRows = rows.map(r => [
      r.employee_name,
      r.regular_hours,
      r.ot_hours,
      r.pto_hours,
      r.adjustments.toFixed(2),
      r.advances.toFixed(2),
      r.gross_pay.toFixed(2),
      r.net_pay.toFixed(2),
    ])
    const csv = [headers, ...csvRows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ADP_Export_${week?.week_start ?? 'week'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="p-8 text-[var(--muted)]">Loading…</div>

  return (
    <div>
      <PageHeader
        title="ADP Export"
        subtitle={week ? `Gross pay summary for ADP submission — week of ${week.week_start}` : ''}
        actions={
          statementApproved && rows.length > 0 ? (
            <FormButton size="sm" onClick={exportCSV}>
              <Download size={14} className="mr-1" />
              Download CSV for ADP
            </FormButton>
          ) : undefined
        }
      />

      <div className="p-6">
        {!statementApproved && (
          <InfoBlock variant="warning" title="Statement Not Yet Approved">
            The weekly statement must be approved before ADP export is available.
            <div className="mt-1">
              <a href={`/payroll/${weekId}/statement`} className="underline">Go to Statement →</a>
            </div>
          </InfoBlock>
        )}

        {statementApproved && rows.length > 0 && (
          <>
            <InfoBlock variant="default" title="Ready for ADP Submission">
              Download this file and submit to ADP via Kathleen. After ADP runs, upload the ADP report in the Reconciliation tab to auto-reconcile.
            </InfoBlock>

            <div className="mt-5 border border-[var(--border)] overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[var(--primary)] text-white text-xs">
                    <th className="px-4 py-2.5 text-left font-medium">Employee</th>
                    <th className="px-4 py-2.5 text-right font-medium">Reg Hrs</th>
                    <th className="px-4 py-2.5 text-right font-medium">OT Hrs</th>
                    <th className="px-4 py-2.5 text-right font-medium">PTO Hrs</th>
                    <th className="px-4 py-2.5 text-right font-medium">Adjustments</th>
                    <th className="px-4 py-2.5 text-right font-medium">Advances</th>
                    <th className="px-4 py-2.5 text-right font-medium font-bold">Gross Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.employee_name} className={`border-b border-[var(--divider)] ${i % 2 === 0 ? 'bg-white' : 'bg-[var(--bg-section)]'}`}>
                      <td className="px-4 py-2 font-medium">{row.employee_name}</td>
                      <td className="px-4 py-2 text-right">{row.regular_hours || '—'}</td>
                      <td className="px-4 py-2 text-right">{row.ot_hours || '—'}</td>
                      <td className="px-4 py-2 text-right">{row.pto_hours || '—'}</td>
                      <td className="px-4 py-2 text-right">{row.adjustments ? formatCurrency(row.adjustments) : '—'}</td>
                      <td className="px-4 py-2 text-right text-[var(--error)]">{row.advances ? `−${formatCurrency(row.advances)}` : '—'}</td>
                      <td className="px-4 py-2 text-right font-semibold">{formatCurrency(row.gross_pay)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--primary)] text-white text-xs font-semibold">
                    <td className="px-4 py-2.5" colSpan={6}>Total Gross Pay</td>
                    <td className="px-4 py-2.5 text-right">{formatCurrency(rows.reduce((s, r) => s + r.gross_pay, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
