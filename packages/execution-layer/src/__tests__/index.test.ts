import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BinanceAdapter } from "@invest-agent/exchange-adapters";
import {
  getOpenPosition,
  removeOpenPosition,
  saveOpenPosition,
  appendTradeLedgerItem
} from "@invest-agent/utils";
import { ExecutionLayer } from "../index";

vi.mock("@invest-agent/utils", () => ({
  saveOpenPosition: vi.fn(),
  removeOpenPosition: vi.fn(),
  getOpenPosition: vi.fn(),
  appendTradeLedgerItem: vi.fn()
}));

describe("ExecutionLayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists a position after a paper buy execution", async () => {
    const exchange = {
      getTicker: vi.fn().mockResolvedValue({ symbol: "BTCUSDT", price: 25000 }),
      createMarketBuy: vi.fn(),
      createMarketSell: vi.fn()
    } as unknown as BinanceAdapter;

    const executionLayer = new ExecutionLayer(exchange, "test");
    const result = await executionLayer.execute({
      symbol: "BTCUSDT",
      side: "BUY",
      quoteOrderQty: 250,
      trigger: "SIGNAL_BUY"
    });

    expect(result).toMatchObject({
      symbol: "BTCUSDT",
      side: "BUY",
      mode: "test",
      trigger: "SIGNAL_BUY",
      executedPrice: 25000,
      quantity: 0.01,
      quoteAmount: 250,
      closedPosition: false
    });
    expect(result.orderId).toMatch(/^paper-buy-\d+$/);
    expect(exchange.createMarketBuy).not.toHaveBeenCalled();
    expect(exchange.createMarketSell).not.toHaveBeenCalled();
    expect(vi.mocked(saveOpenPosition)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(appendTradeLedgerItem)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveOpenPosition).mock.calls[0]?.[0]).toMatchObject({
      symbol: "BTCUSDT",
      entryPrice: 25000,
      quantity: 0.01,
    });
  });

  it("removes the stored position after a paper sell execution", async () => {
    const exchange = {
      getTicker: vi.fn().mockResolvedValue({ symbol: "BTCUSDT", price: 25500 }),
      createMarketBuy: vi.fn(),
      createMarketSell: vi.fn()
    } as unknown as BinanceAdapter;
    vi.mocked(getOpenPosition).mockResolvedValue({
      symbol: "BTCUSDT",
      side: "BUY",
      entryPrice: 25000,
      quantity: 0.01,
      orderId: "buy-1",
      openedAt: 1
    });

    const executionLayer = new ExecutionLayer(exchange, "test");
    const result = await executionLayer.execute({
      symbol: "BTCUSDT",
      side: "SELL",
      quantity: 0.01,
      trigger: "TAKE_PROFIT"
    });

    expect(result).toMatchObject({
      symbol: "BTCUSDT",
      side: "SELL",
      mode: "test",
      trigger: "TAKE_PROFIT",
      orderId: expect.stringMatching(/^paper-sell-\d+$/),
      executedPrice: 25500,
      quantity: 0.01,
      quoteAmount: 255,
      closedPosition: true,
      realizedPnl: 5,
      realizedPnlPct: 0.02
    });
    expect(exchange.createMarketBuy).not.toHaveBeenCalled();
    expect(exchange.createMarketSell).not.toHaveBeenCalled();
    expect(vi.mocked(removeOpenPosition)).toHaveBeenCalledWith("BTCUSDT");
    expect(vi.mocked(appendTradeLedgerItem)).toHaveBeenCalledTimes(1);
  });
  it.each(["live", "simulation"] as const)("blocks %s before side effects", async (mode) => {
    const exchange = { getTicker: vi.fn(), createMarketBuy: vi.fn(), createMarketSell: vi.fn() };
    const layer = new ExecutionLayer(exchange, mode);
    await expect(layer.execute({ symbol: "BTCUSDT", side: "BUY", quoteOrderQty: 250 })).rejects.toThrow("Only paper trading");
    await expect(layer.execute({ symbol: "BTCUSDT", side: "SELL", quantity: 0.01 })).rejects.toThrow("Only paper trading");
    for (const fn of Object.values(exchange)) expect(fn).not.toHaveBeenCalled();
    for (const fn of [getOpenPosition, saveOpenPosition, removeOpenPosition, appendTradeLedgerItem]) expect(fn).not.toHaveBeenCalled();
  });
});
