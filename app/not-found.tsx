import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const roleToPath: Record<string, string> = {
  producer: "/producer",
  processor: "/processor",
  packer: "/packer",
  delivery_agent: "/delivery",
  retailer: "/retailer",
  consumer: "/consumer",
  admin: "/admin",
};

async function getDashboardLink(): Promise<{ href: string; label: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.user_metadata?.role) {
      const role = user.user_metadata.role as string;
      const path = roleToPath[role] ?? "/";
      return { href: path, label: "Go to your dashboard" };
    }
  } catch {}

  return { href: "/", label: "Go to the landing page" };
}

export default async function NotFound() {
  const cta = await getDashboardLink();

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-center gap-6 text-center">
        <svg
          viewBox="0 0 32 32"
          className="h-16 w-16 opacity-30"
          aria-hidden
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5,21 C 9,9 23,9 27,21"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="5" cy="21" r="3.2" fill="currentColor" />
          <circle cx="12.3" cy="11.4" r="3" fill="currentColor" />
          <circle cx="19.7" cy="11.4" r="3" fill="currentColor" />
          <circle cx="27" cy="21" r="3.4" fill="currentColor" />
        </svg>

        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          This page doesn&apos;t exist
        </h1>

        <p className="text-sm text-muted">
          The chain ends here. The link you followed may be broken or the page
          may have been removed.
        </p>

        <Link
          href={cta.href}
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-primary px-5 text-sm font-medium text-primary-foreground transition-all duration-150 hover:bg-[#166B24] active:scale-[0.98]"
        >
          {cta.label}
        </Link>
      </div>
    </div>
  );
}
