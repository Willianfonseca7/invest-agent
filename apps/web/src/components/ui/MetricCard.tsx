import type { StatusTone } from "@/types/market";

type MetricCardProps = {
  label: string;
  value: string;
  tone?: StatusTone;
  hint?: string;
};

export function MetricCard({ label, value, tone = "default", hint }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <span className="metric-card__label">{label}</span>
      <strong className="metric-card__value">{value}</strong>
      {hint ? <span className="metric-card__hint">{hint}</span> : null}
    </article>
  );
}
