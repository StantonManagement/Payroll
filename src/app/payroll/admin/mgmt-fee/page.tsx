'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAdminMgmtFee } from '@/hooks/payroll/useAdminMgmtFee'
import { PageHeader, FormButton, FormField, FormInput, FormSelect, InfoBlock, SectionDivider } from '@/components/form'
import { format } from 'date-fns'

export default function MgmtFeePage() {
  const { configs, portfolios, loading, addRate } = useAdminMgmtFee()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ rate_pct: '10', portfolio_id: '', effective_date: format(new Date(), 'yyyy-MM-dd') })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const rate = parseFloat(form.rate_pct)
    if (isNaN(rate) || rate < 0 || rate > 100) { setError('Enter a valid rate between 0 and 100'); return }
    setSaving(true)
    setError(null)
    try {
      await addRate(rate, form.portfolio_id || null, form.effective_date)
      setShowForm(false)
      setForm({ rate_pct: '10', portfolio_id: '', effective_date: format(new Date(), 'yyyy-MM-dd') })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // Group by portfolio
  const globalConfigs = configs.filter(c => c.portfolio_id === null)
  const portfolioConfigs = configs.filter(c => c.portfolio_id !== null)

  const portfolioName = (id: string) => portfolios.find(p => p.id === id)?.name ?? id

  return (
    <div>
      <PageHeader
        title="Management Fee Configuration"
        subtitle="Per-portfolio rates with effective dates — rate history is append-only"
        actions={
          <FormButton size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} className="mr-1" />
            Add Rate
          </FormButton>
        }
      />

      <div className="p-6 max-w-3xl">
        <InfoBlock variant="default" title="How rates work">
          A portfolio-specific rate overrides the global rate. Rates are effective from the date entered forward.
          The most recent effective rate is used for each payroll week.
        </InfoBlock>

        {showForm && (
          <div className="border border-[var(--border)] bg-white p-5 mt-5 mb-5">
            <h3 className="font-serif text-base text-[var(--primary)] mb-4">New Rate Entry</h3>
            {error && <InfoBlock variant="error">{error}</InfoBlock>}
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Rate (%)" required>
                <FormInput
                  type="number" step="0.1" min="0" max="100"
                  value={form.rate_pct}
                  onChange={e => setForm(p => ({ ...p, rate_pct: e.target.value }))}
                />
              </FormField>
              <FormField label="Portfolio" helperText="Leave blank for global rate">
                <FormSelect value={form.portfolio_id} onChange={e => setForm(p => ({ ...p, portfolio_id: e.target.value }))}>
                  <option value="">— All portfolios (global) —</option>
                  {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </FormSelect>
              </FormField>
              <FormField label="Effective Date" required>
                <FormInput type="date" value={form.effective_date} onChange={e => setForm(p => ({ ...p, effective_date: e.target.value }))} />
              </FormField>
            </div>
            <div className="flex gap-2 mt-2">
              <FormButton onClick={handleSave} loading={saving}>Save Rate</FormButton>
              <FormButton variant="ghost" onClick={() => setShowForm(false)}>Cancel</FormButton>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-[var(--muted)]">Loading…</div>
        ) : (
          <>
            <SectionDivider label="Global Rate (applies to all portfolios)" />
            <table className="w-full text-sm border border-[var(--border)] mb-6">
              <thead>
                <tr className="bg-[var(--bg-section)] text-xs text-[var(--muted)]">
                  <th className="px-4 py-2.5 text-left font-medium">Rate</th>
                  <th className="px-4 py-2.5 text-left font-medium">Effective Date</th>
                  <th className="px-4 py-2.5 text-left font-medium">Added</th>
                </tr>
              </thead>
              <tbody>
                {globalConfigs.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-3 text-[var(--muted)] text-sm">No global rate configured</td></tr>
                ) : globalConfigs.map((c, i) => (
                  <tr key={c.id} className={`border-t border-[var(--divider)] ${i === 0 ? 'font-semibold' : 'text-[var(--muted)]'}`}>
                    <td className="px-4 py-2.5">
                      {(Number(c.rate_pct) * 100).toFixed(1)}%
                      {i === 0 && <span className="ml-2 text-xs text-[var(--success)] font-normal">current</span>}
                    </td>
                    <td className="px-4 py-2.5">{c.effective_date}</td>
                    <td className="px-4 py-2.5 text-xs">{format(new Date(c.created_at), 'MMM d, yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {portfolioConfigs.length > 0 && (
              <>
                <SectionDivider label="Portfolio-Specific Overrides" />
                <table className="w-full text-sm border border-[var(--border)]">
                  <thead>
                    <tr className="bg-[var(--bg-section)] text-xs text-[var(--muted)]">
                      <th className="px-4 py-2.5 text-left font-medium">Portfolio</th>
                      <th className="px-4 py-2.5 text-left font-medium">Rate</th>
                      <th className="px-4 py-2.5 text-left font-medium">Effective Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioConfigs.map(c => (
                      <tr key={c.id} className="border-t border-[var(--divider)]">
                        <td className="px-4 py-2.5">{portfolioName(c.portfolio_id!)}</td>
                        <td className="px-4 py-2.5 font-medium">{(Number(c.rate_pct) * 100).toFixed(1)}%</td>
                        <td className="px-4 py-2.5">{c.effective_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
