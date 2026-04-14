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
      "Hold: indicador insuficiente para assumir risco.",
      [
        "EMA50 ou EMA200 indisponível.",
        "Sem tendência confiável, a estratégia conservadora não entra.",
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
  const hasPositiveSlope =
    ema50Slope >= THRESHOLDS.positiveEma50Slope;
  const hasNegativeSlope =
    ema50Slope <= THRESHOLDS.negativeEma50Slope;

  const hasHealthyVolume =
    volumeRatio >= THRESHOLDS.healthyVolumeRatio ||
    recentVolumeRatio >= THRESHOLDS.healthyRecentVolumeRatio;

  const hasProfessionalVolumeConfirmation =
    hasHealthyVolume && hasVolumeSpike;

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
      "Buy: pullback curto dentro de tendência primária de alta.",
      [
        "EMA50 acima da EMA200 confirma viés comprador.",
        "Inclinação recente da EMA50 segue positiva.",
        "RSI 5m em pullback sem perder o contexto de 1h.",
        "Volume com confirmação profissional evita entrada em mercado sem participação.",
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
      "Sell: repique de exaustão dentro de tendência primária de baixa.",
      [
        "EMA50 abaixo da EMA200 confirma viés vendedor.",
        "Inclinação recente da EMA50 segue negativa.",
        "RSI 5m esticado contra a tendência favorece venda conservadora.",
        "Volume com confirmação profissional valida o movimento.",
      ],
      clamp(confidenceFromScore + 0.04, 0.5, 0.96),
      scoreBreakdown
    );
  }

  if (isPriceExtendedFromEma && !canTradeExtendedMove) {
    return buildHoldDecision(
      input,
      "PRICE_TOO_FAR_FROM_EMA",
      "Hold: preço muito distante da EMA50 para uma entrada conservadora.",
      [
        "O mercado está esticado em relação à média de tendência.",
        "Sem força e volume excepcionais, a estratégia evita entrar longe da EMA50.",
      ],
      clamp(confidenceFromScore, 0.7, 0.9),
      scoreBreakdown
    );
  }

  if (scoreBreakdown.total >= THRESHOLDS.buyScore) {
    return buildBuyDecision(
      input,
      "BUY_CONFIRMED_STRONG_CONTEXT",
      "Buy: contexto técnico favorável com score suficiente.",
      [
        "A estrutura da tendência permanece saudável.",
        "O score consolidado aprovou tendência, volume, RSI e distância da EMA.",
        "A entrada foi validada mesmo sem exigir setup perfeito.",
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
      "Buy: contexto forte compensou uma imperfeição secundária.",
      [
        "A tendência está forte no timeframe principal.",
        "O volume recente confirmou participação suficiente.",
        "A estratégia permitiu a entrada mesmo sem setup perfeito, por contexto excepcional.",
      ],
      clamp(confidenceFromScore + 0.03, 0.5, 0.96),
      scoreBreakdown
    );
  }

  if (!hasStrongTrend || trendStrengthLevel === "WEAK") {
    return buildHoldDecision(
      input,
      "TREND_TOO_WEAK",
      "Hold: tendência ainda fraca para compra conservadora.",
      [
        "A estrutura existe, mas ainda não entrega robustez estatística suficiente.",
        "A estratégia prefere esperar mais confirmação de força.",
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
      "Hold: a EMA50 perdeu inclinação e a tendência está desacelerando.",
      [
        "A estrutura ainda existe, mas a aceleração recente não confirma continuação.",
        "Estratégia conservadora evita entrar quando a EMA50 achata.",
      ],
      clamp(confidenceFromScore, 0.72, 0.9),
      scoreBreakdown
    );
  }

  if (!hasProfessionalVolumeConfirmation) {
    return buildHoldDecision(
      input,
      "VOLUME_BELOW_AVERAGE",
      "Hold: volume sem confirmação suficiente de participação.",
      [
        "O volume atual não está suficientemente acima da média geral e recente.",
        "Sem aceleração clara de fluxo, o movimento pode não ter participação suficiente.",
      ],
      clamp(confidenceFromScore, 0.7, 0.9),
      scoreBreakdown
    );
  }

  if (rsiAssessment.reasonCode === "RSI_OVERHEATED") {
    return buildHoldDecision(
      input,
      "RSI_OVERHEATED",
      "Hold: RSI aquecido demais para entrada conservadora.",
      [
        "O momentum recente indica esticamento excessivo.",
        "A estratégia prefere não perseguir preço já acelerado.",
      ],
      clamp(confidenceFromScore, 0.68, 0.9),
      scoreBreakdown
    );
  }

  if (rsiAssessment.reasonCode === "RSI_TOO_WEAK") {
    return buildHoldDecision(
      input,
      "RSI_TOO_WEAK",
      "Hold: RSI ainda fraco para retomada com qualidade.",
      [
        "O momentum ainda não mostra retomada suficiente.",
        "A estratégia prefere esperar melhor alinhamento do fluxo.",
      ],
      clamp(confidenceFromScore, 0.66, 0.88),
      scoreBreakdown
    );
  }

  return buildHoldDecision(
    input,
    "SCORE_TOO_LOW",
    "Hold: score consolidado ainda insuficiente para compra.",
    [
      "O mercado tem pontos positivos, mas ainda não atingiu nível de confluência suficiente.",
      "A estratégia conservadora prioriza qualidade do contexto antes da entrada.",
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
