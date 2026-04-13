import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/format";

function getActionTone(action) {
  if (action === "BUY") {
    return "buy";
  }

  if (action === "SELL") {
    return "sell";
  }

  return "neutral";
}

function getTrendTone(trend) {
  if (trend === "UP") {
    return "buy";
  }

  if (trend === "DOWN") {
    return "sell";
  }

  return "warn";
}

export function MarketDashboard({ market, refreshing }) {
  const actionTone = getActionTone(market.action);
  const trendTone = getTrendTone(market.trend4H);

  return (
    <div className="dashboard">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Trading Dashboard</span>
          <h1>{market.symbol} market overview</h1>
          <p>
            Frontend consumindo apenas a API consolidada. Toda a lógica de
            RSI, EMA e decisão está centralizada no backend.
          </p>
        </div>

        <div className="hero-panel__status">
          <StatusBadge tone={actionTone}>{market.action}</StatusBadge>
          <StatusBadge tone={trendTone}>{market.trend4H}</StatusBadge>
          <span className="hero-panel__timestamp">
            {refreshing ? "Atualizando..." : "Dados sincronizados"}
          </span>
        </div>
      </section>

      <div className="metric-grid">
        <MetricCard label="BTC Price" value={formatCurrency(market.price)} />
        <MetricCard
          label="Confidence"
          value={formatPercent(market.confidence)}
          tone={actionTone}
        />
        <MetricCard
          label="Trend Strength"
          value={formatPercent(market.trendStrength)}
          hint="Combina distância EMA50/EMA200 e inclinação recente da EMA50"
        />
        <MetricCard
          label="Volume"
          value={formatNumber(market.volume)}
          hint={`Avg ${formatNumber(market.avgVolume)}`}
        />
      </div>

      <div className="details-grid">
        <SectionCard
          title="Indicators"
          description="Indicadores calculados no backend e retornados prontos para a UI."
        >
          <div className="metric-grid metric-grid--compact">
            <MetricCard label="RSI 5m" value={formatNumber(market.rsi5m)} />
            <MetricCard label="RSI 1h" value={formatNumber(market.rsi1h)} />
            <MetricCard label="EMA 50" value={formatCurrency(market.ema50)} />
            <MetricCard label="EMA 200" value={formatCurrency(market.ema200)} />
          </div>
        </SectionCard>

        <SectionCard
          title="Decision Context"
          description="Leitura operacional usada pelo bot para BUY, SELL ou HOLD."
        >
          <div className="context-list">
            <div className="context-row">
              <span>Action</span>
              <StatusBadge tone={actionTone}>{market.action}</StatusBadge>
            </div>
            <div className="context-row">
              <span>Trend 4H</span>
              <StatusBadge tone={trendTone}>{market.trend4H}</StatusBadge>
            </div>
            <div className="context-row">
              <span>Reason</span>
              <p>{market.reason.summary}</p>
            </div>
            <div className="context-row">
              <span>Reason Code</span>
              <p>{market.reason.code}</p>
            </div>
            <div className="context-row">
              <span>Why HOLD/Entry</span>
              <p>{market.reason.details.join(" ")}</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
