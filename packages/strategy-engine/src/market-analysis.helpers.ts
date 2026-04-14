import { THRESHOLDS } from "./market-analysis.constants";
import type {
  DecisionInput,
  MarketTrend,
  ReasonCode,
  RsiAssessment,
  ScoreBreakdown,
  StructuredReason,
  TrendStrengthLevel,
  TrendStrengthSnapshot
} from "./market-analysis.types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
}

export function calculateSeriesEMA(prices: number[], period: number) {
  if (!Array.isArray(prices) || prices.length < period) {
    return [];
  }

  const multiplier = 2 / (period + 1);
  let ema =
    prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

  const series = [Number(ema.toFixed(2))];

  for (let index = period; index < prices.length; index += 1) {
    ema = (prices[index] - ema) * multiplier + ema;
    series.push(Number(ema.toFixed(2)));
  }

  return series;
}

export function getTrend(
  ema50: number | null,
  ema200: number | null
): MarketTrend {
  if (ema50 === null || ema200 === null) {
    return "SIDEWAYS";
  }

  if (ema50 > ema200) {
    return "UP";
  }

  if (ema50 < ema200) {
    return "DOWN";
  }

  return "SIDEWAYS";
}

export function getTrendStrengthLevel(
  trend4H: MarketTrend,
  ema50: number | null,
  ema200: number | null,
  ema50Slope: number,
  price: number,
  emaGap: number
): TrendStrengthLevel {
  if (ema50 === null || ema200 === null) {
    return "WEAK";
  }

  const isUptrendContext =
    trend4H === "UP" &&
    ema50 > ema200 &&
    ema50Slope > THRESHOLDS.positiveEma50Slope &&
    price >= ema50 &&
    emaGap >= 0.01;

  if (isUptrendContext) {
    return "STRONG";
  }

  const isModerateTrendContext =
    trend4H === "UP" &&
    ema50 > ema200 &&
    ema50Slope > 0 &&
    price >= ema50;

  if (isModerateTrendContext) {
    return "MODERATE";
  }

  return "WEAK";
}

export function getTrendStrength(
  closes1h: number[],
  ema50: number | null,
  ema200: number | null,
  price: number,
  trend4H: MarketTrend
): TrendStrengthSnapshot {
  if (ema50 === null || ema200 === null || ema200 === 0) {
    return {
      value: 0,
      emaGap: 0,
      ema50Slope: 0,
      level: "WEAK",
    };
  }

  const ema50Series = calculateSeriesEMA(closes1h, 50);
  const latestEma50 = ema50Series.at(-1) ?? ema50;
  const previousEma50 =
    ema50Series.at(-4) ?? ema50Series.at(-2) ?? latestEma50;

  const emaGap = Math.abs(ema50 - ema200) / ema200;
  const ema50SlopeBase =
    previousEma50 === 0 ? 0 : (latestEma50 - previousEma50) / previousEma50;
  const ema50Slope = Number(ema50SlopeBase.toFixed(4));

  const normalizedGap = clamp(emaGap / 0.02, 0, 1);
  const normalizedSlope = clamp(Math.abs(ema50Slope) / 0.01, 0, 1);
  const value = Number(
    (normalizedGap * 0.7 + normalizedSlope * 0.3).toFixed(4)
  );

  const level = getTrendStrengthLevel(
    trend4H,
    ema50,
    ema200,
    ema50Slope,
    price,
    emaGap
  );

  return {
    value,
    emaGap: Number(emaGap.toFixed(4)),
    ema50Slope,
    level,
  };
}

export function buildReason(
  input: DecisionInput,
  code: ReasonCode,
  summary: string,
  details: string[],
  scoreBreakdown?: ScoreBreakdown
): StructuredReason {
  return {
    code,
    summary,
    details,
    metrics: {
      trend4H: input.trend4H,
      trendStrength: input.trendStrength,
      trendStrengthLevel: input.trendStrengthLevel,
      emaGap: input.emaGap,
      ema50Slope: input.ema50Slope,
      volumeRatio: input.volumeRatio,
      recentVolumeRatio: input.recentVolumeRatio,
      hasVolumeSpike: input.hasVolumeSpike,
      priceDistanceToEma50: input.priceDistanceToEma50,
      rsi5m: input.rsi5m,
      rsi1h: input.rsi1h,
      score: scoreBreakdown?.total,
      scoreBreakdown,
    },
  };
}

