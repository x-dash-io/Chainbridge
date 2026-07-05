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

  const { pathname } = request.nextUrl;

  const matchedDashboard = dashboardPaths.find(
    (p) => pathname === `/${p}` || pathname.startsWith(`/${p}/`),
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    if (matchedDashboard) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (authPaths.includes(pathname)) {
      return supabaseResponse;
    }
    return supabaseResponse;
  }

  const user = session.user;

  if (matchedDashboard) {
    const requiredRole = routeRoleMap[matchedDashboard];
    const userRole = user.user_metadata?.role as string | undefined;

    if (userRole !== requiredRole) {
      if (userRole) {
        const correctPath =
          userRole === "delivery_agent" ? "/delivery" : `/${userRole}`;
        return NextResponse.redirect(new URL(correctPath, request.url));
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (authPaths.includes(pathname)) {
    const role = user.user_metadata?.role as string | undefined;
    if (role) {
      const dest = role === "delivery_agent" ? "/delivery" : `/${role}`;
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
