import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMarketOverview } from "../hooks/useMarketOverview";
import { useMarketCommentary } from "../hooks/useMarketCommentary";
import { useOperationsOverview } from "../hooks/useOperationsOverview";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/format";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MarketRsiChart } from "./MarketRsiChart";
import { MarketTrendChart } from "./MarketTrendChart";
import type { MarketAction, MarketTrend, StatusTone } from "@/types/market";
import type {
  TradeLedgerEntry,
  TradingMode,
  WorkerStatus
} from "@/types/operations";

const SYMBOL_OPTIONS = [
  { label: "BTC / USDT", value: "BTCUSDT" },
  { label: "ETH / USDT", value: "ETHUSDT" },
  { label: "SOL / USDT", value: "SOLUSDT" }
];

const STORAGE_KEY = "invest-agent:selected-symbol";
const DEFAULT_SYMBOL = "BTCUSDT";

function getSafeStoredSymbol() {
  if (typeof window === "undefined") {
    return DEFAULT_SYMBOL;
  }

  const storedSymbol = window.localStorage.getItem(STORAGE_KEY) || DEFAULT_SYMBOL;
  const isKnownSymbol = SYMBOL_OPTIONS.some((option) => option.value === storedSymbol);

  return isKnownSymbol ? storedSymbol : DEFAULT_SYMBOL;
}

