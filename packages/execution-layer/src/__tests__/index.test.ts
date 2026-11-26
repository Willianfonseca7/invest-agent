import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BinanceAdapter } from "@invest-agent/exchange-adapters";
import {
  getOpenPosition,
  removeOpenPosition,
  saveOpenPosition,
  appendTradeLedgerItem,
  readTradeLedger
} from "@invest-agent/utils";
import { ExecutionLayer } from "../index";

vi.mock("@invest-agent/utils", () => ({
  saveOpenPosition: vi.fn(),
  removeOpenPosition: vi.fn(),
  getOpenPosition: vi.fn(),
  appendTradeLedgerItem: vi.fn(),
  readTradeLedger: vi.fn().mockResolvedValue([])
}));

describe("ExecutionLayer", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getOpenPosition).mockResolvedValue(null);
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
  it("rejects repeated buys and sells based on persisted position state", async () => {
    const exchange = { getTicker: vi.fn().mockResolvedValue({ price: 100 }), createMarketBuy: vi.fn(), createMarketSell: vi.fn() };
    const layer = new ExecutionLayer(exchange, "test");
    const buy = { symbol: "DUPUSDT", side: "BUY" as const, quoteOrderQty: 100 };
    await layer.execute(buy);
    const position = vi.mocked(saveOpenPosition).mock.calls[0][0];
    vi.mocked(getOpenPosition).mockResolvedValue(position);
    await expect(layer.execute(buy)).rejects.toThrow("Position already exists");
    const sell = { symbol: buy.symbol, side: "SELL" as const, quantity: position.quantity };
    await layer.execute(sell);
    vi.mocked(getOpenPosition).mockResolvedValue(null);
    await expect(layer.execute(sell)).rejects.toThrow("No open position");
    expect(appendTradeLedgerItem).toHaveBeenCalledTimes(2);
    expect(exchange.getTicker).toHaveBeenCalledTimes(2);
  });
  it("rejects overlapping executions within the process", async () => {
    const exchange = { getTicker: vi.fn().mockResolvedValue({ price: 100 }), createMarketBuy: vi.fn(), createMarketSell: vi.fn() };
    const first = new ExecutionLayer(exchange, "test");
    const second = new ExecutionLayer(exchange, "test");
    const intent = { symbol: "LOCKUSDT", side: "BUY" as const, quoteOrderQty: 100 };
    const pending = first.execute(intent);
    await expect(second.execute(intent)).rejects.toThrow("pending or uncertain");
    await pending;
    expect(saveOpenPosition).toHaveBeenCalledTimes(1);
  });
  it("blocks retries after a potentially partial persistence failure", async () => {
    const exchange = { getTicker: vi.fn().mockResolvedValue({ price: 100 }), createMarketBuy: vi.fn(), createMarketSell: vi.fn() };
    const layer = new ExecutionLayer(exchange, "test");
    const intent = { symbol: "FAILUSDT", side: "BUY" as const, quoteOrderQty: 100 };
    vi.mocked(appendTradeLedgerItem).mockRejectedValueOnce(new Error("ledger unavailable"));
    await expect(layer.execute(intent)).rejects.toThrow("ledger unavailable");
    await expect(layer.execute(intent)).rejects.toThrow("pending or uncertain");
    expect(saveOpenPosition).toHaveBeenCalledTimes(1);
  });
  it("blocks both paper sides when ledger state is uncertain", async () => {
    const exchange = { getTicker: vi.fn(), createMarketBuy: vi.fn(), createMarketSell: vi.fn() };
    vi.mocked(readTradeLedger).mockRejectedValue(new Error("secret storage detail"));
    const layer = new ExecutionLayer(exchange, "test");
    await expect(layer.execute({ symbol: "UNCERTAINUSDT", side: "BUY", quoteOrderQty: 100 })).rejects.toThrow();
    await expect(layer.execute({ symbol: "UNCERTAINUSDT", side: "SELL", quantity: 1 })).rejects.toThrow();
    expect(exchange.getTicker).not.toHaveBeenCalled();
    expect(getOpenPosition).not.toHaveBeenCalled();
    expect(saveOpenPosition).not.toHaveBeenCalled();
    expect(removeOpenPosition).not.toHaveBeenCalled();
    expect(appendTradeLedgerItem).not.toHaveBeenCalled();
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
