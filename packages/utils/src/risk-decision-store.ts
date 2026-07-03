import fs from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";
import type { RiskDecisionRecord } from "@invest-agent/shared-types";

const RISK_DECISIONS_KEY = "invest-agent:risk-decisions";
const MAX_ITEMS = 200;

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

const RISK_DECISIONS_FILE = path.join(DATA_DIR, "risk-decisions.json");

export async function readRiskDecisions(): Promise<RiskDecisionRecord[]> {
  if (redis) {
    return redis.lrange<RiskDecisionRecord>(RISK_DECISIONS_KEY, 0, MAX_ITEMS - 1);
  }

  try {
    const content = await fs.readFile(RISK_DECISIONS_FILE, "utf-8");
    return JSON.parse(content) as RiskDecisionRecord[];
  } catch {
    return [];
  }
}

async function writeRiskDecisions(records: RiskDecisionRecord[]): Promise<void> {
  if (redis) {
    await redis.del(RISK_DECISIONS_KEY);

    if (records.length > 0) {
      await redis.lpush(RISK_DECISIONS_KEY, ...records);
      await redis.ltrim(RISK_DECISIONS_KEY, 0, MAX_ITEMS - 1);
    }

    return;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(RISK_DECISIONS_FILE, JSON.stringify(records, null, 2), "utf-8");
}

export async function appendRiskDecision(
  record: RiskDecisionRecord
): Promise<void> {
  if (redis) {
    await redis.lpush(RISK_DECISIONS_KEY, record);
    await redis.ltrim(RISK_DECISIONS_KEY, 0, MAX_ITEMS - 1);
    return;
  }

  const records = await readRiskDecisions();
  records.unshift(record);

  if (records.length > MAX_ITEMS) {
    records.pop();
  }

  await writeRiskDecisions(records);
}
