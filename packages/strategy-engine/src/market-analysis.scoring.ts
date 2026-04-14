import { THRESHOLDS } from "./market-analysis.constants";
import { assessRsiByTrend } from "./market-analysis.helpers";
import type { DecisionInput, ScoreBreakdown } from "./market-analysis.types";

export function calculateOpportunityScore(
  input: DecisionInput
): ScoreBreakdown {
  const trend =
    input.trendStrengthLevel === "STRONG"
      ? 3
      : input.trendStrengthLevel === "MODERATE"
        ? 2
        : 0;

  const slope =
    input.ema50Slope > 0.002 ? 1 : input.ema50Slope > 0 ? 0 : -1;

  const volume =
    input.recentVolumeRatio >= 1.2
      ? 2
      : input.recentVolumeRatio >= 1.0
        ? 1
        : input.recentVolumeRatio >= THRESHOLDS.minVolumeRatio
          ? 0
          : -2;

  const rsiAssessment = assessRsiByTrend(input.rsi5m, input.trendStrengthLevel);
  const rsi = rsiAssessment.scoreDelta;

  const distance = Math.abs(input.priceDistanceToEma50);
  const priceVsEma =
    distance <= THRESHOLDS.priceDistanceGood
      ? 2
      : distance <= THRESHOLDS.priceDistanceAcceptable
        ? 1
        : distance <= THRESHOLDS.criticalPriceExtension
          ? -1
          : -3;

  const total = trend + slope + volume + rsi + priceVsEma;

  return {
    trend,
    slope,
    volume,
    rsi,
    priceVsEma,
    total
  };
}
