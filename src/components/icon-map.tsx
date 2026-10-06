import {
  UserPlus,
  XCircle,
  Users,
  ShieldCheck,
  FileCheck2,
  Star,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  UserPlus,
  XCircle,
  Users,
  ShieldCheck,
  FileCheck2,
  Star,
};

export function ServiceIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? UserPlus;
  return <Icon className={className} aria-hidden="true" />;
}
