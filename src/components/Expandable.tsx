"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface ExpandableProps {
  trigger: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function Expandable({ trigger, children, defaultOpen = false, className = "" }: ExpandableProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-start rounded-lg transition-colors hover:bg-[var(--warm-glow)] p-1 -m-1"
      >
        <div className="min-w-0 flex-1">{trigger}</div>
        <ChevronDown
          size={14}
          className={`shrink-0 text-[var(--fg-muted)] transition-transform duration-200 ms-2 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-2 animate-[fadeIn_0.15s_ease-out]">
          {children}
        </div>
      )}
    </div>
  );
}
