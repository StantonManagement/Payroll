'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function CorrectionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--muted)] text-sm">Loading...</div>}>
      <CorrectionsPageContent />
    </Suspense>
  )
}

function CorrectionsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const week = searchParams.get('week')
    router.replace(week ? `/payroll/timesheets?week=${week}` : '/payroll/timesheets')
  }, [router, searchParams])

  return <div className="p-8 text-[var(--muted)] text-sm">Redirecting to Timesheet Adjustments...</div>
}

