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
      summary: "Hold: estrutura principal insuficiente para compra conservadora.",
      details: [
        "A tendência estrutural não confirma viés comprador robusto.",
        "Sem EMA50 acima da EMA200 com contexto alinhado, a estratégia não compra."
      ],
      confidence: 0.9
    };
  }

  if (input.trend4H === "DOWN") {
    return {
      code: "TIMEFRAME_CONFLICT_STRONG",
      summary: "Hold: timeframe principal está contra a entrada compradora.",
      details: [
        "O contexto de timeframe maior está vendedor.",
        "A estratégia evita comprar contra a direção principal."
      ],
      confidence: 0.9
    };
  }

  if (
    input.recentVolumeRatio < THRESHOLDS.minVolumeRatio &&
    input.trendStrengthLevel !== "STRONG"
  ) {
    return {
      code: "VOLUME_INSUFFICIENT",
      summary: "Hold: volume insuficiente para validar continuação.",
      details: [
        "O fluxo recente está fraco para sustentar uma entrada conservadora.",
        "Sem participação mínima, o risco de falso rompimento aumenta."
      ],
      confidence: 0.86
    };
  }

  if (Math.abs(input.priceDistanceToEma50) > THRESHOLDS.criticalPriceExtension) {
    return {
      code: "PRICE_EXTENDED_CRITICAL",
      summary: "Hold: preço criticamente esticado em relação à EMA50.",
      details: [
        "O mercado já se afastou demais da média de tendência.",
        "Entrar nesse ponto aumenta o risco de compra tardia."
      ],
      confidence: 0.88
    };
  }

  return null;
}
