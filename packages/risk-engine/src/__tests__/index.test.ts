import { describe, expect, it } from "vitest";
import { evaluateRisk, summarizeCapitalForRisk } from "../index";

const capital = {
  totalCapital: 1000,
  freeCash: 700,
  reservedCash: 0,
  availableCapital: 700,
  allocatedCapital: 300,
  exposure: 300,
  unrealizedPnl: 20,
  positions: []
};

const baseInput = {
  symbol: "BTCUSDT",
  requestedCapital: 150,
  openPositionsCount: 1,
  maxOpenTrades: 3,
  maxPositionSizePct: 0.25,
  maxPortfolioExposurePct: 0.8,
  minOrderNotional: 10,
  maxDailyLossPct: 0.05,
  cooldownMs: 0,
  consecutiveLossLimit: 0,
  capital,
  recentTrades: [] as any[],
  now: new Date("2026-07-03T12:00:00.000Z").getTime()
};

describe("evaluateRisk", () => {
  it("blocks when there is no requested capital", () => {
    const result = evaluateRisk({
      ...baseInput,
      symbol: "BTCUSDT",
      requestedCapital: 0,
      openPositionsCount: 0
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.code).toBe("NO_REQUESTED_CAPITAL");
  });

  it("blocks when max open trades has been reached", () => {
    const result = evaluateRisk({
      ...baseInput,
      requestedCapital: 100,
      openPositionsCount: 3,
      maxOpenTrades: 3
    });

    expect(result.code).toBe("MAX_OPEN_TRADES_REACHED");
  });

  it("reduces capital when limits are tighter than the request", () => {
    const result = evaluateRisk({
      ...baseInput,
      requestedCapital: 400,
      maxPositionSizePct: 0.2
    });

    expect(result).toMatchObject({
      status: "REDUCED",
      code: "POSITION_SIZE_REDUCED",
      approvedCapital: 200,
      requestedCapital: 400
    });
  });

  it("blocks when the approved capital stays below the exchange minimum", () => {
    const result = evaluateRisk({
      ...baseInput,
      requestedCapital: 8,
      openPositionsCount: 0
    });

    expect(result.code).toBe("BELOW_MIN_ORDER_NOTIONAL");
  });

  it("approves capital when all constraints are satisfied", () => {
    const result = evaluateRisk(baseInput);

    expect(result).toMatchObject({
      status: "APPROVED",
      code: "APPROVED",
      approvedCapital: 150
    });
  });

  it("blocks when portfolio exposure has no remaining headroom", () => {
    const result = evaluateRisk({
      ...baseInput,
      maxPortfolioExposurePct: 0.3
    });

    expect(result.code).toBe("MAX_PORTFOLIO_EXPOSURE_REACHED");
  });

  it("blocks when daily realized loss has breached the limit", () => {
    const result = evaluateRisk({
      ...baseInput,
      recentTrades: [
        {
          id: "loss-1",
          symbol: "BTCUSDT",
          side: "SELL",
          mode: "test",
          trigger: "STOP_LOSS",
          orderId: "sell-1",
          executedPrice: 24000,
          quantity: 0.01,
          quoteAmount: 240,
          closedPosition: true,
          executedAt: new Date("2026-07-03T10:00:00.000Z").getTime(),
          realizedPnl: -60,
          realizedPnlPct: -0.06
        }
      ]
    });

    expect(result.code).toBe("DAILY_LOSS_LIMIT_REACHED");
  });

  it("blocks when cooldown is active after a losing trade", () => {
    const result = evaluateRisk({
      ...baseInput,
      cooldownMs: 60 * 60 * 1000,
      recentTrades: [
        {
          id: "loss-1",
          symbol: "BTCUSDT",
          side: "SELL",
          mode: "test",
          trigger: "STOP_LOSS",
          orderId: "sell-1",
          executedPrice: 24000,
          quantity: 0.01,
          quoteAmount: 240,
          closedPosition: true,
          executedAt: new Date("2026-07-03T11:30:00.000Z").getTime(),
          realizedPnl: -10,
          realizedPnlPct: -0.01
        }
      ]
    });

    expect(result.code).toBe("COOLDOWN_ACTIVE");
  });

  it("blocks when the consecutive loss circuit breaker is active", () => {
    const result = evaluateRisk({
      ...baseInput,
      consecutiveLossLimit: 2,
      recentTrades: [
        {
          id: "loss-2",
          symbol: "ETHUSDT",
          side: "SELL",
          mode: "test",
          trigger: "STOP_LOSS",
          orderId: "sell-2",
          executedPrice: 1800,
          quantity: 1,
          quoteAmount: 1800,
          closedPosition: true,
          executedAt: new Date("2026-07-03T11:00:00.000Z").getTime(),
          realizedPnl: -20,
          realizedPnlPct: -0.01
        },
        {
          id: "loss-1",
          symbol: "BTCUSDT",
          side: "SELL",
          mode: "test",
          trigger: "STOP_LOSS",
          orderId: "sell-1",
          executedPrice: 24000,
          quantity: 0.01,
          quoteAmount: 240,
          closedPosition: true,
          executedAt: new Date("2026-07-03T10:00:00.000Z").getTime(),
          realizedPnl: -10,
          realizedPnlPct: -0.01
        }
      ]
    });

    expect(result.code).toBe("CIRCUIT_BREAKER_ACTIVE");
  });
});

describe("summarizeCapitalForRisk", () => {
  it("returns a concise capital summary", () => {
    expect(summarizeCapitalForRisk(capital)).toBe(
      "total=1000.00 available=700.00 exposure=300.00 allocated=300.00"
    );
  });
});
