'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FormInput, FormButton } from '@/components/form'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    router.push('/payroll')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[var(--primary)] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-xs text-white/50 uppercase tracking-widest font-medium mb-2">Stanton Management</p>
          <h1 className="font-serif text-white text-3xl leading-tight">Payroll &amp; Invoicing</h1>
        </div>

        {/* Card */}
        <div className="bg-[var(--paper)] p-8">
          <h2 className="font-serif text-[var(--primary)] text-lg mb-6">Sign in</h2>

          {error && (
            <div className="mb-4 px-4 py-3 bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--ink)] uppercase tracking-wide mb-1.5">
                Email
              </label>
              <FormInput
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@stantonmanagement.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--ink)] uppercase tracking-wide mb-1.5">
                Password
              </label>
              <FormInput
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <FormButton
              type="submit"
              fullWidth
              loading={loading}
              className="mt-2 uppercase tracking-wide"
            >
              Sign in
            </FormButton>
          </form>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Access restricted to Stanton Management staff
        </p>
      </div>
    </div>
  )
}
