'use client'

import { useState, useCallback, useRef } from 'react'
import { use } from 'react'
import { Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useADPReconciliation, type ReconRow } from '@/hooks/payroll/useADPReconciliation'
import { PageHeader, FormButton, InfoBlock, FormField, FormInput, FormTextarea } from '@/components/form'
import { formatCurrency } from '@/lib/payroll/calculations'

interface ADPEmployeeRow {
  name: string
  gross: number
}

type InputMode = 'upload' | 'manual'

// Normalize employee name for fuzzy matching (lowercase, trim whitespace)
function normName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

// Try to find gross pay column in ADP sheet headers
function detectGrossCol(headers: string[]): number {
  const candidates = ['gross', 'total gross', 'gross pay', 'total pay', 'gross earnings']
  for (const c of candidates) {
    const idx = headers.findIndex(h => normName(h).includes(c))
    if (idx >= 0) return idx
  }
  return -1
}

// Try to find employee name column
function detectNameCol(headers: string[]): number {
  const candidates = ['employee name', 'name', 'emp name', 'employee']
  for (const c of candidates) {
    const idx = headers.findIndex(h => normName(h) === c || normName(h).startsWith(c))
    if (idx >= 0) return idx
  }
  return 0 // default to first column
}

function parseADPSheet(workbook: XLSX.WorkBook): ADPEmployeeRow[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]
  if (rows.length < 2) return []

  // Find the header row (first row with text that looks like column headers)
  let headerIdx = 0
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const r = rows[i] as unknown[]
    const hasText = r.some(c => typeof c === 'string' && c.trim().length > 0)
    if (hasText) { headerIdx = i; break }
  }

  const headers = (rows[headerIdx] as unknown[]).map(c => String(c ?? ''))
  const nameCol = detectNameCol(headers)
  const grossCol = detectGrossCol(headers)

  const result: ADPEmployeeRow[] = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    const name = String(row[nameCol] ?? '').trim()
    if (!name || name.toLowerCase().includes('total') || name.toLowerCase().includes('grand')) continue

    let gross = 0
    if (grossCol >= 0) {
      gross = parseFloat(String(row[grossCol] ?? '0').replace(/[$,]/g, '')) || 0
    } else {
      // Sum all numeric columns after the name col as a fallback
      for (let j = nameCol + 1; j < row.length; j++) {
        const v = parseFloat(String(row[j] ?? '').replace(/[$,]/g, ''))
        if (!isNaN(v)) gross += v
      }
    }
    if (gross > 0) result.push({ name, gross: Math.round(gross * 100) / 100 })
  }
  return result
}

