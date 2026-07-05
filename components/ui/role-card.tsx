import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RoleData = {
  value: string;
  label: string;
  description: string;
};

export const ROLES: RoleData[] = [
  {
    value: "producer",
    label: "Producer",
    description: "Sell raw goods directly to buyers",
  },
  {
    value: "processor",
    label: "Processor",
    description: "Convert raw goods into finished products",
  },
  {
    value: "packer",
    label: "Packer",
    description: "Package goods for distribution",
  },
  {
    value: "delivery_agent",
    label: "Delivery Agent",
    description: "Deliver goods to the final customer",
  },
  {
    value: "retailer",
    label: "Retailer",
    description: "Buy goods, then resell them",
  },
  {
    value: "consumer",
    label: "Consumer",
    description: "Browse and purchase products",
  },
];

function SeedlingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M12 22V12M12 12a8 8 0 018-8h2v2a8 8 0 01-8 8M12 12a8 8 0 00-8-8H2v2a8 8 0 008 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 22V12M12 12L3.3 7.7M12 12l8.7-4.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M16 3H1v13h15V3zM16 8h4l3 5v3h-7V8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 22V12h6v10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 10a4 4 0 01-8 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const roleIcons: Record<string, ReactNode> = {
  producer: <SeedlingIcon />,
  processor: <GearIcon />,
  packer: <BoxIcon />,
  delivery_agent: <TruckIcon />,
  retailer: <StoreIcon />,
  consumer: <CartIcon />,
};

export function getRoleIcon(value: string): ReactNode {
  return roleIcons[value] ?? null;
}

type RoleCardProps = {
  role: RoleData;
  selected?: boolean;
  interactive?: boolean;
  onSelect?: (value: string) => void;
};

export function RoleCard({
  role,
  selected = false,
  interactive = false,
  onSelect,
}: RoleCardProps) {
  const Component = interactive ? "button" : "div";

  return (
    <Component
      {...(interactive
        ? {
            type: "button" as const,
            onClick: () => onSelect?.(role.value),
            "aria-pressed": selected,
          }
        : {})}
      className={cn(
        "flex flex-col gap-2 rounded-[var(--radius)] border bg-card p-3 text-left transition-all duration-150",
        !interactive && "cursor-default",
        interactive &&
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        selected
          ? "border-2 border-accent"
          : "border border-border",
        interactive && !selected && "hover:border-muted",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full",
          selected ? "text-accent" : "text-muted",
        )}
      >
        {roleIcons[role.value]}
      </span>
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            "text-sm font-semibold",
            selected ? "text-accent" : "text-foreground",
          )}
        >
          {role.label}
        </span>
        <span className="text-xs leading-snug text-muted">
          {role.description}
        </span>
      </div>
    </Component>
  );
}
