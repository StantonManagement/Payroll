'use client'

import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { usePayrollEmployees, useEmployeeRates, useEmployeeDeptSplits } from '@/hooks/payroll/usePayrollEmployees'
import DataTable, { Column } from '@/components/kit/DataTable'
import {
  PageHeader, FormButton, FormField, FormInput, FormSelect, StatusBadge,
  Drawer, SectionDivider, InfoBlock, FormTextarea,
} from '@/components/form'
import type { PayrollEmployee } from '@/lib/supabase/types'
import { format } from 'date-fns'

const DEPARTMENTS = ['Acquisitions', 'Asset Management', 'Collections', 'Maintenance', 'Leasing', 'Administration']

const columns: Column<PayrollEmployee & Record<string, unknown>>[] = [
  { key: 'name', label: 'Name', width: 180 },
  { key: 'type', label: 'Type', width: 100, render: (v) => <span className="capitalize">{String(v)}</span> },
  {
    key: 'hourly_rate', label: 'Rate', width: 100,
    render: (v, row) => {
      if (row.type === 'salaried') return row.weekly_rate ? `$${Number(row.weekly_rate).toFixed(2)}/wk` : '—'
      return v ? `$${Number(v).toFixed(2)}/hr` : '—'
    }
  },
  { key: 'trade', label: 'Trade', width: 120, render: (v) => String(v ?? '—') },
  {
    key: 'is_active', label: 'Status', width: 90,
    render: (v) => <StatusBadge status={v ? 'active' : 'inactive'} />
  },
  {
    key: 'pay_tax', label: 'Tax', width: 60,
    render: (v) => <span className={v ? 'text-[var(--success)]' : 'text-[var(--muted)]'}>{v ? '✓' : '—'}</span>
  },
  {
    key: 'wc', label: 'WC', width: 60,
    render: (v) => <span className={v ? 'text-[var(--success)]' : 'text-[var(--muted)]'}>{v ? '✓' : '—'}</span>
  },
  {
    key: 'ot_allowed', label: 'OT', width: 60,
    render: (v) => <span className={v ? 'text-[var(--success)]' : 'text-[var(--muted)]'}>{v ? '✓' : '—'}</span>
  },
  { key: 'workyard_id', label: 'Workyard ID', width: 130, render: (v) => <span className="font-mono text-xs">{String(v ?? '—')}</span> },
]

const emptyEmployee: Partial<PayrollEmployee> = {
  name: '', workyard_id: '', type: 'hourly',
  hourly_rate: undefined, weekly_rate: undefined,
  trade: '', is_active: true,
  ot_allowed: false, pay_tax: false, wc: false,
}

interface DeptSplitRow { department: string; pct: string }

