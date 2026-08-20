// ============================================================
// middleware.ts — Supabase Auth Guard (replaces AuthGuard,
// ApprovalGuard, AdminRoute, StudentRoute, OnboardingGuard)
// ============================================================
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — IMPORTANT: do not remove this
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Helper to perform redirects while preserving Supabase session cookies
  const redirect = (toPath: string) => {
    const url = request.nextUrl.clone();
    url.pathname = toPath;
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => {
      response.cookies.set(c.name, c.value, {
        path: c.path,
        domain: c.domain,
        maxAge: c.maxAge,
        secure: c.secure,
        sameSite: c.sameSite,
        expires: c.expires,
        httpOnly: c.httpOnly,
      });
    });
    return response;
  };

  // ── Public routes — always accessible ────────────────────
  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/cron') || // cron routes secured by CRON_SECRET header
    pathname.startsWith('/api/mcp') || // MCP server secured by Bearer-token auth in-handler
    pathname === '/';

  // ── Redirect unauthenticated users to /login ─────────────
  if (!user && !isPublicRoute) {
    return redirect('/login');
  }

  // ── Redirect authenticated users away from /login ────────
  if (user && pathname.startsWith('/login')) {
    return redirect('/');
  }

  // ── For authenticated users: check profile for role/approval ─
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_approved, is_onboarded, is_admin, is_super_admin')
      .eq('id', user.id)
      .single();

    // Not yet approved — redirect to pending page (unless already there)
    if (
      profile &&
      !profile.is_approved &&
      !pathname.startsWith('/pending-approval')
    ) {
      return redirect('/pending-approval');
    }

    // Approved but not onboarded — redirect to onboarding
    if (
      profile?.is_approved &&
      !profile.is_onboarded &&
      !pathname.startsWith('/onboarding') &&
      !pathname.startsWith('/pending-approval')
    ) {
      return redirect('/onboarding');
    }

    // Admin-only routes — redirect students away
    const adminOnlyPaths = [
      '/kids', '/activities', '/tasks', '/scheduled', '/archived',
      '/syllabus-generator', '/reports', '/settings', '/family',
      '/admin', '/system',
    ];
    if (
      profile &&
      !profile.is_admin &&
      adminOnlyPaths.some((p) => pathname.startsWith(p))
    ) {
      return redirect('/');
    }

    // Student-only routes — redirect admins away
    const studentOnlyPaths = ['/my-learning', '/progress', '/profile'];
    if (
      profile?.is_admin &&
      studentOnlyPaths.some((p) => pathname.startsWith(p))
    ) {
      return redirect('/');
    }

    // Super-admin-only routes
    const superAdminPaths = ['/admin/approvals'];
    if (
      profile &&
      !profile.is_super_admin &&
      superAdminPaths.some((p) => pathname.startsWith(p))
    ) {
      return redirect('/');
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
