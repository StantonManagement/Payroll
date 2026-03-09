'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { usePayrollTravelPremiums } from '@/hooks/payroll/usePayrollTravelPremiums'
import { useProperties } from '@/hooks/payroll/useProperties'
import {
  PageHeader, FormButton, FormSelect, FormField, FormInput, InfoBlock, Drawer,
} from '@/components/form'
import { format } from 'date-fns'
import type { TravelPremiumType } from '@/lib/supabase/types'

const TYPE_LABELS: Record<TravelPremiumType, string> = {
  per_day: 'Per Day',
  flat_per_job: 'Flat per Job',
}

export default function TravelPremiumsPage() {
  const { premiums, loading, addPremium, deletePremium } = usePayrollTravelPremiums()
  const { properties } = useProperties(true)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState({
    propertyId: '',
    premiumType: 'per_day' as TravelPremiumType,
    amount: '',
    effectiveDate: format(new Date(), 'yyyy-MM-dd'),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    setError(null)
    if (!form.propertyId) { setError('Select a property'); return }
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return }
    if (!form.effectiveDate) { setError('Effective date required'); return }
    setSaving(true)
    try {
      await addPremium({
        propertyId: form.propertyId,
        premiumType: form.premiumType,
        amount: amt,
        effectiveDate: form.effectiveDate,
      })
      setDrawerOpen(false)
      setForm({ propertyId: '', premiumType: 'per_day', amount: '', effectiveDate: format(new Date(), 'yyyy-MM-dd') })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // Group premiums by property for display
  const grouped = premiums.reduce((acc, p) => {
    const propId = p.property_id
    if (!acc[propId]) acc[propId] = []
    acc[propId].push(p)
    return acc
  }, {} as Record<string, typeof premiums>)

  return (
    <div>
      <PageHeader
        title="Travel Premiums"
        subtitle="Configure per-day or flat travel bonuses for properties requiring off-site dispatch"
        actions={
          <FormButton size="sm" onClick={() => { setDrawerOpen(true); setError(null) }}>
            <Plus size={14} className="mr-1" />
            Add Premium
          </FormButton>
        }
      />

      <div className="p-6">
        {loading ? (
          <div className="text-center py-12 text-[var(--muted)]">Loading…</div>
        ) : premiums.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted)] text-sm">
            No travel premiums configured. Add one to define per-day or flat bonuses for specific properties.
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([propId, items]) => {
              const prop = (items[0].property as { code: string; name: string } | null)
              return (
                <div key={propId} className="border border-[var(--border)]">
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-section)] border-b border-[var(--border)]">
                    <span className="font-mono text-xs text-[var(--muted)]">{prop?.code}</span>
                    <span className="font-medium text-sm text-[var(--ink)]">{prop?.name}</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-[var(--muted)] border-b border-[var(--divider)]">
                        <th className="px-4 py-2 text-left font-medium">Type</th>
                        <th className="px-4 py-2 text-right font-medium">Amount</th>
                        <th className="px-4 py-2 text-left font-medium">Effective</th>
                        <th className="px-4 py-2 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(p => (
                        <tr key={p.id} className="border-b border-[var(--divider)] last:border-0">
                          <td className="px-4 py-2">
                            <span className="text-xs bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5">
                              {TYPE_LABELS[p.premium_type]}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-medium">${Number(p.amount).toFixed(2)}</td>
                          <td className="px-4 py-2 text-[var(--muted)]">{p.effective_date}</td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => deletePremium(p.id)}
                              className="text-[var(--muted)] hover:text-[var(--error)] transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add Travel Premium">
        {error && <InfoBlock variant="error">{error}</InfoBlock>}
        <FormField label="Property" required>
          <FormSelect value={form.propertyId} onChange={e => setForm(f => ({ ...f, propertyId: e.target.value }))}>
            <option value="">— Select —</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Premium Type" required>
          <FormSelect value={form.premiumType} onChange={e => setForm(f => ({ ...f, premiumType: e.target.value as TravelPremiumType }))}>
            {(Object.entries(TYPE_LABELS) as [TravelPremiumType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Amount ($)" required helperText={form.premiumType === 'per_day' ? 'Applied per day the employee works at this property' : 'Applied once per job dispatched to this property'}>
          <FormInput type="number" step="0.01" min="0" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
        </FormField>
        <FormField label="Effective Date" required>
          <FormInput type="date" value={form.effectiveDate}
            onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} />
        </FormField>
        <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--divider)]">
          <FormButton onClick={handleAdd} loading={saving} fullWidth>Add Premium</FormButton>
          <FormButton variant="ghost" onClick={() => setDrawerOpen(false)}>Cancel</FormButton>
        </div>
      </Drawer>
    </div>
  )
}
