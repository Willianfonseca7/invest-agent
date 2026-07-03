import type { TradeLedgerEntry } from "@invest-agent/shared-types";

function getDayStart(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
}

function getClosedTrades(trades: TradeLedgerEntry[]): TradeLedgerEntry[] {
  return trades.filter((trade) => trade.closedPosition);
}

export function getDailyRealizedPnl(
  trades: TradeLedgerEntry[],
  now: number
): number {
  const dayStart = getDayStart(now);

  return getClosedTrades(trades)
    .filter((trade) => trade.executedAt >= dayStart)
    .reduce((sum, trade) => sum + (trade.realizedPnl ?? 0), 0);
}

export function hasReachedDailyLossLimit(input: {
  trades: TradeLedgerEntry[];
  now: number;
  capitalBase: number;
  maxDailyLossPct: number;
}): boolean {
  if (input.maxDailyLossPct <= 0 || input.capitalBase <= 0) {
    return false;
  }

  const dailyPnl = getDailyRealizedPnl(input.trades, input.now);
  return dailyPnl <= -(input.capitalBase * input.maxDailyLossPct);
}

export function getLastLosingTrade(
  trades: TradeLedgerEntry[]
): TradeLedgerEntry | null {
  return (
    getClosedTrades(trades).find((trade) => (trade.realizedPnl ?? 0) < 0) ?? null
  );
}

export function getCooldownRemainingMs(input: {
  trades: TradeLedgerEntry[];
  now: number;
  cooldownMs: number;
}): number {
  if (input.cooldownMs <= 0) {
    return 0;
  }

  const lastLosingTrade = getLastLosingTrade(input.trades);
  if (!lastLosingTrade) {
    return 0;
  }

  return Math.max(input.cooldownMs - (input.now - lastLosingTrade.executedAt), 0);
}

export function isCooldownActive(input: {
  trades: TradeLedgerEntry[];
  now: number;
  cooldownMs: number;
}): boolean {
  if (input.cooldownMs <= 0) {
    return false;
  }

  const lastLosingTrade = getLastLosingTrade(input.trades);
  if (!lastLosingTrade) {
    return false;
  }

  return input.now - lastLosingTrade.executedAt < input.cooldownMs;
}

export function getConsecutiveLossCount(trades: TradeLedgerEntry[]): number {
  let count = 0;

  for (const trade of getClosedTrades(trades)) {
    if ((trade.realizedPnl ?? 0) < 0) {
      count += 1;
      continue;
    }

    break;
  }

  return count;
}

export function isCircuitBreakerActive(input: {
  trades: TradeLedgerEntry[];
  consecutiveLossLimit: number;
}): boolean {
  if (input.consecutiveLossLimit <= 0) {
    return false;
  }

  return getConsecutiveLossCount(input.trades) >= input.consecutiveLossLimit;
}
