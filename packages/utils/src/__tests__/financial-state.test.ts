import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const redisState = vi.hoisted(() => ({ get: vi.fn(), lrange: vi.fn(), set: vi.fn(), lpush: vi.fn(), ltrim: vi.fn() }));
vi.mock("@upstash/redis", () => ({ Redis: class { get = redisState.get; lrange = redisState.lrange; set = redisState.set; lpush = redisState.lpush; ltrim = redisState.ltrim; } }));

let directory: string;
beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "financial-state-"));
  process.env.DATA_DIR = directory;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});
afterEach(async () => { await fs.rm(directory, { recursive: true, force: true }); });

async function stores() {
  const positions = await import("../position-store");
  const ledger = await import("../trade-ledger-store");
  return { positions, ledger };
}

describe("financial state boundaries", () => {
  it("accepts explicit local empty arrays", async () => {
    await fs.writeFile(path.join(directory, "positions.json"), "[]");
    await fs.writeFile(path.join(directory, "trades.json"), "[]");
    const { positions, ledger } = await stores();
    expect(await positions.getAllOpenPositions()).toEqual([]);
    expect(await ledger.readTradeLedger()).toEqual([]);
  });
  it.each(["missing", "corrupt", "invalid"])("blocks %s local state without mutation", async (fixture) => {
    if (fixture !== "missing") {
      const value = fixture === "corrupt" ? "{" : '[{"symbol":"BTCUSDT"}]';
      await fs.writeFile(path.join(directory, "positions.json"), value);
      await fs.writeFile(path.join(directory, "trades.json"), value);
    }
    const { positions, ledger } = await stores();
    const code = fixture === "missing" ? "MISSING_STATE" : fixture === "corrupt" ? "CORRUPT_JSON" : "INVALID_RECORDS";
    await expect(positions.saveOpenPosition({ symbol: "BTCUSDT", side: "BUY", entryPrice: 1, quantity: 1, orderId: "x", openedAt: 1 })).rejects.toMatchObject({ code });
    await expect(ledger.appendTradeLedgerItem({ id: "x", symbol: "BTCUSDT", side: "BUY", mode: "test", trigger: null, orderId: "x", executedPrice: 1, quantity: 1, quoteAmount: 1, closedPosition: false, executedAt: 1, realizedPnl: null, realizedPnlPct: null })).rejects.toMatchObject({ code });
    if (fixture === "missing") expect(await fs.readdir(directory)).toEqual([]);
  });
  it("blocks local read failure without creating financial files", async () => {
    await fs.mkdir(path.join(directory, "positions.json"));
    await fs.mkdir(path.join(directory, "trades.json"));
    const { positions, ledger } = await stores();
    await expect(positions.getAllOpenPositions()).rejects.toMatchObject({ code: "LOCAL_READ_FAILURE" });
    await expect(ledger.readTradeLedger()).rejects.toMatchObject({ code: "LOCAL_READ_FAILURE" });
  });
  it("rejects partial Redis configuration", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.invalid";
    await expect(stores()).rejects.toMatchObject({ code: "REDIS_PARTIAL_CONFIG" });
  });
  it("rejects absent Redis list and unavailable Redis without writes", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.invalid";
    process.env.UPSTASH_REDIS_REST_TOKEN = "inert";
    redisState.get.mockResolvedValue([]);
    redisState.lrange.mockResolvedValue([]);
    const { positions, ledger } = await stores();
    expect(await positions.getAllOpenPositions()).toEqual([]);
    await expect(ledger.readTradeLedger()).rejects.toMatchObject({ code: "REDIS_EMPTY_AMBIGUOUS" });
    redisState.lrange.mockRejectedValue(new Error("sensitive ledger detail"));
    await expect(ledger.readTradeLedger()).rejects.toMatchObject({ code: "REDIS_UNAVAILABLE" });
    redisState.lrange.mockResolvedValue([{ id: "broken" }]);
    await expect(ledger.readTradeLedger()).rejects.toMatchObject({ code: "INVALID_RECORDS" });
    redisState.get.mockResolvedValue(null);
    await expect(positions.getAllOpenPositions()).rejects.toMatchObject({ code: "MISSING_STATE" });
    redisState.get.mockRejectedValue(new Error("sensitive"));
    await expect(positions.getAllOpenPositions()).rejects.toMatchObject({ code: "REDIS_UNAVAILABLE" });
    expect(redisState.set).not.toHaveBeenCalled();
    expect(redisState.lpush).not.toHaveBeenCalled();
  });
});
