import type { ReasonCode } from "./market-analysis.types";

export const THRESHOLDS = {
  trendStrength: 0.35,
  positiveEma50Slope: 0.0015,
  negativeEma50Slope: -0.0015,

  minVolumeRatio: 0.85,
  healthyVolumeRatio: 1.05,
  healthyRecentVolumeRatio: 1.08,
  volumeSpikeRatio: 1.2,
  recentVolumeSpike: 1.1,
  strongContextVolumeRatio: 1.15,

  priceDistanceGood: 0.012,
  priceDistanceAcceptable: 0.022,
  maxPriceDistanceToEma50: 0.015,
  criticalPriceExtension: 0.035,

  extendedMoveTrendStrength: 0.62,
  extendedMoveVolumeRatio: 1.2,

  fastPullbackBuyRsi: 32,
  slowTrendBuyRsi: 60,
  fastExhaustionSellRsi: 68,
  slowTrendSellRsi: 40,

  strongRsiMin: 52,
  strongRsiMax: 68,
  strongRsiNeutralMax: 72,

  moderateRsiMin: 50,
  moderateRsiMax: 64,
  moderateRsiNeutralMax: 70,

  weakRsiMin: 48,
  weakRsiMax: 58,
  weakRsiNeutralMax: 65,

  buyScore: 6,
  strongContextExceptionScore: 5,
} as const;

export const REASON_LABELS: Record<ReasonCode, string> = {
  INSUFFICIENT_INDICATOR_DATA: "Indicadores insuficientes para assumir risco.",
  TREND_STRUCTURE_INVALID:
    "Estrutura principal insuficiente para compra conservadora.",
  TREND_TOO_WEAK: "Tendência ainda fraca para compra conservadora.",
  TIMEFRAME_CONFLICT_STRONG:
    "Timeframe principal está contra a entrada compradora.",
  EMA_SLOPE_TOO_FLAT:
    "A EMA50 perdeu inclinação e a tendência está desacelerando.",
  PRICE_TOO_FAR_FROM_EMA:
    "Preço muito distante da EMA50 para uma entrada conservadora.",
  PRICE_EXTENDED_CRITICAL: "Preço criticamente esticado em relação à EMA50.",
  VOLUME_INSUFFICIENT: "Volume insuficiente para validar continuação.",
  VOLUME_BELOW_AVERAGE: "Volume sem confirmação suficiente de participação.",
  RSI_TOO_WEAK: "RSI ainda fraco para retomada com qualidade.",
  RSI_OVERHEATED: "RSI aquecido demais para entrada conservadora.",
  RSI_NOT_FAVORABLE: "RSI não favorável para entrada conservadora.",
  SCORE_TOO_LOW: "Score consolidado ainda insuficiente para compra.",
  PULLBACK_ENTRY_CONFIRMED:
    "Pullback curto confirmado dentro de tendência principal.",
  BUY_CONFIRMED_STRONG_CONTEXT: "Contexto técnico forte confirmou a compra.",
  EXHAUSTION_ENTRY_CONFIRMED:
    "Repique de exaustão confirmado dentro de tendência de baixa.",
};