import fs from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";
import type { TradeLedgerEntry } from "@invest-agent/shared-types";

const TRADES_KEY = "invest-agent:trade-ledger";
const MAX_ITEMS = 500;

function buildRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
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
    return redis.lrange<TradeLedgerEntry>(TRADES_KEY, 0, MAX_ITEMS - 1);
  }

  try {
    const content = await fs.readFile(TRADES_FILE, "utf-8");
    return JSON.parse(content) as TradeLedgerEntry[];
  } catch {
    return [];
  }
}

async function writeTradeLedger(entries: TradeLedgerEntry[]): Promise<void> {
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
}

export async function appendTradeLedgerItem(entry: TradeLedgerEntry): Promise<void> {
  if (redis) {
    await redis.lpush(TRADES_KEY, entry);
    await redis.ltrim(TRADES_KEY, 0, MAX_ITEMS - 1);
    return;
  }

  const ledger = await readTradeLedger();
  ledger.unshift(entry);

  if (ledger.length > MAX_ITEMS) {
    ledger.pop();
  }

  await writeTradeLedger(ledger);
}
