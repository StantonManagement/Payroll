import type { WorkyardRow } from '@/lib/payroll/csv-parser'
import { WORKYARD_ORG_TIMEZONE } from '@/lib/payroll/config'

const BASE_URL = 'https://api.workyard.com'
const API_KEY = process.env.WORKYARD_API_KEY!
const ORG_ID = process.env.WORKYARD_ORG_ID!

function headers() {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function workyardFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Workyard API ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

interface WYProject {
  id: number
  name: string
  org_customer_id: number
  customer?: { id: number; name: string }
}

interface WYGeofence {
  id: number
  name: string
}

interface WYJobCode {
  id: number
  name: string
  code: string
}

interface WYCostAllocation {
  org_project_id: number | null
  geofence_id: number | null
  geofence?: WYGeofence
  job_code_id: number | null
  job_code?: WYJobCode
  duration_secs: number | null
}

interface WYWorker {
  employee_id: number
  display_name: string
  first_name: string
  last_name: string
}

interface WYTimeSummaryV2 {
  duration_secs: number
  regular_secs: number
  over_time_secs: number
  double_time_secs: number
  paid_break_secs: number
  unpaid_break_secs: number
}

interface WYTimeCard {
  id: number
  employee_id: number
  start_dt_unix: number
  end_dt_unix: number | null
  status: 'working' | 'submitted' | 'approved' | 'processed' | 'deleted'
  timezone: string
  time_summary_v2: WYTimeSummaryV2 | null
  cost_allocations: WYCostAllocation[]
  worker: WYWorker
}

interface WYListResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    total: number
    per_page: number
  }
}

/** Fetch all projects for the org, returning a map of project_id → S-code */
async function fetchProjectMap(): Promise<Map<number, { sCode: string; customerName: string }>> {
  const map = new Map<number, { sCode: string; customerName: string }>()
  let page = 1

  while (true) {
    const data = await workyardFetch<WYListResponse<WYProject>>(
      `/orgs/${ORG_ID}/projects?limit=100&page=${page}&include=customer`
    )
    for (const proj of data.data) {
      const sCode = proj.name.match(/^(S\d+)/)?.[1] ?? proj.name
      map.set(proj.id, {
        sCode,
        customerName: proj.customer?.name ?? '',
      })
    }
    if (page >= data.meta.last_page) break
    page++
  }

  return map
}

/** Fetch all approved time cards for a date range, paginating automatically */
async function fetchApprovedTimeCards(startUnix: number, endUnix: number): Promise<WYTimeCard[]> {
  const cards: WYTimeCard[] = []
  let page = 1

  while (true) {
    const params = new URLSearchParams({
      status: 'eq:approved',
      start_dt_unix: `gte:${startUnix}`,
      end_dt_unix: `lt:${endUnix}`,
      include: 'cost_allocations,worker',
      limit: '100',
      page: String(page),
    })

    const data = await workyardFetch<WYListResponse<WYTimeCard>>(
      `/orgs/${ORG_ID}/time_cards?${params}`
    )
    cards.push(...data.data)
    if (page >= data.meta.last_page) break
    page++
  }

  return cards
}

/**
 * Returns the Unix timestamp for midnight in the org timezone on a given YYYY-MM-DD
 * date string. Uses a noon-UTC probe to derive the correct UTC offset, handling DST.
 */
function orgMidnightUnix(dateStr: string): number {
  const probe = new Date(`${dateStr}T12:00:00Z`)
  const nycHour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: WORKYARD_ORG_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    }).format(probe)
  )
  const utcOffset = 12 - nycHour // 5 in EST, 4 in EDT
  return Math.floor(
    new Date(`${dateStr}T${String(utcOffset).padStart(2, '0')}:00:00Z`).getTime() / 1000
  )
}

/** Convert a Unix timestamp to YYYY-MM-DD in the org timezone */
function unixToDate(unix: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: WORKYARD_ORG_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(unix * 1000))
}

/**
 * Fetch all approved Workyard time cards for a given week and convert them to
 * WorkyardRow[] — the same interface produced by parseWorkyardCSV().
 *
 * A single time card with multiple cost allocations is split into one row per
 * allocation, with hours distributed proportionally by duration_secs.
 */
export async function fetchWorkyardTimecards(
  weekStart: string
): Promise<{ rows: WorkyardRow[]; stats: { total: number; allocations: number } }> {
  const startUnix = orgMidnightUnix(weekStart)
  // Advance 7 days from noon UTC to stay in the right calendar day, then find midnight
  const endProbe = new Date(`${weekStart}T12:00:00Z`)
  endProbe.setUTCDate(endProbe.getUTCDate() + 7)
  const endDateStr = endProbe.toISOString().slice(0, 10)
  const endUnix = orgMidnightUnix(endDateStr)

  const [cards, projectMap] = await Promise.all([
    fetchApprovedTimeCards(startUnix, endUnix),
    fetchProjectMap(),
  ])

  const rows: WorkyardRow[] = []

  for (const card of cards) {
    const workyardId = String(card.worker?.employee_id ?? card.employee_id)
    const employeeName = card.worker?.display_name ?? `Employee ${card.employee_id}`
    const entryDate = unixToDate(card.start_dt_unix)
    const timecardId = String(card.id)

    const summary = card.time_summary_v2
    const totalRegSecs = summary?.regular_secs ?? 0
    const totalOtSecs = summary?.over_time_secs ?? 0
    const totalDtSecs = summary?.double_time_secs ?? 0

    const allocations = card.cost_allocations?.filter(a => a.org_project_id !== null) ?? []

    if (allocations.length === 0) {
      rows.push({
        workyardId,
        employeeName,
        projectName: '',
        customerName: '',
        entryDate,
        regularHours: Math.round((totalRegSecs / 3600) * 100) / 100,
        otHours: Math.round(((totalOtSecs + totalDtSecs) / 3600) * 100) / 100,
        ptoHours: 0,
        timecardId,
        costCode: '',
      })
      continue
    }

    const totalAllocSecs = allocations.reduce((sum, a) => sum + (a.duration_secs ?? 0), 0)

    for (const alloc of allocations) {
      const proportion = totalAllocSecs > 0 ? (alloc.duration_secs ?? 0) / totalAllocSecs : 1 / allocations.length
      const proj = alloc.org_project_id ? projectMap.get(alloc.org_project_id) : null

      rows.push({
        workyardId,
        employeeName,
        projectName: proj?.sCode ?? alloc.geofence?.name ?? '',
        customerName: proj?.customerName ?? '',
        entryDate,
        regularHours: Math.round((totalRegSecs * proportion / 3600) * 100) / 100,
        otHours: Math.round(((totalOtSecs + totalDtSecs) * proportion / 3600) * 100) / 100,
        ptoHours: 0,
        timecardId,
        costCode: alloc.job_code?.name ?? '',
      })
    }
  }

  return {
    rows,
    stats: { total: cards.length, allocations: rows.length },
  }
}

export interface WYEmployee {
  employee_id: number
  display_name: string
  email: string
  pay_type: string
  pay_rate: number | null
  status: string
}

/** Fetch all employees from Workyard */
export async function fetchWorkyardEmployees(): Promise<WYEmployee[]> {
  const employees: WYEmployee[] = []
  let page = 1

  while (true) {
    const data = await workyardFetch<WYListResponse<WYEmployee>>(
      `/orgs/${ORG_ID}/employees.v2?limit=100&page=${page}`
    )
    employees.push(...data.data)
    if (page >= data.meta.last_page) break
    page++
  }

  return employees
}
