import type { OpenPosition, TradeLedgerEntry } from "@invest-agent/shared-types";

export function sortOpenPositions(positions: OpenPosition[]): OpenPosition[] {
  return [...positions].sort((left, right) => right.openedAt - left.openedAt);
}

export function sortRecentTrades(trades: TradeLedgerEntry[]): TradeLedgerEntry[] {
  return [...trades].sort((left, right) => right.executedAt - left.executedAt);
}
