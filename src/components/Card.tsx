"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  glow?: boolean;
}

export function Card({ children, className = "", onClick, glow }: CardProps) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 md:p-5 shadow-[0_1px_2px_rgba(26,23,20,0.04),0_2px_8px_rgba(26,23,20,0.02)] transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_4px_16px_rgba(26,23,20,0.08)] ${
        interactive ? "cursor-pointer hover:border-[var(--accent)]/25 active:scale-[0.995]" : ""
      } ${glow ? "ring-1 ring-[var(--accent)]/10" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  children?: ReactNode; // expandable content
}

export function StatCard({ label, value, accent, icon, onClick, children }: StatCardProps) {
  const [open, setOpen] = useState(false);
  const hasExpandable = !!children;

  const handleClick = () => {
    if (hasExpandable) setOpen(!open);
    else if (onClick) onClick();
  };

  return (
    <Card onClick={handleClick} className={hasExpandable ? "cursor-pointer" : ""}>
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            {label}
          </span>
          <p className={`text-xl md:text-2xl font-bold tracking-tight ${accent ? "text-[var(--alert)]" : "text-[var(--fg)]"}`}>
            {value}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {icon && <div className="rounded-xl bg-[var(--warm-glow)] p-2 text-[var(--accent)]">{icon}</div>}
          {hasExpandable && <ChevronDown size={14} className={`text-[var(--fg-muted)] transition-transform ${open ? "rotate-180" : ""}`} />}
        </div>
      </div>
      {open && children && (
        <div className="mt-3 border-t border-[var(--border-subtle)] pt-3 animate-[fadeIn_0.15s_ease-out]">
          {children}
        </div>
      )}
    </Card>
  );
}
