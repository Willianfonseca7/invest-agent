import { calculateEMA } from "./indicators/ema";
import { calculateRSI } from "./indicators/rsi";

const DECISION_THRESHOLDS = {
  trendStrength: {
    minimumTradable: 0.35,
    gapNormalizationCap: 0.02,
    slopeNormalizationCap: 0.01,
    distanceWeight: 0.7,
    slopeWeight: 0.3
  },
  slope: {
    minimumPositive: 0.0015,
    maximumNegative: -0.0015,
    lookbackCandles: 4
  },
  volume: {
    minimumHealthyRatio: 1.05,
    baselineRatio: 0.9,
    normalizationWindow: 0.5
  },
  rsi: {
    buyFastMaximum: 32,
    buySlowMaximum: 60,
    sellFastMinimum: 68,
    sellSlowMinimum: 40,
    fastNormalizationDistance: 30,
    slowNormalizationDistance: 25
  },
  confidence: {
    baseFloor: 0.35,
    absoluteFloor: 0.35,
    absoluteCeiling: 0.97,
    entryBonus: 0.08,
    holdWeakTrendFloor: 0.78,
    holdWeakTrendCeiling: 0.94,
    holdFlatSlopeFloor: 0.74,
    holdFlatSlopeCeiling: 0.9,
    holdLowVolumeFloor: 0.72,
    holdLowVolumeCeiling: 0.9,
    holdMixedFloor: 0.6,
    holdMixedCeiling: 0.86,
    holdRsiFloor: 0.62,
    holdRsiCeiling: 0.88,
    insufficientData: 0.92
  }
} as const;

export type Candle = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
};

export type MarketTrend = "UP" | "DOWN" | "SIDEWAYS";
export type MarketAction = "BUY" | "SELL" | "HOLD";
export type ReasonCode =
  | "PULLBACK_ENTRY_CONFIRMED"
  | "EXHAUSTION_ENTRY_CONFIRMED"
  | "TREND_TOO_WEAK"
  | "EMA_SLOPE_TOO_FLAT"
  | "VOLUME_BELOW_AVERAGE"
  | "MIXED_TIMEFRAME_MOMENTUM"
  | "RSI_NOT_EXTREME"
  | "INSUFFICIENT_INDICATOR_DATA";

export type MarketAnalysisInput = {
  symbol: string;
  candles5m: Candle[];
  candles1h: Candle[];
};

export type StructuredReason = {
  code: ReasonCode;
  summary: string;
  details: string[];
  metrics: {
    trend4H: MarketTrend;
    trendStrength: number;
    emaGap: number;
    ema50Slope: number;
    volumeRatio: number;
    rsi5m: number;
    rsi1h: number;
  };
};

export type MarketAnalysis = {
  symbol: string;
  price: number;
  rsi5m: number;
  rsi1h: number;
  ema50: number | null;
  ema200: number | null;
  trend4H: MarketTrend;
  trendStrength: number;
  volume: number;
  avgVolume: number;
  action: MarketAction;
  confidence: number;
  reason: StructuredReason;
  timestamp: number;
};

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
}

type TrendStrengthSnapshot = {
  value: number;
  emaGap: number;
  ema50Slope: number;
};

