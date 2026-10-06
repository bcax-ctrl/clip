import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <div>
        <p className="text-2xl font-extrabold text-primary sm:text-3xl">
          {value}
        </p>
        <p className="text-base text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
