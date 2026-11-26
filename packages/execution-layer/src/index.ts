import type { BinanceAdapter } from "@invest-agent/exchange-adapters";
import type {
  ExecutionMode,
  ExecutionOrderIntent,
  ExecutionResult,
  OpenPosition,
  TradeLedgerEntry
} from "@invest-agent/shared-types";
import {
  appendTradeLedgerItem,
  getOpenPosition,
  readTradeLedger,
  removeOpenPosition,
  saveOpenPosition
} from "@invest-agent/utils";

function buildBuyPosition(
  symbol: string,
  result: { orderId: string; executedPrice: number; quantity: number }
): OpenPosition {
  return {
    symbol,
    side: "BUY",
    entryPrice: result.executedPrice,
    quantity: result.quantity,
    orderId: result.orderId,
    openedAt: Date.now()
  };
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function roundQuantity(value: number): number {
  return Number(value.toFixed(8));
}

function buildTradeLedgerEntry(result: ExecutionResult): TradeLedgerEntry {
  return {
    id: `${result.symbol}:${result.side}:${result.executedAt}:${result.orderId}`,
    symbol: result.symbol,
    side: result.side,
    mode: result.mode,
    trigger: result.trigger,
    orderId: result.orderId,
    executedPrice: result.executedPrice,
    quantity: result.quantity,
    quoteAmount: result.quoteAmount,
    closedPosition: result.closedPosition,
    executedAt: result.executedAt,
    realizedPnl: result.realizedPnl,
    realizedPnlPct: result.realizedPnlPct
  };
}

// Shared within this process; distributed locking is a separate requirement.
const pendingSymbols = new Set<string>();
const uncertainSymbols = new Set<string>();

export class ExecutionLayer {
  constructor(
    private readonly exchange: Pick<
      BinanceAdapter,
      "createMarketBuy" | "createMarketSell" | "getTicker"
    >,
    private readonly mode: ExecutionMode
  ) {}

  async execute(intent: ExecutionOrderIntent): Promise<ExecutionResult> {
    if (this.mode !== "test") {
      throw new Error("Only paper trading execution is permitted in the v2 MVP");
    }
    if (pendingSymbols.has(intent.symbol) || uncertainSymbols.has(intent.symbol)) {
      throw new Error(`Execution pending or uncertain for ${intent.symbol}`);
    }
    pendingSymbols.add(intent.symbol);
    try {
      return await this.executePaper(intent);
    } finally {
      pendingSymbols.delete(intent.symbol);
    }
  }

  private async executePaper(intent: ExecutionOrderIntent): Promise<ExecutionResult> {
    // Both financial stores must be known before any paper state transition.
    await readTradeLedger();
    const openPosition = await getOpenPosition(intent.symbol);
    const executedAt = Date.now();
    const trigger = intent.trigger ?? null;

    if (intent.side === "BUY") {
      if (openPosition) throw new Error("Position already exists");
      const result = await this.simulateBuy(intent.symbol, intent.quoteOrderQty);
      const position = buildBuyPosition(intent.symbol, result);
      uncertainSymbols.add(intent.symbol);
      await saveOpenPosition(position);

      const executionResult: ExecutionResult = {
        symbol: intent.symbol,
        side: "BUY",
        mode: this.mode,
        trigger,
        orderId: result.orderId,
        executedPrice: result.executedPrice,
        quantity: result.quantity,
        quoteAmount: roundCurrency(result.executedPrice * result.quantity),
        closedPosition: false,
        executedAt,
        realizedPnl: null,
        realizedPnlPct: null
      };

      await appendTradeLedgerItem(buildTradeLedgerEntry(executionResult));
      uncertainSymbols.delete(intent.symbol);
      return executionResult;
    }

    if (!openPosition) throw new Error("No open position to sell");
    if (intent.quantity !== openPosition.quantity) throw new Error("Only full position exits are supported");
    const result = await this.simulateSell(intent.symbol, intent.quantity);
    uncertainSymbols.add(intent.symbol);
    await removeOpenPosition(intent.symbol);

    const quantity = roundQuantity(intent.quantity);
    const quoteAmount = roundCurrency(result.executedPrice * quantity);
    const realizedPnl = openPosition
      ? roundCurrency((result.executedPrice - openPosition.entryPrice) * quantity)
      : null;
    const realizedPnlPct =
      openPosition && openPosition.entryPrice > 0
        ? Number(
            ((result.executedPrice - openPosition.entryPrice) / openPosition.entryPrice).toFixed(
              4
            )
          )
        : null;

    const executionResult: ExecutionResult = {
      symbol: intent.symbol,
      side: "SELL",
      mode: this.mode,
      trigger,
      orderId: result.orderId,
      executedPrice: result.executedPrice,
      quantity,
      quoteAmount,
      closedPosition: true,
      executedAt,
      realizedPnl,
      realizedPnlPct
    };

    await appendTradeLedgerItem(buildTradeLedgerEntry(executionResult));
    uncertainSymbols.delete(intent.symbol);
    return executionResult;
  }

  private async simulateBuy(
    symbol: string,
    quoteOrderQty: number
  ): Promise<{ orderId: string; executedPrice: number; quantity: number }> {
    const ticker = await this.exchange.getTicker(symbol);
    const quantity =
      ticker.price > 0 ? roundQuantity(quoteOrderQty / ticker.price) : 0;

    return {
      orderId: `paper-buy-${Date.now()}`,
      executedPrice: ticker.price,
      quantity
    };
  }

  private async simulateSell(
    symbol: string,
    quantity: number
  ): Promise<{ orderId: string; executedPrice: number }> {
    const ticker = await this.exchange.getTicker(symbol);

    return {
      orderId: `paper-sell-${Date.now()}`,
      executedPrice: ticker.price
    };
  }
}
