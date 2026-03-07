import { NextRequest, NextResponse } from 'next/server'
import { fetchWorkyardTimecards } from '@/lib/payroll/workyard-api'

export async function GET(req: NextRequest) {
  const weekStart = req.nextUrl.searchParams.get('weekStart')
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: 'weekStart param required (YYYY-MM-DD)' }, { status: 400 })
  }

  if (!process.env.WORKYARD_API_KEY || !process.env.WORKYARD_ORG_ID) {
    return NextResponse.json({ error: 'Workyard API credentials not configured' }, { status: 500 })
  }

  try {
    const result = await fetchWorkyardTimecards(weekStart)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
