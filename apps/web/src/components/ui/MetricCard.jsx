export function MetricCard({ label, value, tone = "default", hint }) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <span className="metric-card__label">{label}</span>
      <strong className="metric-card__value">{value}</strong>
      {hint ? <span className="metric-card__hint">{hint}</span> : null}
    </article>
  );
}
