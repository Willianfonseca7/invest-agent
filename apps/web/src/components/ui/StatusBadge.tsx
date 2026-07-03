import type { ReactNode } from "react";
import type { StatusTone } from "@/types/market";

type StatusBadgeProps = {
  tone?: Exclude<StatusTone, "default">;
  children: ReactNode;
};

export function StatusBadge({ tone = "neutral", children }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${tone}`}>{children}</span>
  );
}