export default function ADPReconciliationPage({ params }: { params: Promise<{ weekId: string }> }) {
  const { weekId } = use(params)
  const {
    week, reconciliation, existingRows, systemEmployees, systemTotal,
    loading, saveUpload, saveManual, markResolved,
  } = useADPReconciliation(weekId)

  const [inputMode, setInputMode] = useState<InputMode>('upload')

  // Upload state
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [parsedADP, setParsedADP] = useState<ADPEmployeeRow[]>([])
  const [parseError, setParseError] = useState('')
  const [uploading, setUploading] = useState(false)

  // Manual entry state
  const [adpTotal, setAdpTotal] = useState('')
  const [notes, setNotes] = useState(reconciliation?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const handleFileChange = useCallback((f: File) => {
    setFileName(f.name)
    setParsedADP([])
    setParseError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const rows = parseADPSheet(wb)
        if (rows.length === 0) {
          setParseError('No employee rows found — check that the first sheet contains employee names and a gross pay column.')
          return
        }
        setParsedADP(rows)
      } catch {
        setParseError('Could not parse file. Ensure it is a valid .xlsx or .xls file.')
      }
    }
    reader.readAsArrayBuffer(f)
  }, [])

  // Build merged recon rows from system + parsed ADP
  const previewRows: ReconRow[] = (() => {
    if (parsedADP.length === 0) return []
    const adpMap: Record<string, number> = {}
    for (const r of parsedADP) adpMap[normName(r.name)] = r.gross

    const rows: ReconRow[] = systemEmployees.map(se => {
      const adpGross = adpMap[normName(se.name)] ?? 0
      return { employee_name: se.name, system_gross: se.gross, adp_gross: adpGross, variance: Math.round((se.gross - adpGross) * 100) / 100 }
    })

    // Add ADP-only rows (employees in ADP but not in system)
    for (const ar of parsedADP) {
      const matched = systemEmployees.some(se => normName(se.name) === normName(ar.name))
      if (!matched) {
        rows.push({ employee_name: ar.name, system_gross: 0, adp_gross: ar.gross, variance: Math.round(-ar.gross * 100) / 100 })
      }
    }
    return rows.sort((a, b) => a.employee_name.localeCompare(b.employee_name))
  })()

  const adpGrandTotal = parsedADP.reduce((s, r) => s + r.gross, 0)
  const previewVariance = Math.round((systemTotal - adpGrandTotal) * 100) / 100

  const handleUploadSave = async () => {
    if (previewRows.length === 0) return
    setUploading(true)
    await saveUpload(previewRows, adpGrandTotal, notes)
    setParsedADP([])
    setFileName('')
    setUploading(false)
  }

  const handleManualSave = async () => {
    const adp = parseFloat(adpTotal)
    if (isNaN(adp)) return
    setSaving(true)
    await saveManual(adp, notes)
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-[var(--muted)]">Loading…</div>

  const savedVariance = reconciliation ? Number(reconciliation.variance) : null
  const hasSavedVariance = savedVariance !== null && Math.abs(savedVariance) > 0.01

  const displayRows = existingRows.length > 0 ? existingRows : previewRows

  return (
    <div>
      <PageHeader
        title="ADP Reconciliation"
        subtitle={week ? `Reconcile ADP actuals vs system — week of ${week.week_start}` : ''}
      />

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Totals summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-[var(--border)] p-4 bg-white">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">System Gross Total</p>
            <p className="font-serif text-2xl text-[var(--primary)]">{formatCurrency(systemTotal)}</p>
            <p className="text-xs text-[var(--muted)] mt-1">From time entries + adjustments</p>
          </div>
          <div className="border border-[var(--border)] p-4 bg-white">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">ADP Actual Total</p>
            {reconciliation ? (
              <p className="font-serif text-2xl text-[var(--primary)]">{formatCurrency(Number(reconciliation.adp_gross_total))}</p>
            ) : (
              <p className="text-sm text-[var(--muted)] mt-3">Not yet submitted</p>
            )}
          </div>
          <div className="border border-[var(--border)] p-4 bg-white">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Variance</p>
            {reconciliation ? (
              <p className={`font-serif text-2xl ${hasSavedVariance ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
                {hasSavedVariance ? formatCurrency(Math.abs(savedVariance!)) : '—'}
              </p>
            ) : (
              <p className="text-sm text-[var(--muted)] mt-3">—</p>
            )}
          </div>
        </div>

        {/* Status banner */}
        {reconciliation && (
          <div className={`flex items-center gap-3 p-4 border ${
            !hasSavedVariance
              ? 'border-[var(--success)]/30 bg-[var(--success)]/5'
              : reconciliation.resolved
              ? 'border-[var(--muted)]/30 bg-[var(--muted)]/5'
              : 'border-[var(--error)]/30 bg-[var(--error)]/5'
          }`}>
            {!hasSavedVariance
              ? <CheckCircle2 size={18} className="text-[var(--success)] shrink-0" />
              : <AlertTriangle size={18} className={reconciliation.resolved ? 'text-[var(--muted)]' : 'text-[var(--error)]'} />
            }
            <div className="flex-1">
              <p className={`text-sm font-medium ${!hasSavedVariance ? 'text-[var(--success)]' : reconciliation.resolved ? 'text-[var(--muted)]' : 'text-[var(--error)]'}`}>
                {!hasSavedVariance
                  ? 'Reconciled — no variance'
                  : reconciliation.resolved
                  ? `Variance of ${formatCurrency(Math.abs(savedVariance!))} — marked as resolved`
                  : `Variance of ${formatCurrency(Math.abs(savedVariance!))} — requires investigation`
                }
              </p>
              {reconciliation.notes && <p className="text-xs text-[var(--muted)] mt-0.5">{reconciliation.notes}</p>}
            </div>
            {hasSavedVariance && !reconciliation.resolved && (
              <FormButton size="sm" variant="secondary" onClick={markResolved}>Mark Resolved</FormButton>
            )}
          </div>
        )}

        {/* Per-employee variance table */}
        {displayRows.length > 0 && (
          <div>
            <h3 className="font-serif text-base text-[var(--primary)] mb-3">
              Per-Employee Comparison {parsedADP.length > 0 && <span className="text-sm text-[var(--accent)] font-sans font-normal ml-2">Preview — not yet saved</span>}
            </h3>
            <div className="border border-[var(--border)] overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[var(--primary)] text-white text-xs">
                    <th className="px-4 py-2.5 text-left font-medium">Employee</th>
                    <th className="px-4 py-2.5 text-right font-medium">System Gross</th>
                    <th className="px-4 py-2.5 text-right font-medium">ADP Gross</th>
                    <th className="px-4 py-2.5 text-right font-medium">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, i) => (
                    <tr key={row.employee_name} className={`border-b border-[var(--divider)] ${i % 2 === 0 ? 'bg-white' : 'bg-[var(--bg-section)]'}`}>
                      <td className="px-4 py-2 font-medium">{row.employee_name}</td>
                      <td className="px-4 py-2 text-right">{row.system_gross ? formatCurrency(row.system_gross) : '—'}</td>
                      <td className="px-4 py-2 text-right">{row.adp_gross ? formatCurrency(row.adp_gross) : '—'}</td>
                      <td className={`px-4 py-2 text-right font-medium ${Math.abs(row.variance) > 0.01 ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
                        {Math.abs(row.variance) < 0.01 ? '—' : (row.variance > 0 ? '+' : '') + formatCurrency(row.variance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--primary)] text-white text-xs font-semibold">
                    <td className="px-4 py-2.5">Totals</td>
                    <td className="px-4 py-2.5 text-right">{formatCurrency(displayRows.reduce((s, r) => s + r.system_gross, 0))}</td>
                    <td className="px-4 py-2.5 text-right">{formatCurrency(displayRows.reduce((s, r) => s + r.adp_gross, 0))}</td>
                    <td className={`px-4 py-2.5 text-right ${Math.abs(displayRows.reduce((s, r) => s + r.variance, 0)) > 0.01 ? 'text-[var(--error)]/60' : ''}`}>
                      {(() => { const v = Math.round(displayRows.reduce((s, r) => s + r.variance, 0) * 100) / 100; return Math.abs(v) < 0.01 ? '—' : formatCurrency(v) })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Input section */}
        <div className="border border-[var(--border)] bg-white p-5">
          <div className="flex items-center gap-4 mb-5">
            <h3 className="font-serif text-base text-[var(--primary)]">
              {reconciliation ? 'Update ADP Data' : 'Submit ADP Data'}
            </h3>
            <div className="flex gap-1 ml-auto">
              <button
                onClick={() => setInputMode('upload')}
                className={`px-3 py-1 text-xs border transition-colors ${inputMode === 'upload' ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-white text-[var(--muted)] border-[var(--border)] hover:border-[var(--primary)]'}`}
              >
                Upload Report
              </button>
              <button
                onClick={() => setInputMode('manual')}
                className={`px-3 py-1 text-xs border transition-colors ${inputMode === 'manual' ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-white text-[var(--muted)] border-[var(--border)] hover:border-[var(--primary)]'}`}
              >
                Manual Entry
              </button>
            </div>
          </div>

          {inputMode === 'upload' ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Upload the ADP-generated payroll report (.xlsx or .xls) after Kathleen submits payroll. The system will auto-match employees and compute per-employee variances.
              </p>

              {/* Drop zone */}
              <div
                className="border-2 border-dashed border-[var(--border)] p-8 text-center cursor-pointer hover:border-[var(--primary)] transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileChange(f) }}
              >
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f) }} />
                <FileSpreadsheet size={28} className="mx-auto text-[var(--muted)] mb-2" />
                <p className="text-sm text-[var(--ink)]">Drop ADP report here or <span className="text-[var(--primary)] underline">browse</span></p>
                <p className="text-xs text-[var(--muted)] mt-1">Accepts .xlsx, .xls, .csv</p>
              </div>

              {fileName && (
                <div className="flex items-center gap-2 text-sm">
                  <FileSpreadsheet size={14} className="text-[var(--accent)]" />
                  <span className="text-[var(--ink)]">{fileName}</span>
                  <button onClick={() => { setFileName(''); setParsedADP([]); setParseError(''); if (fileRef.current) fileRef.current.value = '' }} className="ml-auto text-[var(--muted)] hover:text-[var(--error)]">
                    <X size={14} />
                  </button>
                </div>
              )}

              {parseError && (
                <InfoBlock variant="error" title="Parse Error">{parseError}</InfoBlock>
              )}

              {parsedADP.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-[var(--bg-section)] border border-[var(--divider)] text-sm">
                    <CheckCircle2 size={14} className="text-[var(--success)]" />
                    <span>{parsedADP.length} employees parsed from report — ADP total: <strong>{formatCurrency(adpGrandTotal)}</strong></span>
                    <span className={`ml-auto font-medium ${Math.abs(previewVariance) > 0.01 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
                      Variance: {Math.abs(previewVariance) < 0.01 ? 'None' : formatCurrency(previewVariance)}
                    </span>
                  </div>
                  <FormField label="Notes" helperText="Optional — explain known variances">
                    <FormTextarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="max-w-md" />
                  </FormField>
                  <FormButton onClick={handleUploadSave} loading={uploading}>
                    <Upload size={14} className="mr-2" />
                    Save Reconciliation
                  </FormButton>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Enter the grand total gross pay from the ADP report manually. Use this if the report format isn&apos;t compatible with the file upload.
              </p>
              <FormField label="ADP Total Gross Pay ($)" required>
                <FormInput
                  type="number" step="0.01" min="0"
                  value={adpTotal}
                  onChange={e => setAdpTotal(e.target.value)}
                  placeholder={reconciliation ? String(reconciliation.adp_gross_total) : '0.00'}
                  className="max-w-xs"
                />
              </FormField>
              <FormField label="Notes" helperText="Optional — explain any known variances">
                <FormTextarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="max-w-md" />
              </FormField>
              <FormButton onClick={handleManualSave} loading={saving} disabled={!adpTotal}>
                {reconciliation ? 'Update Reconciliation' : 'Run Reconciliation'}
              </FormButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
