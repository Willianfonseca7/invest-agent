import fs from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";
import type { OpenPosition } from "@invest-agent/shared-types";
import { FinancialStateUnavailableError, readLocalJson, redisConfigured, validatePositions } from "./financial-state";

const POSITIONS_KEY = "invest-agent:open-positions";

function buildRedisClient(): Redis | null {
  if (!redisConfigured()) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const redis = buildRedisClient();

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, "../../../data");

const POSITIONS_FILE = path.join(DATA_DIR, "positions.json");

async function readAll(): Promise<OpenPosition[]> {
  if (redis) {
    let value: unknown;
    try { value = await redis.get<unknown>(POSITIONS_KEY); }
    catch { throw new FinancialStateUnavailableError("REDIS_UNAVAILABLE"); }
    if (value === null) throw new FinancialStateUnavailableError("MISSING_STATE");
    return validatePositions(value);
  }
  return validatePositions(await readLocalJson(POSITIONS_FILE));
}

async function writeAll(positions: OpenPosition[]): Promise<void> {
  try {
    if (redis) {
      await redis.set(POSITIONS_KEY, positions);
      return;
    }
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(POSITIONS_FILE, JSON.stringify(positions, null, 2), "utf-8");
  } catch {
    throw new FinancialStateUnavailableError("WRITE_FAILURE");
  }
}

export async function getOpenPosition(symbol: string): Promise<OpenPosition | null> {
  const all = await readAll();
  return all.find((p) => p.symbol === symbol) ?? null;
}

export async function getAllOpenPositions(): Promise<OpenPosition[]> {
  return readAll();
}

export async function saveOpenPosition(position: OpenPosition): Promise<void> {
  const all = await readAll();
  const filtered = all.filter((p) => p.symbol !== position.symbol);
  await writeAll([...filtered, position]);
}

export async function removeOpenPosition(symbol: string): Promise<void> {
  const all = await readAll();
  await writeAll(all.filter((p) => p.symbol !== symbol));
}
