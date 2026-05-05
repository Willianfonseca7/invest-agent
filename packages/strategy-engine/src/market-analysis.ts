import { calculateEMA } from "./indicators/ema";
import { calculateRSI } from "./indicators/rsi";
import { THRESHOLDS } from "./market-analysis.constants";
import {
  assessRsiByTrend,
  average,
  buildReason,
  clamp,
  getBaseConfidence,
  getConfidence,
  getTrend,
  getTrendStrength
} from "./market-analysis.helpers";
import { getFatalHoldReason } from "./market-analysis.filters";
import { calculateOpportunityScore } from "./market-analysis.scoring";
import type {
  DecisionInput,
  MarketAnalysis,
  MarketAnalysisInput,
  ReasonCode,
  ScoreBreakdown
} from "./market-analysis.types";

function buildHoldDecision(
  input: DecisionInput,
  code: ReasonCode,
  summary: string,
  details: string[],
  confidence: number,
  scoreBreakdown?: ScoreBreakdown
) {
  return {
    action: "HOLD" as const,
    confidence,
    reason: buildReason(input, code, summary, details, scoreBreakdown),
  };
}

function buildBuyDecision(
  input: DecisionInput,
  code: Extract<
    ReasonCode,
    "PULLBACK_ENTRY_CONFIRMED" | "BUY_CONFIRMED_STRONG_CONTEXT"
  >,
  summary: string,
  details: string[],
  confidence: number,
  scoreBreakdown: ScoreBreakdown
) {
  return {
    action: "BUY" as const,
    confidence,
    reason: buildReason(input, code, summary, details, scoreBreakdown),
  };
}

function buildSellDecision(
  input: DecisionInput,
  code: "EXHAUSTION_ENTRY_CONFIRMED",
  summary: string,
  details: string[],
  confidence: number,
  scoreBreakdown?: ScoreBreakdown
) {
  return {
    action: "SELL" as const,
    confidence,
    reason: buildReason(input, code, summary, details, scoreBreakdown),
  };
}

