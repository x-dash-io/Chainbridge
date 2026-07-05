"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { cn } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
  name?: string;
};

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select an option\u2026",
  className,
  disabled,
  error,
  name,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, close]);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.focus();
    }
  }, [open, activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(0);
        } else if (activeIndex >= 0) {
          onChange?.(options[activeIndex].value);
          close();
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(0);
        } else {
          setActiveIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : 0,
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) {
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : options.length - 1,
          );
        }
        break;
      case "Tab":
        close();
        break;
    }
  };

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value ?? ""} />

      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="select-listbox"
        aria-activedescendant={
          activeIndex >= 0 ? `select-option-${activeIndex}` : undefined
        }
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-[var(--radius)] border bg-card px-4 py-2 text-base",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-destructive" : "border-input",
          !selected && "text-muted",
          className,
        )}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={cn(
            "h-4 w-4 text-muted transition-transform duration-150",
            open && "rotate-180",
          )}
          aria-hidden
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          ref={listRef}
          id="select-listbox"
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 mt-1 w-full rounded-[var(--radius)] border border-border bg-card py-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
        >
          {options.length === 0 ? (
            <div className="px-4 py-2 text-sm text-muted">No options</div>
          ) : (
            options.map((option, i) => (
              <button
                key={option.value}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                type="button"
                role="option"
                id={`select-option-${i}`}
                aria-selected={option.value === value}
                tabIndex={-1}
                onClick={() => {
                  onChange?.(option.value);
                  close();
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "flex w-full items-center px-4 py-2 text-left text-sm transition-colors",
                  option.value === value
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-foreground hover:bg-[#F0F0EE]",
                  activeIndex === i && option.value !== value && "bg-[#F0F0EE]",
                )}
              >
                <span className="flex-1">{option.label}</span>
                {option.value === value && (
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    className="h-4 w-4 text-primary"
                    aria-hidden
                  >
                    <path
                      d="M4 8l2.5 2.5L12 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
