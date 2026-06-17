import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Build a redirect that preserves any refreshed Supabase auth cookies. */
function redirectPreservingCookies(
  url: URL,
  from: NextResponse,
): NextResponse {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export async function middleware(request: NextRequest) {
  const { user, response } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // --- Dashboard requires authentication --------------------------------------
  // Both Free and Pro plans have full dashboard access; entitlements (the
  // 10-order/month Free cap and Pro overage) are enforced at order time.
  if (pathname.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return redirectPreservingCookies(url, response);
  }

  // --- Send already-authenticated users away from the auth pages -------------
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return redirectPreservingCookies(url, response);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all routes except:
     * - Next.js internals (_next/static, _next/image)
     * - API routes (they manage their own auth and need raw bodies)
     * - static asset files
     */
    "/((?!_next/static|_next/image|favicon.ico|api|c/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