export function decideMarketAction(input: DecisionInput) {
  const {
    trend4H,
    ema50,
    ema200,
    rsi5m,
    rsi1h,
    volumeRatio,
    recentVolumeRatio,
    hasVolumeSpike,
    trendStrength,
    trendStrengthLevel,
    ema50Slope,
    priceDistanceToEma50,
  } = input;

  if (ema50 === null || ema200 === null) {
    return buildHoldDecision(
      input,
      "INSUFFICIENT_INDICATOR_DATA",
      "Hold: insufficient indicator data to assume risk.",
      [
        "EMA50 or EMA200 unavailable.",
        "No reliable trend, conservative strategy does not enter.",
      ],
      0.92
    );
  }

  const baseConfidence = getBaseConfidence(input);

  const fatalReason = getFatalHoldReason(input);
  if (fatalReason) {
    return buildHoldDecision(
      input,
      fatalReason.code,
      fatalReason.summary,
      fatalReason.details,
      fatalReason.confidence
    );
  }

  const hasStrongTrend = trendStrength >= THRESHOLDS.trendStrength;
  const hasPositiveSlope = ema50Slope >= THRESHOLDS.positiveEma50Slope;
  const hasNegativeSlope = ema50Slope <= THRESHOLDS.negativeEma50Slope;

  const hasHealthyVolume =
    volumeRatio >= THRESHOLDS.healthyVolumeRatio ||
    recentVolumeRatio >= THRESHOLDS.healthyRecentVolumeRatio;

  const hasProfessionalVolumeConfirmation = hasHealthyVolume && hasVolumeSpike;

  const isPriceExtendedFromEma =
    Math.abs(priceDistanceToEma50) > THRESHOLDS.maxPriceDistanceToEma50;

  const isUptrend = trend4H === "UP" && ema50 > ema200;
  const isDowntrend = trend4H === "DOWN" && ema50 < ema200;

  const fastPullbackBuy = rsi5m <= THRESHOLDS.fastPullbackBuyRsi;
  const slowTrendBuy = rsi1h <= THRESHOLDS.slowTrendBuyRsi;
  const fastExhaustionSell = rsi5m >= THRESHOLDS.fastExhaustionSellRsi;
  const slowTrendSell = rsi1h >= THRESHOLDS.slowTrendSellRsi;

  const canTradeExtendedMove =
    hasStrongTrend &&
    hasProfessionalVolumeConfirmation &&
    trendStrength >= THRESHOLDS.extendedMoveTrendStrength &&
    volumeRatio >= THRESHOLDS.extendedMoveVolumeRatio;

  const rsiAssessment = assessRsiByTrend(rsi5m, trendStrengthLevel);
  const scoreBreakdown = calculateOpportunityScore(input);
  const confidenceFromScore = getConfidence(
    scoreBreakdown.total,
    trendStrengthLevel,
    baseConfidence
  );

  if (
    isUptrend &&
    hasStrongTrend &&
    hasPositiveSlope &&
    hasProfessionalVolumeConfirmation &&
    fastPullbackBuy &&
    slowTrendBuy
  ) {
    return buildBuyDecision(
      input,
      "PULLBACK_ENTRY_CONFIRMED",
      "Buy: short pullback within primary uptrend.",
      [
        "EMA50 above EMA200 confirms bullish bias.",
        "Recent EMA50 slope remains positive.",
        "RSI 5m in pullback without losing 1h context.",
        "Volume with professional confirmation avoids entry in low-participation market.",
      ],
      clamp(confidenceFromScore + 0.04, 0.5, 0.96),
      scoreBreakdown
    );
  }

  if (
    isDowntrend &&
    hasStrongTrend &&
    hasNegativeSlope &&
    hasProfessionalVolumeConfirmation &&
    fastExhaustionSell &&
    slowTrendSell
  ) {
    return buildSellDecision(
      input,
      "EXHAUSTION_ENTRY_CONFIRMED",
      "Sell: exhaustion bounce within primary downtrend.",
      [
        "EMA50 below EMA200 confirms bearish bias.",
        "Recent EMA50 slope remains negative.",
        "RSI 5m stretched against the trend favors conservative selling.",
        "Volume with professional confirmation validates the move.",
      ],
      clamp(confidenceFromScore + 0.04, 0.5, 0.96),
      scoreBreakdown
    );
  }

  if (isPriceExtendedFromEma && !canTradeExtendedMove) {
    return buildHoldDecision(
      input,
      "PRICE_TOO_FAR_FROM_EMA",
      "Hold: price too far from EMA50 for a conservative entry.",
      [
        "Market is stretched relative to the trend average.",
        "Without exceptional strength and volume, strategy avoids entering far from EMA50.",
      ],
      clamp(confidenceFromScore, 0.7, 0.9),
      scoreBreakdown
    );
  }

  if (scoreBreakdown.total >= THRESHOLDS.buyScore) {
    return buildBuyDecision(
      input,
      "BUY_CONFIRMED_STRONG_CONTEXT",
      "Buy: favorable technical context with sufficient score.",
      [
        "Trend structure remains healthy.",
        "Consolidated score approved trend, volume, RSI and EMA distance.",
        "Entry validated even without requiring a perfect setup.",
      ],
      confidenceFromScore,
      scoreBreakdown
    );
  }

  const qualifiesStrongContextException =
    trendStrengthLevel === "STRONG" &&
    recentVolumeRatio >= THRESHOLDS.strongContextVolumeRatio &&
    rsiAssessment.state !== "OVERHEATED" &&
    scoreBreakdown.total >= THRESHOLDS.strongContextExceptionScore;

  if (qualifiesStrongContextException) {
    return buildBuyDecision(
      input,
      "BUY_CONFIRMED_STRONG_CONTEXT",
      "Buy: strong context compensated a secondary imperfection.",
      [
        "Trend is strong on the primary timeframe.",
        "Recent volume confirmed sufficient participation.",
        "Strategy allowed entry even without a perfect setup due to exceptional context.",
      ],
      clamp(confidenceFromScore + 0.03, 0.5, 0.96),
      scoreBreakdown
    );
  }

  if (!hasStrongTrend || trendStrengthLevel === "WEAK") {
    return buildHoldDecision(
      input,
      "TREND_TOO_WEAK",
      "Hold: trend still too weak for conservative buying.",
      [
        "Structure exists, but lacks sufficient statistical robustness.",
        "Strategy prefers waiting for stronger confirmation.",
      ],
      clamp(confidenceFromScore, 0.74, 0.92),
      scoreBreakdown
    );
  }

  if (
    (trend4H === "UP" && !hasPositiveSlope) ||
    (trend4H === "DOWN" && !hasNegativeSlope)
  ) {
    return buildHoldDecision(
      input,
      "EMA_SLOPE_TOO_FLAT",
      "Hold: EMA50 lost slope and the trend is decelerating.",
      [
        "Structure still exists, but recent acceleration does not confirm continuation.",
        "Conservative strategy avoids entering when EMA50 flattens.",
      ],
      clamp(confidenceFromScore, 0.72, 0.9),
      scoreBreakdown
    );
  }

  if (!hasProfessionalVolumeConfirmation) {
    return buildHoldDecision(
      input,
      "VOLUME_BELOW_AVERAGE",
      "Hold: volume without sufficient participation confirmation.",
      [
        "Current volume is not sufficiently above the general and recent average.",
        "Without clear flow acceleration, the move may lack sufficient participation.",
      ],
      clamp(confidenceFromScore, 0.7, 0.9),
      scoreBreakdown
    );
  }

  if (rsiAssessment.reasonCode === "RSI_OVERHEATED") {
    return buildHoldDecision(
      input,
      "RSI_OVERHEATED",
      "Hold: RSI too hot for a conservative entry.",
      [
        "Recent momentum indicates excessive stretching.",
        "Strategy prefers not to chase an already accelerated price.",
      ],
      clamp(confidenceFromScore, 0.68, 0.9),
      scoreBreakdown
    );
  }

  if (rsiAssessment.reasonCode === "RSI_TOO_WEAK") {
    return buildHoldDecision(
      input,
      "RSI_TOO_WEAK",
      "Hold: RSI still too weak for a quality recovery.",
      [
        "Momentum does not yet show sufficient recovery.",
        "Strategy prefers waiting for better flow alignment.",
      ],
      clamp(confidenceFromScore, 0.66, 0.88),
      scoreBreakdown
    );
  }

  return buildHoldDecision(
    input,
    "SCORE_TOO_LOW",
    "Hold: consolidated score still insufficient for buying.",
    [
      "Market has positive points, but has not yet reached sufficient confluence level.",
      "Conservative strategy prioritizes context quality before entering.",
    ],
    clamp(confidenceFromScore, 0.62, 0.88),
    scoreBreakdown
  );
}

