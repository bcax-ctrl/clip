import { Megaphone } from "lucide-react";

export function AnnouncementTicker({ items }: { items: string[] }) {
  const track = [...items, ...items];

  return (
    <div className="overflow-hidden border-y border-accent/30 bg-accent/10">
      <div className="container-page flex items-center gap-3 py-2.5">
        <span className="flex shrink-0 items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">
          <Megaphone className="size-4" aria-hidden="true" />
          Info
        </span>
        <div className="overflow-hidden" aria-live="off">
          <ul className="marquee-track flex w-max shrink-0 gap-16 text-base font-medium whitespace-nowrap">
            {track.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