export default function EmployeesPage() {
  const { employees, loading, refetch, upsertEmployee, addRate, upsertDeptSplits } = usePayrollEmployees(true)
  const [showAll, setShowAll] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<PayrollEmployee>>(emptyEmployee)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newRate, setNewRate] = useState('')
  const [newRateDate, setNewRateDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [deptSplits, setDeptSplits] = useState<DeptSplitRow[]>([
    { department: '', pct: '' },
  ])

  const { rates } = useEmployeeRates(editing.id ?? null)
  const { splits } = useEmployeeDeptSplits(editing.id ?? null)

  const displayed = showAll ? employees : employees.filter(e => e.is_active)

  const openNew = () => {
    setEditing({ ...emptyEmployee })
    setDeptSplits([{ department: '', pct: '' }])
    setDrawerOpen(true)
    setError(null)
  }

  const openEdit = (emp: PayrollEmployee) => {
    setEditing({ ...emp })
    setDeptSplits([{ department: '', pct: '' }])
    setDrawerOpen(true)
    setError(null)
  }

  const handleSave = async () => {
    if (!editing.name?.trim()) { setError('Name is required'); return }
    if (!editing.type) { setError('Type is required'); return }

    const filledSplits = deptSplits.filter(r => r.department && r.pct)
    if (editing.type === 'salaried' && filledSplits.length > 0) {
      const total = filledSplits.reduce((s, r) => s + parseFloat(r.pct || '0'), 0)
      if (Math.abs(total - 100) > 0.01) {
        setError(`Dept splits must sum to 100% — current total: ${total.toFixed(0)}%`)
        return
      }
    }

    setSaving(true)
    setError(null)
    try {
      const savedId = await upsertEmployee(editing)
      if (newRate && savedId) {
        await addRate({
          employee_id: savedId,
          rate: parseFloat(newRate),
          effective_date: newRateDate,
          created_by: null,
        })
      }
      if (editing.type === 'salaried' && filledSplits.length > 0) {
        const today = new Date().toISOString().split('T')[0]
        await upsertDeptSplits(
          filledSplits.map(r => ({
            employee_id: savedId,
            department: r.department,
            allocation_pct: parseFloat(r.pct) / 100,
            effective_date: today,
            created_by: null,
          }))
        )
      }
      setDrawerOpen(false)
      await refetch()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const tableData = displayed as unknown as (PayrollEmployee & Record<string, unknown>)[]

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Employees & Rates"
        subtitle={`${employees.filter(e => e.is_active).length} active employees`}
        actions={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={showAll}
                onChange={e => setShowAll(e.target.checked)}
                className="rounded-none"
              />
              Show inactive
            </label>
            <FormButton size="sm" onClick={openNew}>
              <Plus size={14} className="mr-1" />
              Add Employee
            </FormButton>
          </div>
        }
      />

      <div className="flex-1 overflow-hidden">
        <DataTable
          data={tableData}
          columns={columns}
          loading={loading}
          tableId="employees"
          onRowClick={(row) => openEdit(row as unknown as PayrollEmployee)}
          emptyMessage="No employees found"
          exportable
        />
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing.id ? 'Edit Employee' : 'New Employee'} width={520}>
        {error && <InfoBlock variant="error">{error}</InfoBlock>}

        <SectionDivider label="Identity" />
        <FormField label="Full Name" required>
          <FormInput value={editing.name ?? ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} />
        </FormField>
        <FormField label="Workyard Team Member ID" helperText="Used to match Workyard CSV imports">
          <FormInput
            value={editing.workyard_id ?? ''}
            onChange={e => setEditing(p => ({ ...p, workyard_id: e.target.value }))}
            className="font-mono"
          />
        </FormField>
        <FormField label="Type" required>
          <FormSelect
            value={editing.type ?? 'hourly'}
            onChange={e => setEditing(p => ({ ...p, type: e.target.value as PayrollEmployee['type'] }))}
          >
            <option value="hourly">Hourly</option>
            <option value="salaried">Salaried</option>
            <option value="contractor">Contractor</option>
          </FormSelect>
        </FormField>

        {editing.type !== 'salaried' ? (
          <FormField label="Hourly Rate ($)">
            <FormInput
              type="number" step="0.01" min="0"
              value={editing.hourly_rate ?? ''}
              onChange={e => setEditing(p => ({ ...p, hourly_rate: parseFloat(e.target.value) || undefined }))}
            />
          </FormField>
        ) : (
          <FormField label="Weekly Rate ($)">
            <FormInput
              type="number" step="0.01" min="0"
              value={editing.weekly_rate ?? ''}
              onChange={e => setEditing(p => ({ ...p, weekly_rate: parseFloat(e.target.value) || undefined }))}
            />
          </FormField>
        )}

        <FormField label="Trade / Department">
          <FormInput value={editing.trade ?? ''} onChange={e => setEditing(p => ({ ...p, trade: e.target.value }))} />
        </FormField>

        <SectionDivider label="Flags" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          {([
            ['is_active', 'Active'],
            ['ot_allowed', 'OT Allowed'],
            ['pay_tax', 'Payroll Tax (8%)'],
            ['wc', "Workers' Comp (3%)"],
          ] as [keyof PayrollEmployee, string][]).map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 text-sm text-[var(--ink)] cursor-pointer">
              <input
                type="checkbox"
                checked={!!(editing[field])}
                onChange={e => setEditing(p => ({ ...p, [field]: e.target.checked }))}
                className="rounded-none w-4 h-4"
              />
              {label}
            </label>
          ))}
        </div>

        {/* Rate history */}
        {editing.id && (
          <>
            <SectionDivider label="Rate History" />
            {rates.length === 0 ? (
              <p className="text-xs text-[var(--muted)] mb-3">No rate history yet.</p>
            ) : (
              <table className="w-full text-xs mb-3">
                <thead>
                  <tr className="bg-[var(--bg-section)]">
                    <th className="px-2 py-1.5 text-left text-[var(--muted)] font-medium">Rate</th>
                    <th className="px-2 py-1.5 text-left text-[var(--muted)] font-medium">Effective</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map(r => (
                    <tr key={r.id} className="border-b border-[var(--divider)]">
                      <td className="px-2 py-1.5">${Number(r.rate).toFixed(2)}</td>
                      <td className="px-2 py-1.5">{r.effective_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <FormInput type="number" step="0.01" placeholder="New rate" value={newRate} onChange={e => setNewRate(e.target.value)} />
              </div>
              <FormInput type="date" value={newRateDate} onChange={e => setNewRateDate(e.target.value)} className="w-36" />
            </div>
          </>
        )}

        {/* Dept splits for salaried */}
        {editing.type === 'salaried' && (
          <>
            <SectionDivider label="Default Dept Splits" />
            <p className="text-xs text-[var(--muted)] mb-2">Must sum to 100%</p>
            {editing.id && splits.length > 0 && (
              <div className="mb-3 p-3 bg-[var(--bg-section)] text-xs">
                <p className="font-medium text-[var(--muted)] mb-1">Current splits:</p>
                {splits.map(s => (
                  <div key={s.id}>{s.department}: {(s.allocation_pct * 100).toFixed(0)}%</div>
                ))}
              </div>
            )}
            {deptSplits.map((row, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <FormSelect
                  value={row.department}
                  onChange={e => {
                    const updated = [...deptSplits]
                    updated[i] = { ...updated[i], department: e.target.value }
                    setDeptSplits(updated)
                  }}
                  className="flex-1"
                >
                  <option value="">— Select department —</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </FormSelect>
                <FormInput
                  type="number" min="0" max="100" step="1"
                  placeholder="%"
                  value={row.pct}
                  onChange={e => {
                    const updated = [...deptSplits]
                    updated[i] = { ...updated[i], pct: e.target.value }
                    setDeptSplits(updated)
                  }}
                  className="w-20"
                />
              </div>
            ))}
            <button
              onClick={() => setDeptSplits(p => [...p, { department: '', pct: '' }])}
              className="text-xs text-[var(--primary)] hover:underline mb-4"
            >
              + Add row
            </button>
          </>
        )}

        <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--divider)]">
          <FormButton onClick={handleSave} loading={saving} fullWidth>
            {editing.id ? 'Save Changes' : 'Add Employee'}
          </FormButton>
          <FormButton variant="ghost" onClick={() => setDrawerOpen(false)}>
            Cancel
          </FormButton>
        </div>
      </Drawer>
    </div>
  )
}
