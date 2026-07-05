import type { ReactNode } from "react";
import { getUser } from "@/lib/auth";
import { logout } from "@/lib/auth/actions";

const roleLabels: Record<string, string> = {
  producer: "Producer",
  retailer: "Retailer",
  consumer: "Consumer",
  processor: "Processor",
  packer: "Packer",
  delivery_agent: "Delivery Agent",
  admin: "Admin",
};

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUser();
  const roleLabel = roleLabels[user.role] ?? user.role;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 items-center justify-between max-w-[1120px] px-6 md:px-12">
          <a href="/" className="flex items-center gap-2">
            <img
              src="/chainbridge-logo-lockup.svg"
              alt="Chainbridge"
              className="h-8 w-auto"
            />
          </a>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted">
              {roleLabel}
            </span>

            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-muted transition-colors hover:text-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  {user.name.charAt(0)}
                </span>
                <svg
                  width="10"
                  height="6"
                  viewBox="0 0 10 6"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M1 1l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>
              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-card shadow-sm">
                <div className="border-b border-border px-3 py-2">
                  <p className="text-sm font-medium text-foreground">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted">{user.email}</p>
                </div>
                <a
                  href="/profile"
                  className="block px-3 py-2 text-sm text-muted transition-colors hover:bg-muted/20 hover:text-foreground"
                >
                  Profile
                </a>
                <form action={logout}>
                  <button
                    type="submit"
                    className="w-full px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-muted/20 hover:text-foreground"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-8 px-6 py-8 md:px-12 md:py-12">
        {children}
      </main>
    </div>
  );
}
