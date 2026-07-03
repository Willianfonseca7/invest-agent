import { describe, expect, it } from "vitest";
import {
  buildPortfolioState,
  getPortfolioBudget,
  getPortfolioPosition,
  summarizePortfolioState
} from "../services/portfolio-service";

const state = buildPortfolioState({
  timestamp: 123,
  capital: {
    totalCapital: 1000,
    freeCash: 700,
    reservedCash: 0,
    availableCapital: 700,
    allocatedCapital: 300,
    exposure: 320,
    unrealizedPnl: 20,
    positions: [
      {
        symbol: "BTCUSDT",
        side: "BUY",
        entryPrice: 100,
        quantity: 3,
        orderId: "order-1",
        openedAt: 1,
        allocatedCapital: 300,
        marketValue: 320,
        exposure: 320,
        unrealizedPnl: {
          amount: 20,
          percent: 0.0667
        }
      }
    ]
  },
  allocationPlan: {
    policyName: "equal-weight",
    totalCapital: 1000,
    allocatedCapital: 1000,
    unallocatedCapital: 0,
    generatedAt: 456,
    budgets: [
      { symbol: "BTCUSDT", weight: 0.5, budget: 500 },
      { symbol: "ETHUSDT", weight: 0.5, budget: 500 }
    ]
  }
});

describe("portfolio-service", () => {
  it("builds the portfolio state with the list of open symbols", () => {
    expect(state.timestamp).toBe(123);
    expect(state.openSymbols).toEqual(["BTCUSDT"]);
  });

  it("returns positions and budgets by symbol", () => {
    expect(getPortfolioPosition(state, "BTCUSDT")?.orderId).toBe("order-1");
    expect(getPortfolioPosition(state, "ETHUSDT")).toBeNull();
    expect(getPortfolioBudget(state, "ETHUSDT")?.budget).toBe(500);
    expect(getPortfolioBudget(state, "SOLUSDT")).toBeNull();
  });

  it("summarizes the portfolio state", () => {
    expect(summarizePortfolioState(state)).toBe(
      "capital=1000.00 free=700.00 available=700.00 exposure=320.00 positions=1"
    );
  });
});
