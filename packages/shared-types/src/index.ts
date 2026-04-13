// Execution mode (como o bot roda)
export type ExecutionMode = "simulation" | "test" | "live";

// Estado do bot
export type BotStatus = "idle" | "running" | "stopped" | "error";

// Ação do sinal
export type SignalAction = "BUY" | "SELL" | "HOLD";

// Estrutura de um sinal
export type Signal = {
  symbol: string;
  action: SignalAction;
  confidence: number; // 0 - 1
  reason: string;
  timestamp: number;
};

// Ordem (já pensando no futuro)
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