"use client";

/**
 * Rich visual widgets for AI chat responses.
 * The AI outputs fenced code blocks with language "widget" containing JSON.
 * This component parses and renders them as dashboard-style visualizations.
 *
 * Supported widget types:
 * - progress: { type: "progress", label, value, max, unit? }
 * - stats: { type: "stats", items: [{ label, value, color? }] }
 * - status-list: { type: "status-list", items: [{ name, status, detail? }] }
 */

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-[var(--success)] text-white",
  INSTALLED: "bg-[var(--success)] text-white",
  PAID: "bg-[var(--success)] text-white",
  IN_PROGRESS: "bg-blue-500 text-white",
  PENDING: "bg-amber-500 text-white",
  NOT_STARTED: "bg-[var(--border)] text-[var(--fg-muted)]",
  ORDERED: "bg-purple-500 text-white",
  DELIVERED: "bg-teal-500 text-white",
  ON_HOLD: "bg-orange-500 text-white",
  OVERDUE: "bg-[var(--alert)] text-white",
  OPEN: "bg-[var(--alert)] text-white",
  RESOLVED: "bg-[var(--success)] text-white",
};

function ProgressWidget({ label, value, max, unit }: { label: string; value: number; max: number; unit?: string }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const fmt = (n: number) => unit === "ILS" || unit === "₪" ? `₪${n.toLocaleString()}` : n.toLocaleString();
  return (
    <div className="my-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--fg)]">{label}</span>
        <span className="text-[var(--fg-muted)]">{fmt(value)} / {fmt(max)} ({pct}%)</span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: pct > 90 ? "var(--alert)" : pct > 70 ? "var(--accent)" : "var(--success)" }}
        />
      </div>
    </div>
  );
}

function StatsWidget({ items }: { items: { label: string; value: string | number; color?: string }[] }) {
  return (
    <div className="my-2 grid grid-cols-2 gap-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-center">
          <p className="text-lg font-bold" style={{ color: item.color || "var(--fg)" }}>{item.value}</p>
          <p className="text-[10px] text-[var(--fg-muted)]">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function StatusListWidget({ items }: { items: { name: string; status: string; detail?: string }[] }) {
  return (
    <div className="my-2 space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[var(--fg)] truncate">{item.name}</p>
            {item.detail && <p className="text-[10px] text-[var(--fg-muted)]">{item.detail}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[item.status] || "bg-[var(--border)] text-[var(--fg-muted)]"}`}>
            {item.status}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Parse a widget JSON block and render the appropriate component. */
export function ChatWidget({ json }: { json: string }) {
  try {
    const data = JSON.parse(json);
    switch (data.type) {
      case "progress":
        return <ProgressWidget label={data.label} value={data.value} max={data.max} unit={data.unit} />;
      case "stats":
        return <StatsWidget items={data.items} />;
      case "status-list":
        return <StatusListWidget items={data.items} />;
      default:
        return <pre className="text-xs bg-[var(--bg)] p-2 rounded-lg overflow-x-auto">{json}</pre>;
    }
  } catch {
    return <pre className="text-xs bg-[var(--bg)] p-2 rounded-lg overflow-x-auto">{json}</pre>;
  }
}
