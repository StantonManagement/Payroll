export type EmployeeType = 'hourly' | 'salaried' | 'contractor'
export type WeekStatus = 'draft' | 'corrections_complete' | 'payroll_approved' | 'invoiced' | 'statement_sent'
export type TimeEntrySource = 'workyard' | 'manual'
export type AdjustmentType = 'phone' | 'tool' | 'advance' | 'deduction_other'
export type AllocationMethod = 'employee_pay' | 'unit_weighted' | 'direct'
export type InvoiceStatus = 'draft' | 'approved' | 'sent'
export type CostType = 'labor' | 'spread' | 'mgmt_fee'
export type ApprovalStage = 'timesheet' | 'payroll' | 'invoice' | 'statement'

export interface PayrollEmployee {
  id: string
  name: string
  workyard_id: string | null
  type: EmployeeType
  hourly_rate: number | null
  weekly_rate: number | null
  trade: string | null
  is_active: boolean
  ot_allowed: boolean
  pay_tax: boolean
  wc: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface PayrollEmployeeRate {
  id: string
  employee_id: string
  rate: number
  effective_date: string
  created_at: string
  created_by: string | null
}

export interface PayrollEmployeeDeptSplit {
  id: string
  employee_id: string
  department: string
  allocation_pct: number
  effective_date: string
  created_at: string
  created_by: string | null
}

export interface PayrollWeek {
  id: string
  week_start: string
  week_end: string
  status: WeekStatus
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface PayrollTimeEntry {
  id: string
  payroll_week_id: string
  employee_id: string
  property_id: string | null
  entry_date: string
  regular_hours: number
  ot_hours: number
  pto_hours: number
  source: TimeEntrySource
  workyard_timecardid: string | null
  is_flagged: boolean
  flag_reason: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  employee?: PayrollEmployee
  property?: Property
}

export interface PayrollTimesheetCorrection {
  id: string
  time_entry_id: string
  from_property_id: string | null
  to_property_id: string
  hours: number
  reason: string
  corrected_by: string
  corrected_at: string
}

export interface PayrollDeptSplitOverride {
  id: string
  payroll_week_id: string
  employee_id: string
  department: string
  allocation_pct: number
  reason: string
  submitted_by: string
  approved_by: string | null
  created_at: string
  updated_at: string
}

export interface PayrollAdjustment {
  id: string
  payroll_week_id: string
  employee_id: string
  type: AdjustmentType
  amount: number
  description: string
  allocation_method: AllocationMethod
  created_at: string
  updated_at: string
  created_by: string | null
  employee?: PayrollEmployee
}

export interface PayrollManagementFeeConfig {
  id: string
  rate_pct: number
  portfolio_id: string | null
  effective_date: string
  created_at: string
  created_by: string | null
}

export interface PayrollInvoice {
  id: string
  payroll_week_id: string
  owner_llc: string
  portfolio_id: string | null
  status: InvoiceStatus
  total_amount: number
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  line_items?: PayrollInvoiceLineItem[]
}

export interface PayrollInvoiceLineItem {
  id: string
  invoice_id: string
  property_id: string
  description: string | null
  cost_type: CostType
  labor_amount: number
  spread_amount: number
  mgmt_fee_amount: number
  total_amount: number
  created_at: string
  property?: Property
}

export interface PayrollWeeklyPropertyCost {
  payroll_week_id: string
  property_id: string
  labor_cost: number
  spread_cost: number
  total_cost: number
  cost_per_unit: number
  property?: Property
}

export interface PayrollADPReconciliation {
  id: string
  payroll_week_id: string
  system_gross_total: number
  adp_gross_total: number
  variance: number
  resolved: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PayrollApproval {
  id: string
  payroll_week_id: string
  stage: ApprovalStage
  reference_id: string | null
  approved_by: string
  approved_at: string
  notes: string | null
}

export interface Property {
  id: string
  code: string
  name: string
  address: string | null
  total_units: number | null
  portfolio_id: string | null
  is_active: boolean
}

export interface Portfolio {
  id: string
  name: string
  is_active: boolean
}
