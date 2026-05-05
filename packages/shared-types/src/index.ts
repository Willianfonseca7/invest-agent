export type ExecutionMode = "simulation" | "test" | "live";

export type BotStatus = "idle" | "running" | "stopped" | "error";

export type SignalAction = "BUY" | "SELL" | "HOLD";

export type Signal = {
  symbol: string;
  action: SignalAction;
  confidence: number;
  reason: string;
  timestamp: number;
};

export type OrderSide = "BUY" | "SELL";

export type Order = {
  symbol: string;
  side: OrderSide;
  quantity: number;
  price?: number;
  status: "pending" | "filled" | "canceled" | "rejected";
  createdAt: number;
};

export type MarketTicker = {
  symbol: string;
  price: number;
};

export type SignalHistoryItem = {
  symbol: string;
  price: number;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reason: string;
  timestamp: number;
};

export type OpenPosition = {
  symbol: string;
  side: "BUY";
  entryPrice: number;
  quantity: number;
  orderId: string;
  openedAt: number;
};
