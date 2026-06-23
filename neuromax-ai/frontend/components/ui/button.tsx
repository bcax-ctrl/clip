import { clsx } from "clsx";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export function Button({ variant = "primary", className, ...props }: Props) {
  return (
    <button
      className={clsx(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" && "bg-accent text-white hover:bg-accent/80",
        variant === "ghost" && "border border-border text-muted hover:text-white hover:border-accent/50",
        className
      )}
      {...props}
    />
  );
}
