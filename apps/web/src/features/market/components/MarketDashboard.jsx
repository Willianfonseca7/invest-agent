import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMarketOverview } from "../hooks/useMarketOverview";
import { useMarketCommentary } from "../hooks/useMarketCommentary";
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

function formatDateTime(value, locale) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(date);
}

function getAssetLabel(symbol, fallback) {
  const normalizedSymbol = String(symbol || "").toUpperCase();

  if (normalizedSymbol.endsWith("USDT")) {
    return normalizedSymbol.replace(/USDT$/, "");
  }

  return normalizedSymbol || fallback;
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
  const { t } = useTranslation();

  const [symbol, setSymbol] = useState(() => {
    if (typeof window === "undefined") {
      return "BTCUSDT";
    }

    return window.localStorage.getItem(STORAGE_KEY) || "BTCUSDT";
  });

  const { market, loading, refreshing, error, lastUpdatedAt, refetch } =
    useMarketOverview(symbol);

  const { commentary, loading: commentaryLoading } = useMarketCommentary(symbol, market);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, symbol);
  }, [symbol]);

  const selectedSymbolLabel = useMemo(() => {
    return SYMBOL_OPTIONS.find((option) => option.value === symbol)?.label || symbol;
  }, [symbol]);

  const selectedAssetLabel = useMemo(
    () => getAssetLabel(symbol, t("common.asset")),
    [symbol, t]
  );

  if (loading && !market) {
    return (
      <section className="feedback-panel">
        <span className="eyebrow">{t("dashboard.eyebrow")}</span>
        <h1>{t("dashboard.loading.title")}</h1>
        <p>{t("dashboard.loading.description")}</p>
      </section>
    );
  }

  if (error && !market) {
    return (
      <section className="feedback-panel">
        <span className="eyebrow">{t("dashboard.eyebrow")}</span>
        <h1>{t("dashboard.error.title")}</h1>
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
  const locale = t("common.locale");

  return (
    <div className="dashboard">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">{t("dashboard.hero.eyebrow")}</span>
          <h1>{t("dashboard.hero.title")}</h1>
          <p>
            {t("dashboard.hero.selectedAsset")} <strong>{selectedSymbolLabel}</strong>
          </p>
          <p>
            {t("dashboard.hero.lastUpdated")} {formatDateTime(lastUpdatedAt, locale)}
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
            {refreshing ? t("dashboard.hero.refreshing") : t("dashboard.hero.refresh")}
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
          label={t("dashboard.metrics.price", { asset: selectedAssetLabel })}
          value={formatCurrency(market.price)}
        />

        <MetricCard
          label={t("dashboard.metrics.confidence")}
          value={formatPercent(market.confidence)}
          tone={actionTone}
        />

        <MetricCard
          label={t("dashboard.metrics.trendStrength")}
          value={formatPercent(market.trendStrength)}
          hint={t("dashboard.metrics.trendStrengthHint")}
        />

        <MetricCard
          label={t("dashboard.metrics.priceVsEma50")}
          value={formatPercent(market.reason?.metrics?.priceDistanceToEma50)}
          hint={t("dashboard.metrics.priceVsEma50Hint")}
        />

        <MetricCard
          label={t("dashboard.metrics.volume")}
          value={formatNumber(market.volume)}
          hint={t("dashboard.metrics.avg", { value: formatNumber(market.avgVolume) })}
        />

        <MetricCard
          label={t("dashboard.metrics.recentVolumeRatio")}
          value={formatNumber(market.reason?.metrics?.recentVolumeRatio)}
          hint={t("dashboard.metrics.recentVolumeRatioHint")}
        />

        <MetricCard
          label={t("dashboard.metrics.volumeSpike")}
          value={
            market.reason?.metrics?.hasVolumeSpike
              ? t("dashboard.metrics.yes")
              : t("dashboard.metrics.no")
          }
          tone={volumeSpikeTone}
        />
      </div>

      <div className="details-grid">
        <SectionCard
          title={t("dashboard.sections.indicators")}
          description={t("dashboard.sections.indicatorsDesc")}
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
          title={t("dashboard.sections.decisionContext")}
          description={t("dashboard.sections.decisionContextDesc")}
        >
          <div className="context-list">
            <div className="context-row">
              <span>{t("dashboard.context.action")}</span>
              <StatusBadge tone={actionTone}>{market.action}</StatusBadge>
            </div>

            <div className="context-row">
              <span>{t("dashboard.context.trend4h")}</span>
              <StatusBadge tone={trendTone}>{market.trend4H}</StatusBadge>
            </div>

            <div className="context-row">
              <span>{t("dashboard.context.reason")}</span>
              <p>{market.reason?.code ? t(`reasons.${market.reason.code}.summary`, { defaultValue: market.reason.summary || "—" }) : "—"}</p>
            </div>

            <div className="context-row">
              <span>{t("dashboard.context.reasonCode")}</span>
              <p>{market.reason?.code || "—"}</p>
            </div>

            <div className="context-row">
              <span>{t("dashboard.context.whyHold")}</span>
              <p>{market.reason?.code ? t(`reasons.${market.reason.code}.details`, { defaultValue: market.reason?.details?.join(" ") || "—" }) : "—"}</p>
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

      <SectionCard
        title={t("dashboard.sections.commentary")}
        description={t("dashboard.sections.commentaryDesc")}
      >
        {commentaryLoading ? (
          <p className="commentary-loading">{t("dashboard.commentary.loading")}</p>
        ) : commentary ? (
          <p className="commentary-text">{commentary}</p>
        ) : (
          <p className="commentary-empty">{t("dashboard.commentary.unavailable")}</p>
        )}
      </SectionCard>
    </div>
  );
}

export default MarketDashboard;
