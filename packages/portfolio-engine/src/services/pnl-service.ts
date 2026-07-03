import type {
  AssetPerformanceSummary,
  ExecutionMode,
  OpenPosition,
  TradeLedgerEntry,
  TradingPerformanceSummary
} from "@invest-agent/shared-types";

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function roundRatio(value: number): number {
  return Number(value.toFixed(4));
}

export function summarizeTradingPerformance(input: {
  mode: ExecutionMode;
  capitalBase?: number | null;
  openPositions: OpenPosition[];
  trades: TradeLedgerEntry[];
}): TradingPerformanceSummary {
  const completedTrades = input.trades.filter((trade) => trade.closedPosition);
  const wins = completedTrades.filter((trade) => (trade.realizedPnl ?? 0) > 0).length;
  const losses = completedTrades.filter((trade) => (trade.realizedPnl ?? 0) < 0).length;
  const realizedPnl = roundCurrency(
    completedTrades.reduce((sum, trade) => sum + (trade.realizedPnl ?? 0), 0)
  );
  const tradedVolume = roundCurrency(
    input.trades.reduce((sum, trade) => sum + trade.quoteAmount, 0)
  );
  const completedCount = completedTrades.length;

  return {
    mode: input.mode,
    tradeCount: input.trades.length,
    completedTrades: completedCount,
    openPositions: input.openPositions.length,
    wins,
    losses,
    winRate: completedCount === 0 ? 0 : roundRatio(wins / completedCount),
    realizedPnl,
    realizedPnlPct:
      input.capitalBase && input.capitalBase > 0
        ? roundRatio(realizedPnl / input.capitalBase)
        : null,
    tradedVolume,
    lastTradeAt: input.trades[0]?.executedAt ?? null
  };
}

export function summarizeTradingPerformanceByAsset(
  trades: TradeLedgerEntry[]
): AssetPerformanceSummary[] {
  const byAsset = new Map<string, AssetPerformanceSummary>();

  for (const trade of trades) {
    const current = byAsset.get(trade.symbol) ?? {
      symbol: trade.symbol,
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      realizedPnl: 0,
      tradedVolume: 0
    };

    current.trades += 1;
    current.tradedVolume = roundCurrency(current.tradedVolume + trade.quoteAmount);

    if (trade.closedPosition) {
      current.realizedPnl = roundCurrency(current.realizedPnl + (trade.realizedPnl ?? 0));
      if ((trade.realizedPnl ?? 0) > 0) {
        current.wins += 1;
      }
      if ((trade.realizedPnl ?? 0) < 0) {
        current.losses += 1;
      }
    }

    byAsset.set(trade.symbol, current);
  }

  return [...byAsset.values()]
    .map((entry) => {
      const completedTrades = entry.wins + entry.losses;
      return {
        ...entry,
        winRate: completedTrades === 0 ? 0 : roundRatio(entry.wins / completedTrades)
      };
    })
    .sort((left, right) => right.realizedPnl - left.realizedPnl);
}
