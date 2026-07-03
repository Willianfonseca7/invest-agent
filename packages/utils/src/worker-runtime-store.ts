import fs from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";
import type { WorkerRuntimeSnapshot } from "@invest-agent/shared-types";

const WORKER_RUNTIME_KEY = "invest-agent:worker-runtime";

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

const WORKER_RUNTIME_FILE = path.join(DATA_DIR, "worker-runtime.json");

export async function readWorkerRuntimeSnapshot(): Promise<WorkerRuntimeSnapshot | null> {
  if (redis) {
    return redis.get<WorkerRuntimeSnapshot>(WORKER_RUNTIME_KEY);
  }

  try {
    const content = await fs.readFile(WORKER_RUNTIME_FILE, "utf-8");
    return JSON.parse(content) as WorkerRuntimeSnapshot;
  } catch {
    return null;
  }
}

export async function writeWorkerRuntimeSnapshot(
  snapshot: WorkerRuntimeSnapshot
): Promise<void> {
  if (redis) {
    await redis.set(WORKER_RUNTIME_KEY, snapshot);
    return;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(WORKER_RUNTIME_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
}
