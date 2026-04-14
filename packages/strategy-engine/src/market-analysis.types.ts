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
export type TrendStrengthLevel = "WEAK" | "MODERATE" | "STRONG";

export type ReasonCode =
  | "INSUFFICIENT_INDICATOR_DATA"
  | "TREND_STRUCTURE_INVALID"
  | "TREND_TOO_WEAK"
  | "TIMEFRAME_CONFLICT_STRONG"
  | "EMA_SLOPE_TOO_FLAT"
  | "PRICE_TOO_FAR_FROM_EMA"
  | "PRICE_EXTENDED_CRITICAL"
  | "VOLUME_INSUFFICIENT"
  | "VOLUME_BELOW_AVERAGE"
  | "RSI_TOO_WEAK"
  | "RSI_OVERHEATED"
  | "RSI_NOT_FAVORABLE"
  | "SCORE_TOO_LOW"
  | "PULLBACK_ENTRY_CONFIRMED"
  | "BUY_CONFIRMED_STRONG_CONTEXT"
  | "EXHAUSTION_ENTRY_CONFIRMED";

export type ScoreBreakdown = {
  trend: number;
  slope: number;
  volume: number;
  rsi: number;
  priceVsEma: number;
  total: number;
};

export type ReasonMetrics = {
  trend4H: MarketTrend;
  trendStrength: number;
  trendStrengthLevel: TrendStrengthLevel;
  emaGap: number;
  ema50Slope: number;
  volumeRatio: number;
  recentVolumeRatio: number;
  hasVolumeSpike: boolean;
  priceDistanceToEma50: number;
  rsi5m: number;
  rsi1h: number;
  score?: number;
  scoreBreakdown?: ScoreBreakdown;
};

export type StructuredReason = {
  code: ReasonCode;
  summary: string;
  details: string[];
  metrics: ReasonMetrics;
};

export type MarketAnalysisInput = {
  symbol: string;
  candles5m: Candle[];
  candles1h: Candle[];
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
  closes5m: number[];
  closes1h: number[];
  action: MarketAction;
  confidence: number;
  reason: StructuredReason;
  timestamp: number;
};

export type TrendStrengthSnapshot = {
  value: number;
  emaGap: number;
  ema50Slope: number;
  level: TrendStrengthLevel;
};

export type DecisionInput = {
  trend4H: MarketTrend;
  ema50: number | null;
  ema200: number | null;
  rsi5m: number;
  rsi1h: number;
  trendStrength: number;
  trendStrengthLevel: TrendStrengthLevel;
  emaGap: number;
  ema50Slope: number;
  volumeRatio: number;
  recentVolumeRatio: number;
  hasVolumeSpike: boolean;
  priceDistanceToEma50: number;
};

export type MarketDecision = {
  action: MarketAction;
  confidence: number;
  reason: StructuredReason;
};

export type RsiAssessment = {
  scoreDelta: number;
  state: "FAVORABLE" | "NEUTRAL" | "OVERHEATED" | "WEAK";
  reasonCode?: ReasonCode;
};
