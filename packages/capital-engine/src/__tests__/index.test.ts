import { describe, expect, it } from "vitest";
import {
  buildCapitalSnapshot,
  createPositionSnapshot,
  createPositionValuations
} from "../index";

const position = {
  symbol: "BTCUSDT",
  side: "BUY" as const,
  entryPrice: 100,
  quantity: 2,
  orderId: "order-1",
  openedAt: 1
};

describe("createPositionSnapshot", () => {
  it("uses the mark price to derive exposure and unrealized pnl", () => {
    const snapshot = createPositionSnapshot(position, 120);

    expect(snapshot.allocatedCapital).toBe(200);
    expect(snapshot.marketValue).toBe(240);
    expect(snapshot.exposure).toBe(240);
    expect(snapshot.unrealizedPnl).toEqual({
      amount: 40,
      percent: 0.2
    });
  });
});

describe("createPositionValuations", () => {
  it("creates a valuation entry for each position", () => {
    const valuations = createPositionValuations([position], { BTCUSDT: 105 });

    expect(valuations).toHaveLength(1);
    expect(valuations[0]?.snapshot.marketValue).toBe(210);
  });
});

describe("buildCapitalSnapshot", () => {
  it("aggregates cash, exposure and pnl across positions", () => {
    const capital = buildCapitalSnapshot({
      freeCash: 500,
      reservedCash: 50,
      positions: [position],
      markPrices: { BTCUSDT: 120 }
    });

    expect(capital).toEqual({
      totalCapital: 790,
      freeCash: 500,
      reservedCash: 50,
      availableCapital: 450,
      allocatedCapital: 200,
      exposure: 240,
      unrealizedPnl: 40,
      positions: [
        {
          ...position,
          allocatedCapital: 200,
          marketValue: 240,
          exposure: 240,
          unrealizedPnl: {
            amount: 40,
            percent: 0.2
          }
        }
      ]
    });
  });

  it("never returns negative available capital", () => {
    const capital = buildCapitalSnapshot({
      freeCash: 20,
      reservedCash: 30,
      positions: []
    });

    expect(capital.availableCapital).toBe(0);
  });
});
