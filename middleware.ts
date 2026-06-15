import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isSubscriptionActive } from "@/lib/subscription-status";

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
  const { supabase, user, response } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // --- Dashboard: require auth + an active/trialing subscription ------------
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectedFrom", pathname);
      return redirectPreservingCookies(url, response);
    }

    // Always allow the billing page so users can start / fix their plan.
    if (!pathname.startsWith("/dashboard/billing")) {
      const { data: merchant } = await supabase
        .from("merchants")
        .select("subscription_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isSubscriptionActive(merchant?.subscription_status)) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/billing";
        url.searchParams.set("reason", "subscription_required");
        return redirectPreservingCookies(url, response);
      }
    }
  }

  // --- Send already-authenticated users away from the auth pages -----------
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
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
