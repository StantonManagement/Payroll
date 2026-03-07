/**
 * Payroll business constants.
 * These are intentionally separated from calculation logic so they can be
 * found and changed in one place. Long-term these should move to DB config
 * tables (like payroll_management_fee_config) so changes don't require a deploy.
 */

/** Employer payroll tax rate (FICA/SUTA burden applied to gross pay). */
export const PAYROLL_TAX_RATE = 0.08

/** Workers' compensation rate applied to gross pay. */
export const WORKERS_COMP_RATE = 0.03

/** Weekly phone reimbursement amount per active employee (USD). */
export const PHONE_REIMBURSEMENT_AMOUNT = 8

/**
 * Workyard project name fragments that indicate unallocated / overhead time.
 * Entries matching these names are flagged for redistribution on import.
 */
export const OVERHEAD_PROPERTY_NAMES = [
  'unallocated',
  'stanton management',
  'stanton management llc',
]

/** IANA timezone for the Workyard org. Used for date boundary calculations. */
export const WORKYARD_ORG_TIMEZONE = 'America/New_York'
