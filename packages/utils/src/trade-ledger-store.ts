import fs from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";
import type { TradeLedgerEntry } from "@invest-agent/shared-types";
import { FinancialStateUnavailableError, readLocalJson, redisConfigured, validateLedger } from "./financial-state";

const TRADES_KEY = "invest-agent:trade-ledger";
const MAX_ITEMS = 500;

function buildRedisClient(): Redis | null {
  if (!redisConfigured()) {
    return null;
  }

  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  });
}

const redis = buildRedisClient();

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, "../../../data");

const TRADES_FILE = path.join(DATA_DIR, "trades.json");

export async function readTradeLedger(): Promise<TradeLedgerEntry[]> {
  if (redis) {
    let entries: unknown;
    try { entries = await redis.lrange<unknown>(TRADES_KEY, 0, MAX_ITEMS - 1); }
    catch { throw new FinancialStateUnavailableError("REDIS_UNAVAILABLE"); }
    // Redis has no durable empty-list value: [] is indistinguishable from a missing key.
    if (Array.isArray(entries) && entries.length === 0) throw new FinancialStateUnavailableError("REDIS_EMPTY_AMBIGUOUS");
    return validateLedger(entries);
  }
  return validateLedger(await readLocalJson(TRADES_FILE));
}

async function writeTradeLedger(entries: TradeLedgerEntry[]): Promise<void> {
  try {
    if (redis) {
      await redis.del(TRADES_KEY);
      if (entries.length > 0) {
        await redis.lpush(TRADES_KEY, ...entries);
        await redis.ltrim(TRADES_KEY, 0, MAX_ITEMS - 1);
      }
      return;
    }
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(TRADES_FILE, JSON.stringify(entries, null, 2), "utf-8");
  } catch {
    throw new FinancialStateUnavailableError("WRITE_FAILURE");
  }
}

export async function appendTradeLedgerItem(entry: TradeLedgerEntry): Promise<void> {
  if (redis) {
    await readTradeLedger();
    try {
      await redis.lpush(TRADES_KEY, entry);
      await redis.ltrim(TRADES_KEY, 0, MAX_ITEMS - 1);
      return;
    } catch {
      throw new FinancialStateUnavailableError("WRITE_FAILURE");
    }
  }

  const ledger = await readTradeLedger();
  ledger.unshift(entry);

  if (ledger.length > MAX_ITEMS) {
    ledger.pop();
  }

  await writeTradeLedger(ledger);
}
