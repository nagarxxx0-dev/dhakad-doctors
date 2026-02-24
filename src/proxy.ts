import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isProfileVerified, normalizeRole } from '@/utils/profile-utils'

function isMissingEnv() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isAdminPath = path.startsWith('/admin')
  const isDashboardPath = path.startsWith('/dashboard')
  const isProtected = isDashboardPath || isAdminPath
  const isUpdatePasswordPath = path.startsWith('/dashboard/update-password')
  const isPendingApprovalPage = path === '/approval-pending'

  // Public routes don't need auth checks in proxy; skip remote calls for faster, safer rendering.
  if (!isProtected && !isPendingApprovalPage) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  if (isMissingEnv()) {
    console.error('Proxy error: missing Supabase environment variables.')
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const redirectWithSessionCookies = (pathname: string) => {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    const redirectResponse = NextResponse.redirect(url)

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })

    return redirectResponse
  }

  let user: { id: string } | null = null

  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    user = authUser
  } catch (error) {
    console.error('Proxy auth check failed:', error)
    return redirectWithSessionCookies('/login')
  }

  if (!user) {
    return redirectWithSessionCookies('/login')
  }

  let profile: Record<string, unknown> | null = null
  try {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    profile = (data as Record<string, unknown> | null) ?? null
  } catch (error) {
    console.error('Proxy profile check failed:', error)
    if (isAdminPath) {
      return redirectWithSessionCookies('/dashboard')
    }
    return response
  }

  const role = normalizeRole(profile?.role)
  const isApprovedUser = isProfileVerified(profile)

  if (isPendingApprovalPage && isApprovedUser) {
    return redirectWithSessionCookies('/dashboard')
  }

  if (isDashboardPath && !isUpdatePasswordPath && !isApprovedUser) {
    return redirectWithSessionCookies('/approval-pending')
  }

  if (isAdminPath && role !== 'admin') {
    return redirectWithSessionCookies(isApprovedUser ? '/dashboard' : '/approval-pending')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
