'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { FormInput, FormButton } from '@/components/form'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Sign in failed')
        return
      }
      window.location.href = '/payroll'
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
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
                name="email"
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
              <div className="relative">
                <FormInput
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] transition-colors duration-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
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