type DecisionInput = {
  trend4H: MarketTrend;
  ema50: number | null;
  ema200: number | null;
  fastRsi: number;
  slowRsi: number;
  trendStrength: number;
  emaGap: number;
  ema50Slope: number;
  volumeRatio: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTrend(ema50: number | null, ema200: number | null): MarketTrend {
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

function calculateSeriesEMA(prices: number[], period: number) {
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

function getTrendStrength(
  closes1h: number[],
  ema50: number | null,
  ema200: number | null
): TrendStrengthSnapshot {
  if (ema50 === null || ema200 === null || ema200 === 0) {
    return {
      value: 0,
      emaGap: 0,
      ema50Slope: 0
    };
  }

  const ema50Series = calculateSeriesEMA(closes1h, 50);
  const latestEma50 = ema50Series.at(-1) ?? ema50;
  const previousEma50 =
    ema50Series.at(-DECISION_THRESHOLDS.slope.lookbackCandles) ??
    ema50Series.at(-2) ??
    latestEma50;
  const emaGap = Math.abs(ema50 - ema200) / ema200;
  const ema50SlopeBase =
    previousEma50 === 0 ? 0 : (latestEma50 - previousEma50) / previousEma50;
  const ema50Slope = Number(ema50SlopeBase.toFixed(4));
  const normalizedGap = clamp(
    emaGap / DECISION_THRESHOLDS.trendStrength.gapNormalizationCap,
    0,
    1
  );
  const normalizedSlope = clamp(
    Math.abs(ema50Slope) / DECISION_THRESHOLDS.trendStrength.slopeNormalizationCap,
    0,
    1
  );
  const value = Number(
    (
      normalizedGap * DECISION_THRESHOLDS.trendStrength.distanceWeight +
      normalizedSlope * DECISION_THRESHOLDS.trendStrength.slopeWeight
    ).toFixed(4)
  );

  return {
    value,
    emaGap: Number(emaGap.toFixed(4)),
    ema50Slope
  };
}

function buildReason(
  input: DecisionInput,
  code: ReasonCode,
  summary: string,
  details: string[]
): StructuredReason {
  return {
    code,
    summary,
    details,
    metrics: {
      trend4H: input.trend4H,
      trendStrength: input.trendStrength,
      emaGap: input.emaGap,
      ema50Slope: input.ema50Slope,
      volumeRatio: input.volumeRatio,
      rsi5m: input.fastRsi,
      rsi1h: input.slowRsi
    }
  };
}

function getBaseConfidence({
  trendStrength,
  volumeRatio,
  fastRsi,
  slowRsi
}: Pick<DecisionInput, "trendStrength" | "volumeRatio" | "fastRsi" | "slowRsi">) {
  const trendComponent = clamp(trendStrength, 0, 1) * 0.45;
  const volumeComponent =
    clamp(
      (volumeRatio - DECISION_THRESHOLDS.volume.baselineRatio) /
        DECISION_THRESHOLDS.volume.normalizationWindow,
      0,
      1
    ) * 0.2;
  const fastMomentumComponent =
    clamp(
      Math.abs(fastRsi - 50) / DECISION_THRESHOLDS.rsi.fastNormalizationDistance,
      0,
      1
    ) * 0.2;
  const slowMomentumComponent =
    clamp(
      Math.abs(slowRsi - 50) / DECISION_THRESHOLDS.rsi.slowNormalizationDistance,
      0,
      1
    ) * 0.15;

  return clamp(
    Number(
      (
        DECISION_THRESHOLDS.confidence.baseFloor +
        trendComponent +
        volumeComponent +
        fastMomentumComponent +
        slowMomentumComponent
      ).toFixed(2)
    ),
    DECISION_THRESHOLDS.confidence.absoluteFloor,
    DECISION_THRESHOLDS.confidence.absoluteCeiling
  );
}

function buildHoldDecision(
  input: DecisionInput,
  code: ReasonCode,
  summary: string,
  details: string[],
  confidence: number
) {
  return {
    action: "HOLD" as const,
    confidence,
    reason: buildReason(input, code, summary, details)
  };
}

export function decideMarketAction(input: DecisionInput) {
  const {
    trend4H,
    ema50,
    ema200,
    fastRsi,
    slowRsi,
    volumeRatio,
    trendStrength,
    ema50Slope
  } = input;

  if (ema50 === null || ema200 === null) {
    return buildHoldDecision(
      input,
      "INSUFFICIENT_INDICATOR_DATA",
      "Hold: indicador insuficiente para assumir risco.",
      [
        "EMA50 ou EMA200 indisponível.",
        "Sem tendência de 4H confiável, a estratégia conservadora não entra."
      ],
      DECISION_THRESHOLDS.confidence.insufficientData
    );
  }

  const baseConfidence = getBaseConfidence(input);
  const hasStrongTrend =
    trendStrength >= DECISION_THRESHOLDS.trendStrength.minimumTradable;
  const hasPositiveSlope =
    ema50Slope >= DECISION_THRESHOLDS.slope.minimumPositive;
  const hasNegativeSlope =
    ema50Slope <= DECISION_THRESHOLDS.slope.maximumNegative;
  const hasHealthyVolume =
    volumeRatio >= DECISION_THRESHOLDS.volume.minimumHealthyRatio;
  const isUptrend = trend4H === "UP" && ema50 > ema200;
  const isDowntrend = trend4H === "DOWN" && ema50 < ema200;
  const fastPullbackBuy = fastRsi <= DECISION_THRESHOLDS.rsi.buyFastMaximum;
  const slowTrendBuy = slowRsi <= DECISION_THRESHOLDS.rsi.buySlowMaximum;
  const fastExhaustionSell =
    fastRsi >= DECISION_THRESHOLDS.rsi.sellFastMinimum;
  const slowTrendSell = slowRsi >= DECISION_THRESHOLDS.rsi.sellSlowMinimum;

  if (
    isUptrend &&
    hasStrongTrend &&
    hasPositiveSlope &&
    hasHealthyVolume &&
    fastPullbackBuy &&
    slowTrendBuy
  ) {
    return {
      action: "BUY" as const,
      confidence: clamp(
        baseConfidence + DECISION_THRESHOLDS.confidence.entryBonus,
        0.5,
        0.96
      ),
      reason: buildReason(
        input,
        "PULLBACK_ENTRY_CONFIRMED",
        "Buy: pullback curto dentro de tendência primária de alta.",
        [
          "EMA50 acima da EMA200 confirma viés comprador.",
          "Inclinação recente da EMA50 segue positiva.",
          "RSI 5m em pullback sem perder o contexto de 1h.",
          "Volume acima da média evita entrada em mercado sem participação."
        ]
      )
    };
  }

  if (
    isDowntrend &&
    hasStrongTrend &&
    hasNegativeSlope &&
    hasHealthyVolume &&
    fastExhaustionSell &&
    slowTrendSell
  ) {
    return {
      action: "SELL" as const,
      confidence: clamp(
        baseConfidence + DECISION_THRESHOLDS.confidence.entryBonus,
        0.5,
        0.96
      ),
      reason: buildReason(
        input,
        "EXHAUSTION_ENTRY_CONFIRMED",
        "Sell: repique de exaustão dentro de tendência primária de baixa.",
        [
          "EMA50 abaixo da EMA200 confirma viés vendedor.",
          "Inclinação recente da EMA50 segue negativa.",
          "RSI 5m esticado contra a tendência favorece venda conservadora.",
          "Volume acima da média valida o movimento."
        ]
      )
    };
  }

  if (!hasStrongTrend) {
    return buildHoldDecision(
      input,
      "TREND_TOO_WEAK",
      "Hold: tendência de 4H fraca para uma entrada conservadora.",
      [
        "A distância entre EMA50 e EMA200 ainda não gera vantagem estatística suficiente.",
        "Sem tendência robusta, o custo de falso sinal aumenta."
      ],
      clamp(
        DECISION_THRESHOLDS.confidence.holdWeakTrendFloor +
          (DECISION_THRESHOLDS.trendStrength.minimumTradable - trendStrength),
        DECISION_THRESHOLDS.confidence.holdWeakTrendFloor,
        DECISION_THRESHOLDS.confidence.holdWeakTrendCeiling
      )
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
        "Estratégia conservadora evita entrar quando a EMA50 achata."
      ],
      clamp(
        DECISION_THRESHOLDS.confidence.holdFlatSlopeFloor + Math.abs(ema50Slope),
        DECISION_THRESHOLDS.confidence.holdFlatSlopeFloor,
        DECISION_THRESHOLDS.confidence.holdFlatSlopeCeiling
      )
    );
  }

  if (!hasHealthyVolume) {
    return buildHoldDecision(
      input,
      "VOLUME_BELOW_AVERAGE",
      "Hold: volume abaixo da média, sem confirmação de participação.",
      [
        "O setup técnico não tem fluxo suficiente para justificar execução.",
        "Mercado fraco aumenta risco de rompimento falso."
      ],
      clamp(
        DECISION_THRESHOLDS.confidence.holdLowVolumeFloor +
          (DECISION_THRESHOLDS.volume.minimumHealthyRatio - volumeRatio),
        DECISION_THRESHOLDS.confidence.holdLowVolumeFloor,
        DECISION_THRESHOLDS.confidence.holdLowVolumeCeiling
      )
    );
  }

  if (
    (isUptrend && (!fastPullbackBuy || !slowTrendBuy)) ||
    (isDowntrend && (!fastExhaustionSell || !slowTrendSell))
  ) {
    return buildHoldDecision(
      input,
      "RSI_NOT_EXTREME",
      "Hold: momentum não atingiu zona de entrada conservadora.",
      [
        "A tendência está alinhada, mas o RSI ainda não oferece assimetria suficiente.",
        "Melhor esperar novo pullback ou nova exaustão."
      ],
      clamp(
        baseConfidence,
        DECISION_THRESHOLDS.confidence.holdRsiFloor,
        DECISION_THRESHOLDS.confidence.holdRsiCeiling
      )
    );
  }

  return buildHoldDecision(
    input,
    "MIXED_TIMEFRAME_MOMENTUM",
    "Hold: sinais mistos entre tendência, momentum e volume.",
    [
      "O mercado não está totalmente alinhado entre contexto de 4H, RSI e fluxo.",
      "Sem confluência, a estratégia prioriza preservação de capital."
    ],
    clamp(
      baseConfidence,
      DECISION_THRESHOLDS.confidence.holdMixedFloor,
      DECISION_THRESHOLDS.confidence.holdMixedCeiling
    )
  );
}

export function analyzeMultiTimeframeMarket({
  symbol,
  candles5m,
  candles1h
}: MarketAnalysisInput): MarketAnalysis {
  const closes5m = candles5m.map((candle) => candle.close);
  const closes1h = candles1h.map((candle) => candle.close);
  const volumes5m = candles5m.map((candle) => candle.volume);

  const price = closes5m.at(-1) ?? 0;
  const volume = volumes5m.at(-1) ?? 0;
  const avgVolume = average(volumes5m);
  const rsi5m = calculateRSI(closes5m, 14);
  const rsi1h = calculateRSI(closes1h, 14);
  const ema50 = calculateEMA(closes1h, 50);
  const ema200 = calculateEMA(closes1h, 200);
  const trend4H = getTrend(ema50, ema200);
  const { value: trendStrength, emaGap, ema50Slope } = getTrendStrength(
    closes1h,
    ema50,
    ema200
  );
  const volumeRatio = avgVolume === 0 ? 0 : Number((volume / avgVolume).toFixed(4));

  const decision = decideMarketAction({
    trend4H,
    ema50,
    ema200,
    fastRsi: rsi5m,
    slowRsi: rsi1h,
    trendStrength,
    emaGap,
    ema50Slope,
    volumeRatio
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
    action: decision.action,
    confidence: decision.confidence,
    reason: decision.reason,
    timestamp: Date.now()
  };
}
