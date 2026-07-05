import type { ReactNode } from "react";

const valueProps = [
  {
    label: "Trace every step from farm to your door",
  },
  {
    label: "Every participant gets paid for the work they do",
  },
  {
    label: "See the full price breakdown before you buy",
  },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col md:flex-row">
      <div className="hidden bg-primary md:flex md:w-[45%] flex-col p-12">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 32 32"
              className="h-7 w-7"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M5,21 C 9,9 23,9 27,21"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="5" cy="21" r="3.2" fill="currentColor" />
              <circle cx="12.3" cy="11.4" r="3" fill="currentColor" />
              <circle cx="19.7" cy="11.4" r="3" fill="currentColor" />
              <circle cx="27" cy="21" r="3.4" fill="#F9A825" />
            </svg>
            <span className="text-lg font-bold tracking-tight text-primary-foreground">
              Chainbridge
            </span>
          </div>

          <p className="text-xl font-semibold leading-snug tracking-tight text-primary-foreground">
            A direct marketplace for Kenya&rsquo;s supply chain, from farm to
            consumer.
          </p>
        </div>

        <ul className="mt-12 flex flex-col gap-4">
          {valueProps.map((prop) => (
            <li
              key={prop.label}
              className="flex items-start gap-3 text-sm text-primary-foreground/80"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                aria-hidden
              >
                <circle cx="10" cy="10" r="4" fill="currentColor" />
              </svg>
              {prop.label}
            </li>
          ))}
        </ul>

        <blockquote className="mt-auto text-sm leading-relaxed text-primary-foreground/60">
          &ldquo;Every step of the supply chain, visible. Every participant,
          paid for their part.&rdquo;
        </blockquote>
      </div>

      <div className="bg-primary px-4 py-3 md:hidden">
        <span className="text-base font-bold tracking-tight text-primary-foreground">
          Chainbridge
        </span>
      </div>

      <div className="flex w-full md:w-[55%] flex-col items-center justify-center bg-background px-4 py-8 md:px-8 md:py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
