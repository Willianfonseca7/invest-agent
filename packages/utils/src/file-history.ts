import fs from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";
import { SignalHistoryItem } from "@invest-agent/shared-types";

const HISTORY_KEY = "invest-agent:signal-history";
const MAX_ITEMS = 100;

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

const HISTORY_FILE_PATH = path.join(DATA_DIR, "history.json");

export async function readHistoryFile(): Promise<SignalHistoryItem[]> {
  if (redis) {
    const items = await redis.lrange<SignalHistoryItem>(HISTORY_KEY, 0, MAX_ITEMS - 1);
    return items;
  }

  try {
    const content = await fs.readFile(HISTORY_FILE_PATH, "utf-8");
    return JSON.parse(content) as SignalHistoryItem[];
  } catch {
    return [];
  }
}

export async function writeHistoryFile(items: SignalHistoryItem[]): Promise<void> {
  if (redis) {
    await redis.del(HISTORY_KEY);

    if (items.length > 0) {
      await redis.lpush(HISTORY_KEY, ...items);
      await redis.ltrim(HISTORY_KEY, 0, MAX_ITEMS - 1);
    }

    return;
  }

  await fs.writeFile(HISTORY_FILE_PATH, JSON.stringify(items, null, 2), "utf-8");
}

export async function appendHistoryItem(item: SignalHistoryItem): Promise<void> {
  if (redis) {
    await redis.lpush(HISTORY_KEY, item);
    await redis.ltrim(HISTORY_KEY, 0, MAX_ITEMS - 1);
    return;
  }

  const history = await readHistoryFile();

  history.unshift(item);

  if (history.length > MAX_ITEMS) {
    history.pop();
  }

  await writeHistoryFile(history);
}