function formatDateTime(value: Date | string | number | null, locale: string) {
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

function getAssetLabel(symbol: string, fallback: string) {
  const normalizedSymbol = String(symbol || "").toUpperCase();

  if (normalizedSymbol.endsWith("USDT")) {
    return normalizedSymbol.replace(/USDT$/, "");
  }

  return normalizedSymbol || fallback;
}

function getActionTone(action: MarketAction): Extract<StatusTone, "buy" | "sell" | "neutral"> {
  if (action === "BUY") {
    return "buy";
  }

  if (action === "SELL") {
    return "sell";
  }

  return "neutral";
}

function getTrendTone(trend: MarketTrend): Extract<StatusTone, "buy" | "sell" | "warn"> {
  if (trend === "UP") {
    return "buy";
  }

  if (trend === "DOWN") {
    return "sell";
  }

  return "warn";
}

function getModeTone(mode: TradingMode): Extract<StatusTone, "buy" | "warn" | "neutral"> {
  if (mode === "live") {
    return "buy";
  }

  if (mode === "test") {
    return "warn";
  }

  return "neutral";
}

function getWorkerStatusTone(
  status: WorkerStatus
): Extract<StatusTone, "buy" | "sell" | "warn" | "neutral"> {
  if (status === "running") {
    return "buy";
  }

  if (status === "error") {
    return "sell";
  }

  if (status === "stopped") {
    return "warn";
  }

  return "neutral";
}

function getPnlTone(value: number): Extract<StatusTone, "buy" | "sell" | "neutral"> {
  if (value > 0) {
    return "buy";
  }

  if (value < 0) {
    return "sell";
  }

  return "neutral";
}

function getTradeTone(trade: TradeLedgerEntry): Extract<StatusTone, "buy" | "sell" | "neutral"> {
  if (trade.side === "BUY") {
    return "buy";
  }

  if ((trade.realizedPnl ?? 0) >= 0) {
    return "neutral";
  }

  return "sell";
}

function getAlertTone(
  severity: "info" | "warn" | "error"
): Extract<StatusTone, "buy" | "warn" | "sell"> {
  if (severity === "error") {
    return "sell";
  }

  if (severity === "warn") {
    return "warn";
  }

  return "buy";
}

function getBooleanTone(value: boolean): Extract<StatusTone, "buy" | "warn" | "sell"> {
  return value ? "sell" : "buy";
}

function getRiskDecisionTone(
  status: "APPROVED" | "REDUCED" | "BLOCKED"
): Extract<StatusTone, "buy" | "warn" | "sell"> {
  if (status === "BLOCKED") {
    return "sell";
  }

  if (status === "REDUCED") {
    return "warn";
  }

  return "buy";
}

export function MarketDashboard() {
  const { t } = useTranslation();

  const [symbol, setSymbol] = useState<string>(() => {
    return getSafeStoredSymbol();
  });
  const handleInvalidSymbol = useCallback((nextSymbol: string) => {
    setSymbol(nextSymbol);
  }, []);

  const { market, loading, refreshing, error, lastUpdatedAt, refetch } =
    useMarketOverview(symbol, {
      onInvalidSymbol: handleInvalidSymbol
    });

  const { commentary, loading: commentaryLoading } = useMarketCommentary(market);
  const {
    operations,
    loading: operationsLoading,
    error: operationsError
  } = useOperationsOverview();

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
  const operationsModeTone = getModeTone(operations?.mode ?? "simulation");
  const realizedPnlTone = getPnlTone(operations?.summary.realizedPnl ?? 0);
  const workerStatusTone = getWorkerStatusTone(
    operations?.runtime?.status ?? "stopped"
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
  const volumeSpikeTone: Extract<StatusTone, "buy" | "neutral"> =
    market.reason?.metrics?.hasVolumeSpike ? "buy" : "neutral";
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

      <SectionCard
        title={t("dashboard.sections.operations")}
        description={t("dashboard.sections.operationsDesc")}
      >
        {operationsLoading && !operations ? (
          <p>{t("dashboard.operations.loading")}</p>
        ) : operationsError ? (
          <p>{operationsError}</p>
        ) : operations ? (
          <>
            <div className="operations-toolbar">
              <StatusBadge tone={operationsModeTone}>
                {t(`dashboard.operations.mode.${operations.mode}`)}
              </StatusBadge>
              <p>
                {t("dashboard.operations.lastTrade")}{" "}
                {formatDateTime(operations.summary.lastTradeAt, locale)}
              </p>
            </div>

            <div className="metric-grid metric-grid--compact">
              <MetricCard
                label={t("dashboard.operations.workerStatus")}
                value={
                  operations.runtime
                    ? t(`dashboard.operations.workerStatusValue.${operations.runtime.status}`)
                    : t("dashboard.operations.unavailableShort")
                }
                tone={workerStatusTone}
                hint={
                  operations.runtime
                    ? t("dashboard.operations.cycleInterval", {
                        value: formatNumber(operations.runtime.intervalMs)
                      })
                    : undefined
                }
              />
              <MetricCard
                label={t("dashboard.operations.realizedPnl")}
                value={formatCurrency(operations.summary.realizedPnl)}
                tone={realizedPnlTone}
                hint={
                  operations.summary.realizedPnlPct === null
                    ? t("dashboard.operations.noCapitalBase")
                    : formatPercent(operations.summary.realizedPnlPct)
                }
              />
              <MetricCard
                label={t("dashboard.operations.completedTrades")}
                value={formatNumber(operations.summary.completedTrades)}
                hint={t("dashboard.operations.winRateHint", {
                  value: formatPercent(operations.summary.winRate)
                })}
              />
              <MetricCard
                label={t("dashboard.operations.openPositions")}
                value={formatNumber(operations.summary.openPositions)}
                hint={t("dashboard.operations.totalExecutions", {
                  value: formatNumber(operations.summary.tradeCount)
                })}
              />
              <MetricCard
                label={t("dashboard.operations.tradedVolume")}
                value={formatCurrency(operations.summary.tradedVolume)}
                hint={
                  operations.capitalBase
                    ? t("dashboard.operations.capitalBase", {
                        value: formatCurrency(operations.capitalBase)
                      })
                    : t("dashboard.operations.liveCapital")
                }
              />
            </div>

            <div className="operations-grid">
              <div className="operations-panel">
                <div className="operations-panel__header">
                  <h3>{t("dashboard.operations.riskSummary")}</h3>
                  <p>{t("dashboard.operations.riskSummaryDesc")}</p>
                </div>
                <div className="context-list">
                  <div className="context-row">
                    <span>{t("dashboard.operations.remainingSlots")}</span>
                    <p>
                      {formatNumber(operations.risk.remainingOpenTradeSlots)} /{" "}
                      {formatNumber(operations.risk.maxOpenTrades)}
                    </p>
                  </div>
                  <div className="context-row">
                    <span>{t("dashboard.operations.exposureHeadroom")}</span>
                    <p>
                      {formatPercent(operations.risk.currentExposurePct)} /{" "}
                      {formatPercent(operations.risk.maxPortfolioExposurePct)}
                    </p>
                  </div>
                  <div className="context-row">
                    <span>{t("dashboard.operations.dailyLossLimit")}</span>
                    <p>
                      {formatCurrency(operations.risk.dailyRealizedPnl)} /{" "}
                      {formatPercent(operations.risk.maxDailyLossPct)}
                    </p>
                  </div>
                  <div className="context-row">
                    <span>{t("dashboard.operations.cooldown")}</span>
                    <p>
                      {operations.risk.cooldownActive
                        ? t("dashboard.operations.cooldownActive", {
                            value: formatNumber(operations.risk.cooldownRemainingMs)
                          })
                        : t("dashboard.operations.cooldownInactive")}
                    </p>
                  </div>
                  <div className="context-row">
                    <span>{t("dashboard.operations.circuitBreaker")}</span>
                    <p>
                      {formatNumber(operations.risk.consecutiveLossCount)} /{" "}
                      {formatNumber(operations.risk.consecutiveLossLimit)}
                    </p>
                  </div>
                  <div className="context-row">
                    <span>{t("dashboard.operations.lastRiskBlock")}</span>
                    <p>
                      {operations.risk.lastRiskBlock
                        ? t(`dashboard.operations.alertCode.${operations.risk.lastRiskBlock.code}`, {
                            defaultValue: operations.risk.lastRiskBlock.message
                          })
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="operations-panel">
                <div className="operations-panel__header">
                  <h3>{t("dashboard.operations.workerRuntime")}</h3>
                  <p>{t("dashboard.operations.workerRuntimeDesc")}</p>
                </div>
                {operations.runtime ? (
                  <div className="context-list">
                    <div className="context-row">
                      <span>{t("dashboard.operations.lastCycle")}</span>
                      <p>{formatDateTime(operations.runtime.lastCycle?.finishedAt ?? null, locale)}</p>
                    </div>
                    <div className="context-row">
                      <span>{t("dashboard.operations.lastCycleStatus")}</span>
                      <p>
                        {operations.runtime.lastCycle
                          ? t(
                              `dashboard.operations.cycleStatus.${operations.runtime.lastCycle.status}`
                            )
                          : "—"}
                      </p>
                    </div>
                    <div className="context-row">
                      <span>{t("dashboard.operations.lastCycleDuration")}</span>
                      <p>
                        {operations.runtime.lastCycle
                          ? `${formatNumber(operations.runtime.lastCycle.durationMs)} ms`
                          : "—"}
                      </p>
                    </div>
                    <div className="context-row">
                      <span>{t("dashboard.operations.totalCycles")}</span>
                      <p>{formatNumber(operations.runtime.totalCycles)}</p>
                    </div>
                    <div className="context-row">
                      <span>{t("dashboard.operations.skippedCycles")}</span>
                      <p>{formatNumber(operations.runtime.skippedCycles)}</p>
                    </div>
                    <div className="context-row">
                      <span>{t("dashboard.operations.totalErrors")}</span>
                      <p>{formatNumber(operations.runtime.totalErrors)}</p>
                    </div>
                  </div>
                ) : (
                  <p>{t("dashboard.operations.unavailable")}</p>
                )}
              </div>

              <div className="operations-panel">
                <div className="operations-panel__header">
                  <h3>{t("dashboard.operations.recentTrades")}</h3>
                  <p>{t("dashboard.operations.recentTradesDesc")}</p>
                </div>
                <div className="operations-list">
                  {operations.recentTrades.length === 0 ? (
                    <p>{t("dashboard.operations.emptyTrades")}</p>
                  ) : (
                    operations.recentTrades.map((trade) => (
                      <article key={trade.id} className="trade-row">
                        <div className="trade-row__main">
                          <div className="trade-row__title">
                            <strong>{trade.symbol}</strong>
                            <StatusBadge tone={getTradeTone(trade)}>
                              {trade.side}
                            </StatusBadge>
                          </div>
                          <p>
                            {t("dashboard.operations.tradeMeta", {
                              trigger:
                                trade.trigger
                                  ? t(`dashboard.operations.trigger.${trade.trigger}`)
                                  : "—",
                              mode: t(`dashboard.operations.mode.${trade.mode}`)
                            })}
                          </p>
                        </div>
                        <div className="trade-row__stats">
                          <strong>{formatCurrency(trade.quoteAmount)}</strong>
                          <span>{formatDateTime(trade.executedAt, locale)}</span>
                          {trade.realizedPnl !== null ? (
                            <span className={`trade-row__pnl trade-row__pnl--${getPnlTone(trade.realizedPnl)}`}>
                              {formatCurrency(trade.realizedPnl)}
                            </span>
                          ) : null}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className="operations-panel">
                <div className="operations-panel__header">
                  <h3>{t("dashboard.operations.byAsset")}</h3>
                  <p>{t("dashboard.operations.byAssetDesc")}</p>
                </div>
                <div className="operations-list">
                  {operations.byAsset.length === 0 ? (
                    <p>{t("dashboard.operations.emptyAssets")}</p>
                  ) : (
                    operations.byAsset.map((asset) => (
                      <article key={asset.symbol} className="trade-row">
                        <div className="trade-row__main">
                          <div className="trade-row__title">
                            <strong>{asset.symbol}</strong>
                            <StatusBadge tone={getPnlTone(asset.realizedPnl)}>
                              {formatCurrency(asset.realizedPnl)}
                            </StatusBadge>
                          </div>
                          <p>
                            {t("dashboard.operations.assetMeta", {
                              trades: formatNumber(asset.trades),
                              winRate: formatPercent(asset.winRate)
                            })}
                          </p>
                        </div>
                        <div className="trade-row__stats">
                          <strong>{formatCurrency(asset.tradedVolume)}</strong>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className="operations-panel">
                <div className="operations-panel__header">
                  <h3>{t("dashboard.operations.alerts")}</h3>
                  <p>{t("dashboard.operations.alertsDesc")}</p>
                </div>
                <div className="operations-list">
                  {operations.alerts.length === 0 ? (
                    <p>{t("dashboard.operations.emptyAlerts")}</p>
                  ) : (
                    operations.alerts.map((alert) => (
                      <article key={alert.id} className="trade-row">
                        <div className="trade-row__main">
                          <div className="trade-row__title">
                            <strong>{alert.symbol ?? t("dashboard.operations.globalAlert")}</strong>
                            <StatusBadge tone={getAlertTone(alert.severity)}>
                              {t(`dashboard.operations.alertSeverity.${alert.severity}`)}
                            </StatusBadge>
                          </div>
                          <p>
                            {t(`dashboard.operations.alertCode.${alert.code}`, {
                              defaultValue: alert.message
                            })}
                          </p>
                        </div>
                        <div className="trade-row__stats">
                          <strong>{alert.code}</strong>
                          <span>{formatDateTime(alert.timestamp, locale)}</span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className="operations-panel">
                <div className="operations-panel__header">
                  <h3>{t("dashboard.operations.riskDecisions")}</h3>
                  <p>{t("dashboard.operations.riskDecisionsDesc")}</p>
                </div>
                <div className="operations-list">
                  {operations.riskDecisions.length === 0 ? (
                    <p>{t("dashboard.operations.emptyRiskDecisions")}</p>
                  ) : (
                    operations.riskDecisions.map((decision) => (
                      <article key={decision.id} className="trade-row">
                        <div className="trade-row__main">
                          <div className="trade-row__title">
                            <strong>{decision.symbol}</strong>
                            <StatusBadge tone={getRiskDecisionTone(decision.status)}>
                              {decision.status}
                            </StatusBadge>
                          </div>
                          <p>{decision.reason}</p>
                        </div>
                        <div className="trade-row__stats">
                          <strong>{decision.code}</strong>
                          <span>{formatDateTime(decision.timestamp, locale)}</span>
                          <span>
                            {formatCurrency(decision.approvedCapital)} / {formatCurrency(decision.requestedCapital)}
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>

            {operations.runtime?.lastCycle ? (
              <div className="metric-grid metric-grid--compact metrics-runtime">
                <MetricCard
                  label={t("dashboard.operations.dailyLossGuard")}
                  value={
                    operations.risk.dailyLossLimitReached
                      ? t("dashboard.operations.guardActive")
                      : t("dashboard.operations.guardInactive")
                  }
                  tone={getBooleanTone(operations.risk.dailyLossLimitReached)}
                />
                <MetricCard
                  label={t("dashboard.operations.cooldownGuard")}
                  value={
                    operations.risk.cooldownActive
                      ? t("dashboard.operations.guardActive")
                      : t("dashboard.operations.guardInactive")
                  }
                  tone={getBooleanTone(operations.risk.cooldownActive)}
                />
                <MetricCard
                  label={t("dashboard.operations.circuitBreakerGuard")}
                  value={
                    operations.risk.circuitBreakerActive
                      ? t("dashboard.operations.guardActive")
                      : t("dashboard.operations.guardInactive")
                  }
                  tone={getBooleanTone(operations.risk.circuitBreakerActive)}
                />
                <MetricCard
                  label={t("dashboard.operations.signalsBuy")}
                  value={formatNumber(operations.runtime.lastCycle.buySignals)}
                  tone="buy"
                />
                <MetricCard
                  label={t("dashboard.operations.signalsSell")}
                  value={formatNumber(operations.runtime.lastCycle.sellSignals)}
                  tone="sell"
                />
                <MetricCard
                  label={t("dashboard.operations.signalsHold")}
                  value={formatNumber(operations.runtime.lastCycle.holdSignals)}
                />
                <MetricCard
                  label={t("dashboard.operations.executes")}
                  value={formatNumber(
                    operations.runtime.lastCycle.executedBuys +
                      operations.runtime.lastCycle.executedSells
                  )}
                  hint={t("dashboard.operations.riskBlocked", {
                    value: formatNumber(operations.runtime.lastCycle.riskBlockedCount)
                  })}
                />
              </div>
            ) : null}
          </>
        ) : (
          <p>{t("dashboard.operations.unavailable")}</p>
        )}
      </SectionCard>

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
