import fs from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";
import type { OperationalAlert } from "@invest-agent/shared-types";

const ALERTS_KEY = "invest-agent:alerts";
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

const ALERTS_FILE = path.join(DATA_DIR, "alerts.json");

export async function readOperationalAlerts(): Promise<OperationalAlert[]> {
  if (redis) {
    return redis.lrange<OperationalAlert>(ALERTS_KEY, 0, MAX_ITEMS - 1);
  }

  try {
    const content = await fs.readFile(ALERTS_FILE, "utf-8");
    return JSON.parse(content) as OperationalAlert[];
  } catch {
    return [];
  }
}

async function writeOperationalAlerts(alerts: OperationalAlert[]): Promise<void> {
  if (redis) {
    await redis.del(ALERTS_KEY);

    if (alerts.length > 0) {
      await redis.lpush(ALERTS_KEY, ...alerts);
      await redis.ltrim(ALERTS_KEY, 0, MAX_ITEMS - 1);
    }

    return;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ALERTS_FILE, JSON.stringify(alerts, null, 2), "utf-8");
}

export async function appendOperationalAlert(alert: OperationalAlert): Promise<void> {
  if (redis) {
    await redis.lpush(ALERTS_KEY, alert);
    await redis.ltrim(ALERTS_KEY, 0, MAX_ITEMS - 1);
    return;
  }

  const alerts = await readOperationalAlerts();
  alerts.unshift(alert);

  if (alerts.length > MAX_ITEMS) {
    alerts.pop();
  }

  await writeOperationalAlerts(alerts);
}
