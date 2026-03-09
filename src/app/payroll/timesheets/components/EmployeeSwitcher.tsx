import type { PayrollEmployee, PayrollTimeEntry } from '@/lib/supabase/types'

interface EmployeeSwitcherProps {
  employees: PayrollEmployee[]
  allEntries: PayrollTimeEntry[]
  selectedId: string | null
  onChange: (id: string) => void
}

function getEmployeeStatus(empId: string, entries: PayrollTimeEntry[]): 'clean' | 'pending' | 'unresolved' {
  const empEntries = entries.filter(e => e.employee_id === empId)
  if (empEntries.some(e => !e.property_id && !e.pending_resolution)) return 'unresolved'
  if (empEntries.some(e => e.pending_resolution)) return 'pending'
  return 'clean'
}

export function EmployeeSwitcher({ employees, allEntries, selectedId, onChange }: EmployeeSwitcherProps) {
  return (
    <aside className="w-48 shrink-0 border-r border-[var(--border)] bg-[var(--bg-section)] overflow-y-auto">
      <div className="px-3 py-2.5 border-b border-[var(--border)]">
        <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Employees</p>
      </div>
      <div className="py-1">
        {employees.map(emp => {
          const status = getEmployeeStatus(emp.id, allEntries)
          const isSelected = selectedId === emp.id
          return (
            <button
              key={emp.id}
              type="button"
              onClick={() => onChange(emp.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150
                ${isSelected
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--ink)] hover:bg-[var(--primary)]/8'
                }`}
            >
              {/* Status dot */}
              <span
                className={`w-2 h-2 shrink-0 rounded-full
                  ${status === 'unresolved'
                    ? isSelected ? 'bg-amber-300' : 'bg-[var(--warning)]'
                    : status === 'pending'
                    ? isSelected ? 'bg-blue-300' : 'bg-blue-500'
                    : isSelected ? 'bg-green-300' : 'bg-[var(--success)]'
                  }`}
              />
              <span className="truncate leading-tight">{emp.name}</span>
            </button>
          )
        })}
        {employees.length === 0 && (
          <p className="px-3 py-4 text-xs text-[var(--muted)]">No active employees</p>
        )}
      </div>
    </aside>
  )
}
