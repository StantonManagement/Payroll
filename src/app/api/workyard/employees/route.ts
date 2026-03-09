import { NextResponse } from 'next/server'

const BASE_URL = 'https://api.workyard.com'
const API_KEY = process.env.WORKYARD_API_KEY!
const ORG_ID = process.env.WORKYARD_ORG_ID!

export interface WYEmployeeBasic {
  employee_id: number
  display_name: string
  first_name: string
  last_name: string
  email: string | null
  status: string
  title: string | null
}

interface WYListResponse<T> {
  data: T[]
  meta: { current_page: number; last_page: number; total: number; per_page: number }
}

export async function GET() {
  if (!API_KEY || !ORG_ID) {
    return NextResponse.json({ error: 'Workyard API credentials not configured' }, { status: 500 })
  }

  try {
    const employees: WYEmployeeBasic[] = []
    let page = 1

    while (true) {
      const qs = `limit=100&page=${page}&sort_by=asc:employee_display_name`

      const res = await fetch(`${BASE_URL}/orgs/${ORG_ID}/employees.v2?${qs}`, {
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Workyard API ${res.status}: ${body}`)
      }

      const data = (await res.json()) as WYListResponse<WYEmployeeBasic>
      employees.push(...data.data)
      if (page >= data.meta.last_page) break
      page++
    }

    return NextResponse.json({ employees })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
