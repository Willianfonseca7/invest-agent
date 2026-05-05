import { THRESHOLDS } from "./market-analysis.constants";
import type { DecisionInput, ReasonCode } from "./market-analysis.types";

export function getFatalHoldReason(input: DecisionInput): {
  code: ReasonCode;
  summary: string;
  details: string[];
  confidence: number;
} | null {
  const isStructuralTrendInvalid =
    input.ema50 === null ||
    input.ema200 === null ||
    input.trend4H !== "UP" ||
    input.ema50 <= input.ema200;

  if (isStructuralTrendInvalid) {
    return {
      code: "TREND_STRUCTURE_INVALID",
      summary: "Hold: trend structure insufficient for conservative buy.",
      details: [
        "Structural trend does not confirm a robust bullish bias.",
        "EMA50 must be above EMA200 with aligned context before entering.",
      ],
      confidence: 0.9,
    };
  }

  if (input.trend4H === "DOWN") {
    return {
      code: "TIMEFRAME_CONFLICT_STRONG",
      summary: "Hold: primary timeframe is against the long entry.",
      details: [
        "Higher timeframe context is bearish.",
        "Strategy avoids buying against the primary direction.",
      ],
      confidence: 0.9,
    };
  }

  if (
    input.recentVolumeRatio < THRESHOLDS.minVolumeRatio &&
    input.trendStrengthLevel !== "STRONG"
  ) {
    return {
      code: "VOLUME_INSUFFICIENT",
      summary: "Hold: volume insufficient to validate continuation.",
      details: [
        "Recent flow is too weak to support a conservative entry.",
        "Without minimum participation, false breakout risk increases.",
      ],
      confidence: 0.86,
    };
  }

  if (Math.abs(input.priceDistanceToEma50) > THRESHOLDS.criticalPriceExtension) {
    return {
      code: "PRICE_EXTENDED_CRITICAL",
      summary: "Hold: price critically extended from EMA50.",
      details: [
        "Market has moved too far from the trend average.",
        "Entering at this point increases the risk of a late buy.",
      ],
      confidence: 0.88,
    };
  }

  return null;
}
