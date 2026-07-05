"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OrderLegTracker } from "@/components/order-leg-tracker";
import { ROLES, RoleCard } from "@/components/ui/role-card";
import { useInView } from "@/lib/hooks/use-in-view";

const demoLegs = [
  {
    id: "demo-1",
    roleLabel: "Raw Supply",
    status: "completed" as const,
    amount: "KES 2,400",
    timestamp: "Farmer Kamau",
    assignee: "Maize, 40 kg",
  },
  {
    id: "demo-2",
    roleLabel: "Processing",
    status: "in_progress" as const,
    amount: "KES 800",
    timestamp: "Milling Co.",
    assignee: "Premium Maize Flour, 35 kg",
  },
  {
    id: "demo-3",
    roleLabel: "Packing",
    status: "pending" as const,
    amount: "KES 300",
    timestamp: "PackPro Ltd",
    assignee: "1 kg bags \u00d7 35",
  },
  {
    id: "demo-4",
    roleLabel: "Delivery",
    status: "pending" as const,
    amount: "KES 500",
    timestamp: "Express Logistics",
    assignee: "Doorstep delivery",
  },
];

const trustProps = [
  {
    title: "Trace every step",
    description:
      "Know exactly where your product comes from and who handles it at every stage. No blind spots in your supply chain.",
  },
  {
    title: "Pay for the work done",
    description:
      "Every participant gets paid for their specific task. No middlemen taking a cut of work they didn't do.",
  },
  {
    title: "See the full price",
    description:
      "Producers set their own prices. You see the complete cost breakdown before you buy. What you see is what you pay.",
  },
];

export default function LandingPage() {
  const { ref: howRef, inView: howInView } = useInView();
  const { ref: trustRef, inView: trustInView } = useInView();
  const { ref: footerRef, inView: footerInView } = useInView();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2 shrink-0">
            <img
              src="/chainbridge-logo-lockup.svg"
              alt="Chainbridge"
              className="h-10 w-auto"
            />
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <a
              href="#how-it-works"
              className="hidden text-sm text-muted hover:text-foreground transition-colors sm:inline"
            >
              How it works
            </a>
            <a
              href="#roles"
              className="hidden text-sm text-muted hover:text-foreground transition-colors sm:inline"
            >
              Roles
            </a>
            <div className="flex items-center gap-2 md:gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="flex flex-col items-center px-4 py-20 md:py-28">
        <div className="flex w-full max-w-5xl flex-col items-center gap-10 md:gap-14">
          <div className="flex max-w-2xl flex-col items-center gap-4 text-center">
            <h1 className="text-3xl font-bold tracking-tight leading-relaxed md:text-5xl md:leading-relaxed">
              Buy directly from the source. Choose who processes, packs, and
              delivers it.
            </h1>
            <p className="max-w-lg text-base text-muted md:text-lg">
              Trace every step from farm to your door. Pay only for what you
              use.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Link href="/register">
                <Button size="lg">Get started</Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="secondary" size="lg">
                  See how it works
                </Button>
              </a>
            </div>
          </div>

          <div className="w-full rounded-[var(--radius)] border border-border bg-card p-6 md:p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06)]">
            <OrderLegTracker legs={demoLegs} />
          </div>
        </div>
      </section>

      <section
        ref={howRef}
        id="how-it-works"
        className={`border-t border-border bg-card px-4 py-20 md:py-24 ${howInView ? "in-view" : ""}`}
      >
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-12">
          <div className="reveal flex max-w-xl flex-col items-center gap-3 text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              How it works
            </h2>
            <p className="text-base text-muted">
              Six roles, one marketplace. Each participant does their part and
              gets paid for it.
            </p>
          </div>

          <div
            id="roles"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6"
          >
            {ROLES.map((role, i) => (
              <div
                key={role.value}
                className="reveal"
                style={{ "--reveal-delay": `${i * 70}ms` } as React.CSSProperties}
              >
                <RoleCard role={role} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={trustRef}
        className={`px-4 py-20 md:py-24 ${trustInView ? "in-view" : ""}`}
      >
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-12">
          <div className="reveal flex max-w-xl flex-col items-center gap-3 text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Built for trust
            </h2>
            <p className="text-base text-muted">
              Every feature is designed to make the supply chain visible, fair,
              and accountable.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
            {trustProps.map((prop) => (
              <div key={prop.title} className="reveal flex flex-col gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4"
                    aria-hidden
                  >
                    <path
                      d="M10 2a8 8 0 100 16 8 8 0 000-16z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M10 6v4M10 13v.01"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <h3 className="text-base font-semibold text-foreground">
                  {prop.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  {prop.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer
        ref={footerRef}
        className={`border-t border-border px-4 py-8 ${footerInView ? "in-view" : ""}`}
      >
        <div className="reveal mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-center md:flex-row md:text-left">
          <span className="text-sm text-muted">
            &copy; {new Date().getFullYear()} Chainbridge
          </span>
          <span className="text-xs text-muted">
            Kabarak University &middot; Martin Kariuki (INTE/MG/2927/09/22)
          </span>
        </div>
      </footer>
    </div>
  );
}
