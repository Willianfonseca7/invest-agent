import type { OpenPosition, TradeLedgerEntry } from "@invest-agent/shared-types";
import fs from "node:fs/promises";

export type FinancialStateFailureCode =
  | "MISSING_STATE"
  | "CORRUPT_JSON"
  | "INVALID_RECORDS"
  | "LOCAL_READ_FAILURE"
  | "REDIS_UNAVAILABLE"
  | "REDIS_PARTIAL_CONFIG"
  | "REDIS_EMPTY_AMBIGUOUS"
  | "WRITE_FAILURE";

export class FinancialStateUnavailableError extends Error {
  constructor(readonly code: FinancialStateFailureCode) {
    super(`Financial state is unavailable: ${code}`);
    this.name = "FinancialStateUnavailableError";
  }
}

export async function readLocalJson(file: string): Promise<unknown> {
  let content: string;
  try {
    content = await fs.readFile(file, "utf-8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    throw new FinancialStateUnavailableError(code === "ENOENT" ? "MISSING_STATE" : "LOCAL_READ_FAILURE");
  }
  try {
    return JSON.parse(content);
  } catch {
    throw new FinancialStateUnavailableError("CORRUPT_JSON");
  }
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;
const nonnegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const string = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export function validatePositions(value: unknown): OpenPosition[] {
  if (!Array.isArray(value) || !value.every((p) => record(p) &&
    string(p.symbol) && p.side === "BUY" && positive(p.entryPrice) &&
    positive(p.quantity) && string(p.orderId) && nonnegative(p.openedAt))) {
    throw new FinancialStateUnavailableError("INVALID_RECORDS");
  }
  const symbols = value.map((p) => p.symbol);
  if (new Set(symbols).size !== symbols.length) throw new FinancialStateUnavailableError("INVALID_RECORDS");
  return value;
}

export function validateLedger(value: unknown): TradeLedgerEntry[] {
  if (!Array.isArray(value) || !value.every((t) => record(t) &&
    string(t.id) && string(t.symbol) && (t.side === "BUY" || t.side === "SELL") &&
    (t.mode === "test" || t.mode === "simulation" || t.mode === "live") &&
    (t.trigger === null || t.trigger === "SIGNAL_BUY" || t.trigger === "SIGNAL_SELL" || t.trigger === "STOP_LOSS" || t.trigger === "TAKE_PROFIT") &&
    string(t.orderId) && positive(t.executedPrice) && positive(t.quantity) &&
    nonnegative(t.quoteAmount) && typeof t.closedPosition === "boolean" &&
    nonnegative(t.executedAt) && (t.realizedPnl === null || typeof t.realizedPnl === "number" && Number.isFinite(t.realizedPnl)) &&
    (t.realizedPnlPct === null || typeof t.realizedPnlPct === "number" && Number.isFinite(t.realizedPnlPct)))) {
    throw new FinancialStateUnavailableError("INVALID_RECORDS");
  }
  const ids = value.map((t) => t.id);
  if (new Set(ids).size !== ids.length) throw new FinancialStateUnavailableError("INVALID_RECORDS");
  return value;
}

export function redisConfigured(): boolean {
  const url = Boolean(process.env.UPSTASH_REDIS_REST_URL);
  const token = Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (url !== token) throw new FinancialStateUnavailableError("REDIS_PARTIAL_CONFIG");
  return url;
}