export function getBaseConfidence({
  trendStrength,
  volumeRatio,
  rsi5m,
  rsi1h,
}: Pick<DecisionInput, "trendStrength" | "volumeRatio" | "rsi5m" | "rsi1h">) {
  const trendComponent = clamp(trendStrength, 0, 1) * 0.45;
  const volumeComponent = clamp((volumeRatio - 0.9) / 0.5, 0, 1) * 0.2;
  const fastMomentumComponent =
    clamp(Math.abs(rsi5m - 50) / 30, 0, 1) * 0.2;
  const slowMomentumComponent =
    clamp(Math.abs(rsi1h - 50) / 25, 0, 1) * 0.15;

  return clamp(
    Number(
      (
        0.35 +
        trendComponent +
        volumeComponent +
        fastMomentumComponent +
        slowMomentumComponent
      ).toFixed(2)
    ),
    0.35,
    0.97
  );
}

export function getConfidence(
  score: number,
  trendStrengthLevel: TrendStrengthLevel,
  baseConfidence: number
) {
  let derived = score >= 8 ? 0.86 : score >= 6 ? 0.76 : score >= 5 ? 0.68 : 0.58;

  if (trendStrengthLevel === "STRONG") {
    derived += 0.04;
  }

  if (trendStrengthLevel === "WEAK") {
    derived -= 0.06;
  }

  return clamp(
    Number(Math.max(derived, baseConfidence).toFixed(2)),
    0.35,
    0.96
  );
}

export function assessRsiByTrend(
  rsi5m: number,
  trendStrengthLevel: TrendStrengthLevel
): RsiAssessment {
  if (trendStrengthLevel === "STRONG") {
    if (
      rsi5m >= THRESHOLDS.strongRsiMin &&
      rsi5m <= THRESHOLDS.strongRsiMax
    ) {
      return { scoreDelta: 2, state: "FAVORABLE" };
    }

    if (
      rsi5m > THRESHOLDS.strongRsiMax &&
      rsi5m <= THRESHOLDS.strongRsiNeutralMax
    ) {
      return { scoreDelta: 0, state: "NEUTRAL" };
    }

    if (rsi5m > THRESHOLDS.strongRsiNeutralMax) {
      return {
        scoreDelta: -2,
        state: "OVERHEATED",
        reasonCode: "RSI_OVERHEATED",
      };
    }

    return { scoreDelta: -1, state: "WEAK", reasonCode: "RSI_TOO_WEAK" };
  }

  if (trendStrengthLevel === "MODERATE") {
    if (
      rsi5m >= THRESHOLDS.moderateRsiMin &&
      rsi5m <= THRESHOLDS.moderateRsiMax
    ) {
      return { scoreDelta: 2, state: "FAVORABLE" };
    }

    if (
      rsi5m > THRESHOLDS.moderateRsiMax &&
      rsi5m <= THRESHOLDS.moderateRsiNeutralMax
    ) {
      return { scoreDelta: 0, state: "NEUTRAL" };
    }

    if (rsi5m > THRESHOLDS.moderateRsiNeutralMax) {
      return {
        scoreDelta: -2,
        state: "OVERHEATED",
        reasonCode: "RSI_OVERHEATED",
      };
    }

    return { scoreDelta: -1, state: "WEAK", reasonCode: "RSI_TOO_WEAK" };
  }

  if (rsi5m >= THRESHOLDS.weakRsiMin && rsi5m <= THRESHOLDS.weakRsiMax) {
    return { scoreDelta: 1, state: "FAVORABLE" };
  }

  if (rsi5m > THRESHOLDS.weakRsiMax && rsi5m <= THRESHOLDS.weakRsiNeutralMax) {
    return { scoreDelta: 0, state: "NEUTRAL" };
  }

  if (rsi5m > THRESHOLDS.weakRsiNeutralMax) {
    return {
      scoreDelta: -2,
      state: "OVERHEATED",
      reasonCode: "RSI_OVERHEATED",
    };
  }

  return { scoreDelta: -1, state: "WEAK", reasonCode: "RSI_TOO_WEAK" };
}
