import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    if (pathname.startsWith('/payroll/login')) {
      return NextResponse.next({ request })
    }
    return NextResponse.redirect(new URL('/payroll/login', request.url))
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  // Allow login page through
  if (pathname.startsWith('/payroll/login')) {
    if (user) {
      return NextResponse.redirect(new URL('/payroll', request.url))
    }
    return supabaseResponse
  }

  // Protect all /payroll routes
  if (pathname.startsWith('/payroll')) {
    if (!user) {
      return NextResponse.redirect(new URL('/payroll/login', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/payroll/:path*'],
}
