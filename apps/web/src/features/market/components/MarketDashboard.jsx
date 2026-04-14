import { useEffect, useMemo, useState } from "react";
import { useMarketOverview } from "../hooks/useMarketOverview";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/format";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MarketRsiChart } from "./MarketRsiChart";
import { MarketTrendChart } from "./MarketTrendChart";

const SYMBOL_OPTIONS = [
  { label: "BTC / USDT", value: "BTCUSDT" },
  { label: "ETH / USDT", value: "ETHUSDT" },
  { label: "SOL / USDT", value: "SOLUSDT" },
  { label: "BNB / USDT", value: "BNBUSDT" }
];

const STORAGE_KEY = "invest-agent:selected-symbol";

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(date);
}

function getAssetLabel(symbol) {
  const normalizedSymbol = String(symbol || "").toUpperCase();

  if (normalizedSymbol.endsWith("USDT")) {
    return normalizedSymbol.replace(/USDT$/, "");
  }

  return normalizedSymbol || "ATIVO";
}

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

export function MarketDashboard() {
  const [symbol, setSymbol] = useState(() => {
    if (typeof window === "undefined") {
      return "BTCUSDT";
    }

    return window.localStorage.getItem(STORAGE_KEY) || "BTCUSDT";
  });

  const { market, loading, refreshing, error, lastUpdatedAt, refetch } =
    useMarketOverview(symbol);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, symbol);
  }, [symbol]);

  const selectedSymbolLabel = useMemo(() => {
    return SYMBOL_OPTIONS.find((option) => option.value === symbol)?.label || symbol;
  }, [symbol]);
  const selectedAssetLabel = useMemo(() => getAssetLabel(symbol), [symbol]);

  if (loading && !market) {
    return (
      <section className="feedback-panel">
        <span className="eyebrow">Trading Dashboard</span>
        <h1>Carregando mercado</h1>
        <p>Buscando snapshot consolidado do backend.</p>
      </section>
    );
  }

  if (error && !market) {
    return (
      <section className="feedback-panel">
        <span className="eyebrow">Trading Dashboard</span>
        <h1>Falha ao carregar o mercado</h1>
        <p>{error}</p>
      </section>
    );
  }

  if (!market) {
    return null;
  }

  const actionTone = getActionTone(market.action);
  const trendTone = getTrendTone(market.trend4H);
  const volumeSpikeTone = market.reason?.metrics?.hasVolumeSpike ? "buy" : "neutral";

  return (
    <div className="dashboard">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Painel de Negociação</span>
          <h1>Visão geral do mercado</h1>
          <p>
            Ativo selecionado: <strong>{selectedSymbolLabel}</strong>
          </p>
          <p>
            Última atualização: {formatDateTime(lastUpdatedAt)}
          </p>
        </div>

        <div className="hero-panel__status">
          <select
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            className="symbol-select"
          >
            {SYMBOL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="hero-panel__badges">
            <StatusBadge tone={actionTone}>{market.action}</StatusBadge>
            <StatusBadge tone={trendTone}>{market.trend4H}</StatusBadge>
          </div>

          <button type="button" onClick={refetch} className="refresh-button">
            {refreshing ? "Atualizando..." : "Atualizar agora"}
          </button>
        </div>
      </section>

      {error ? (
        <section className="feedback-panel">
          <p>{error}</p>
        </section>
      ) : null}

      <div className="metric-grid">
        <MetricCard
          label={`Preço do ${selectedAssetLabel}`}
          value={formatCurrency(market.price)}
        />

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
          label="Price vs EMA50"
          value={formatPercent(market.reason?.metrics?.priceDistanceToEma50)}
          hint="Distância do preço atual em relação à EMA50"
        />

        <MetricCard
          label="Volume"
          value={formatNumber(market.volume)}
          hint={`Avg ${formatNumber(market.avgVolume)}`}
        />

        <MetricCard
          label="Recent Volume Ratio"
          value={formatNumber(market.reason?.metrics?.recentVolumeRatio)}
          hint="Volume atual comparado à média dos últimos candles"
        />

        <MetricCard
          label="Volume Spike"
          value={market.reason?.metrics?.hasVolumeSpike ? "YES" : "NO"}
          tone={volumeSpikeTone}
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
            <MetricCard
              label="EMA 200"
              value={formatCurrency(market.ema200)}
            />
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
              <p>{market.reason?.summary || "—"}</p>
            </div>

            <div className="context-row">
              <span>Reason Code</span>
              <p>{market.reason?.code || "—"}</p>
            </div>

            <div className="context-row">
              <span>Why HOLD/Entry</span>
              <p>{market.reason?.details?.join(" ") || "—"}</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="details-grid">
        <MarketTrendChart closes1h={market.closes1h} />
        <MarketRsiChart
          closes5m={market.closes5m}
          closes1h={market.closes1h}
        />
      </div>
    </div>
  );
}

export default MarketDashboard;
