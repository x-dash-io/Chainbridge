import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const routeRoleMap: Record<string, string> = {
  producer: "producer",
  processor: "processor",
  packer: "packer",
  delivery: "delivery_agent",
  consumer: "consumer",
  retailer: "retailer",
  admin: "admin",
};

const dashboardPaths = Object.keys(routeRoleMap);
const authPaths = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse } = await updateSession(request);

  // IMPORTANT: any redirect we issue must carry forward the (possibly
  // refreshed) auth cookies that updateSession() wrote onto
  // supabaseResponse. Building a bare `NextResponse.redirect(...)` drops
  // those cookies, so the browser keeps resending the stale/expired token
  // on the next request, which triggers another refresh + another dropped
  // cookie + another redirect — an infinite ERR_TOO_MANY_REDIRECTS loop in
  // production once a token is actually due for refresh. Always route
  // redirects through this helper instead.
  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url));
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });
    return response;
  };

  const { pathname } = request.nextUrl;

  const matchedDashboard = dashboardPaths.find(
    (p) => pathname === `/${p}` || pathname.startsWith(`/${p}/`),
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (matchedDashboard) {
      return redirect("/login");
    }
    return supabaseResponse;
  }

  if (matchedDashboard) {
    const requiredRole = routeRoleMap[matchedDashboard];
    const userRole = user.user_metadata?.role as string | undefined;

    if (userRole !== requiredRole) {
      if (userRole) {
        const correctPath =
          userRole === "delivery_agent" ? "/delivery" : `/${userRole}`;
        // Guard against redirecting a route back to itself (which would be
        // an immediate self-loop) if role/path derivation ever disagrees.
        if (correctPath !== pathname) {
          return redirect(correctPath);
        }
      } else {
        return redirect("/login");
      }
    }
  }

  if (authPaths.includes(pathname)) {
    const role = user.user_metadata?.role as string | undefined;
    if (role) {
      const dest = role === "delivery_agent" ? "/delivery" : `/${role}`;
      if (dest !== pathname) {
        return redirect(dest);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};