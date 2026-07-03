export type MarketAction = "BUY" | "SELL" | "HOLD";
export type MarketTrend = "UP" | "DOWN" | "SIDEWAYS";
export type StatusTone = "buy" | "sell" | "warn" | "neutral" | "default";

export type ReasonMetrics = {
  trend4H?: MarketTrend;
  trendStrength?: number;
  trendStrengthLevel?: string;
  emaGap?: number;
  ema50Slope?: number;
  volumeRatio?: number;
  recentVolumeRatio?: number;
  hasVolumeSpike?: boolean;
  priceDistanceToEma50?: number;
  rsi5m?: number;
  rsi1h?: number;
  score?: number;
  scoreBreakdown?: {
    trend: number;
    slope: number;
    volume: number;
    rsi: number;
    priceVsEma: number;
    total: number;
  };
};

export type StructuredReason = {
  code: string;
  summary: string;
  details: string[];
  metrics: ReasonMetrics;
};

export type MarketOverview = {
  symbol: string;
  price: number | null;
  avgVolume: number | null;
  volume?: number | null;
  trend4H: MarketTrend;
  trendStrength: number | null;
  action: MarketAction;
  confidence?: number | null;
  reason: StructuredReason;
  rsi5m?: number | null;
  rsi1h?: number | null;
  ema50?: number | null;
  ema200?: number | null;
  closes5m?: number[];
  closes1h?: number[];
  timestamp?: number;
};

export type MarketApiPayload = Partial<MarketOverview> & {
  currentPrice?: number | null;
  averageVolume?: number | null;
  trend4h?: MarketTrend;
  trend?: MarketTrend;
  combinedDistance?: number | null;
  trendScore?: number | null;
  signal?: MarketAction;
  decision?: MarketAction;
  reasonCode?: string;
  code?: string;
  decisionReason?: string;
};