export function analyzeMultiTimeframeMarket({
  symbol,
  candles5m,
  candles1h,
}: MarketAnalysisInput): MarketAnalysis {
  const closes5m = candles5m.map((candle) => candle.close);
  const closes1h = candles1h.map((candle) => candle.close);
  const volumes5m = candles5m.map((candle) => candle.volume);

  const price = closes5m.at(-1) ?? 0;
  const volume = volumes5m.at(-1) ?? 0;
  const avgVolume = average(volumes5m);

  const recentVolumes = volumes5m.slice(-6, -1);
  const recentVolumeAverage = average(recentVolumes);

  const volumeRatio =
    avgVolume === 0 ? 0 : Number((volume / avgVolume).toFixed(4));

  const recentVolumeRatio =
    recentVolumeAverage === 0
      ? 0
      : Number((volume / recentVolumeAverage).toFixed(4));

  const hasVolumeSpike =
    volumeRatio >= THRESHOLDS.volumeSpikeRatio &&
    recentVolumeRatio >= THRESHOLDS.recentVolumeSpike;

  const rsi5m = calculateRSI(closes5m, 14);
  const rsi1h = calculateRSI(closes1h, 14);
  const ema50 = calculateEMA(closes1h, 50);
  const ema200 = calculateEMA(closes1h, 200);
  const trend4H = getTrend(ema50, ema200);

  const {
    value: trendStrength,
    emaGap,
    ema50Slope,
    level: trendStrengthLevel,
  } = getTrendStrength(closes1h, ema50, ema200, price, trend4H);

  const priceDistanceToEma50 =
    ema50 === null || ema50 === 0
      ? 0
      : Number(((price - ema50) / ema50).toFixed(4));

  const decision = decideMarketAction({
    trend4H,
    ema50,
    ema200,
    rsi5m,
    rsi1h,
    trendStrength,
    trendStrengthLevel,
    emaGap,
    ema50Slope,
    volumeRatio,
    recentVolumeRatio,
    hasVolumeSpike,
    priceDistanceToEma50,
  });

  return {
    symbol,
    price: Number(price.toFixed(2)),
    rsi5m,
    rsi1h,
    ema50,
    ema200,
    trend4H,
    trendStrength,
    volume: Number(volume.toFixed(2)),
    avgVolume,
    closes5m,
    closes1h,
    action: decision.action,
    confidence: decision.confidence,
    reason: decision.reason,
    timestamp: Date.now(),
  };
}
