'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Users } from 'lucide-react'
import { usePayrollWeeks } from '@/hooks/payroll/usePayrollWeeks'
import { useTimeEntries, useTimesheetCorrections } from '@/hooks/payroll/useTimeEntries'
import { useProperties } from '@/hooks/payroll/useProperties'
import {
  PageHeader, FormButton, FormSelect, FormField, FormTextarea,
  InfoBlock, StatusBadge,
} from '@/components/form'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

export default function CorrectionsPage() {
  const { weeks } = usePayrollWeeks()
  const searchParams = useSearchParams()
  const [selectedWeekId, setSelectedWeekId] = useState('')

  useEffect(() => {
    const weekParam = searchParams.get('week')
    if (weekParam) setSelectedWeekId(weekParam)
  }, [searchParams])

  const { flaggedEntries, loading, refetch } = useTimeEntries(selectedWeekId || null)
  const { applyCorrection } = useTimesheetCorrections(selectedWeekId || null)

  const { properties } = useProperties(true)

  const [correcting, setCorrecting] = useState<string | null>(null)
  const [toPropertyId, setToPropertyId] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approvingTimesheet, setApprovingTimesheet] = useState(false)

  const activeWeeks = weeks.filter(w => ['draft', 'corrections_complete'].includes(w.status))
  const selectedWeek = weeks.find(w => w.id === selectedWeekId)

  const openCorrect = (entryId: string) => {
    setCorrecting(entryId)
    setToPropertyId('')
    setReason('')
    setError(null)
  }

  const handleCorrect = async () => {
    if (!toPropertyId) { setError('Select a property'); return }
    if (!reason.trim()) { setError('Reason is required'); return }
    const entry = flaggedEntries.find(e => e.id === correcting)
    if (!entry) return
    setSaving(true)
    setError(null)
    try {
      await applyCorrection(
        entry.id, toPropertyId, entry.regular_hours + entry.ot_hours, reason, entry.property_id ?? undefined
      )
      setCorrecting(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  // Bulk: move all unallocated for an employee
  const byEmployee = useMemo(() => {
    const map: Record<string, typeof flaggedEntries> = {}
    for (const e of flaggedEntries) {
      const key = e.employee_id
      if (!map[key]) map[key] = []
      map[key].push(e)
    }
    return map
  }, [flaggedEntries])

  const handleApproveTimesheet = async () => {
    if (!selectedWeekId) return
    setApprovingTimesheet(true)
    try {
      const supabase = createClient()
      const userId = (await supabase.auth.getUser()).data.user?.id
      await supabase.from('payroll_approvals').insert({
        payroll_week_id: selectedWeekId,
        stage: 'timesheet',
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      await supabase.from('payroll_weeks').update({ status: 'corrections_complete' }).eq('id', selectedWeekId)
      await refetch()
    } finally {
      setApprovingTimesheet(false)
    }
  }

  const canApprove = flaggedEntries.length === 0 && selectedWeek?.status === 'draft'

  return (
    <div>
      <PageHeader
        title="Timesheet Correction Queue"
        subtitle="Resolve flagged entries before payroll can proceed"
      />

      <div className="p-6">
        <div className="mb-6 max-w-xs">
          <FormField label="Payroll Week">
            <FormSelect value={selectedWeekId} onChange={e => setSelectedWeekId(e.target.value)}>
              <option value="">— Select week —</option>
              {activeWeeks.map(w => (
                <option key={w.id} value={w.id}>
                  Week of {format(new Date(w.week_start + 'T00:00:00'), 'MMM d, yyyy')}
                </option>
              ))}
            </FormSelect>
          </FormField>
        </div>

        {selectedWeekId && (
          <>
            {selectedWeek?.status === 'corrections_complete' && (
              <InfoBlock variant="success" title="Timesheet Approved">
                This timesheet has been approved. Payroll calculation is now unlocked.
              </InfoBlock>
            )}

            {loading ? (
              <div className="text-center py-12 text-[var(--muted)]">Loading…</div>
            ) : flaggedEntries.length === 0 && selectedWeek?.status === 'draft' ? (
              <div className="text-center py-12">
                <CheckCircle2 size={36} className="mx-auto text-[var(--success)] mb-3 opacity-60" />
                <p className="text-[var(--ink)] font-medium">Queue is clear</p>
                <p className="text-[var(--muted)] text-sm mt-1">All entries have been resolved.</p>
                <FormButton className="mt-5" onClick={handleApproveTimesheet} loading={approvingTimesheet}>
                  Approve Timesheet &amp; Unlock Payroll
                </FormButton>
              </div>
            ) : (
              <>
                {/* Summary by employee */}
                <div className="mb-5">
                  <h3 className="font-serif text-base text-[var(--primary)] mb-3">
                    {flaggedEntries.length} flagged {flaggedEntries.length === 1 ? 'entry' : 'entries'}
                  </h3>

                  {Object.entries(byEmployee).map(([empId, entries]) => {
                    const emp = entries[0]?.employee
                    return (
                      <div key={empId} className="mb-4 border border-[var(--border)]">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-section)] border-b border-[var(--border)]">
                          <Users size={14} className="text-[var(--muted)]" />
                          <span className="font-medium text-sm text-[var(--ink)]">{emp?.name ?? 'Unknown'}</span>
                          <span className="text-xs text-[var(--muted)] ml-auto">{entries.length} entries</span>
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-[var(--muted)] border-b border-[var(--divider)]">
                              <th className="px-4 py-2 text-left font-medium">Date</th>
                              <th className="px-4 py-2 text-left font-medium">Current Property</th>
                              <th className="px-4 py-2 text-right font-medium">Reg Hrs</th>
                              <th className="px-4 py-2 text-right font-medium">OT Hrs</th>
                              <th className="px-4 py-2 text-left font-medium">Flag</th>
                              <th className="px-4 py-2 text-left font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entries.map(entry => (
                              <tr key={entry.id} className="border-b border-[var(--divider)] last:border-0">
                                <td className="px-4 py-2 whitespace-nowrap">{entry.entry_date}</td>
                                <td className="px-4 py-2">
                                  {entry.property
                                    ? <span className="font-mono text-xs">{(entry.property as {code: string}).code} — {(entry.property as {name: string}).name}</span>
                                    : <span className="text-[var(--warning)] text-xs">Unallocated</span>
                                  }
                                </td>
                                <td className="px-4 py-2 text-right">{entry.regular_hours}</td>
                                <td className="px-4 py-2 text-right">{entry.ot_hours || '—'}</td>
                                <td className="px-4 py-2 text-xs text-[var(--warning)] max-w-48 truncate">
                                  <AlertTriangle size={11} className="inline mr-1" />
                                  {entry.flag_reason}
                                </td>
                                <td className="px-4 py-2">
                                  {correcting === entry.id ? (
                                    <div className="flex flex-col gap-1 min-w-64">
                                      <FormSelect
                                        value={toPropertyId}
                                        onChange={e => setToPropertyId(e.target.value)}
                                        className="text-xs py-1"
                                      >
                                        <option value="">— Select property —</option>
                                        {properties.map(p => (
                                          <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                                        ))}
                                      </FormSelect>
                                      <FormTextarea
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        placeholder="Reason for correction (required)"
                                        rows={2}
                                        className="text-xs"
                                      />
                                      {error && <p className="text-xs text-[var(--error)]">{error}</p>}
                                      <div className="flex gap-1">
                                        <FormButton size="sm" onClick={handleCorrect} loading={saving}>Save</FormButton>
                                        <FormButton size="sm" variant="ghost" onClick={() => setCorrecting(null)}>Cancel</FormButton>
                                      </div>
                                    </div>
                                  ) : (
                                    <FormButton size="sm" variant="secondary" onClick={() => openCorrect(entry.id)}>
                                      Correct
                                    </FormButton>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })}
                </div>

                {canApprove && (
                  <div className="pt-4 border-t border-[var(--divider)]">
                    <FormButton onClick={handleApproveTimesheet} loading={approvingTimesheet}>
                      Approve Timesheet &amp; Unlock Payroll
                    </FormButton>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
