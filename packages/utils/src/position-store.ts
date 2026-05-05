import fs from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";
import { OpenPosition } from "@invest-agent/shared-types";

const POSITIONS_KEY = "invest-agent:open-positions";

function buildRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
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
    const data = await redis.get<OpenPosition[]>(POSITIONS_KEY);
    return data ?? [];
  }
  try {
    const content = await fs.readFile(POSITIONS_FILE, "utf-8");
    return JSON.parse(content) as OpenPosition[];
  } catch {
    return [];
  }
}

async function writeAll(positions: OpenPosition[]): Promise<void> {
  if (redis) {
    await redis.set(POSITIONS_KEY, positions);
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(POSITIONS_FILE, JSON.stringify(positions, null, 2), "utf-8");
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
