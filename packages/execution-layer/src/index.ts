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
    const executedAt = Date.now();
    const trigger = intent.trigger ?? null;

    if (intent.side === "BUY") {
      const result = await this.simulateBuy(intent.symbol, intent.quoteOrderQty);
      const position = buildBuyPosition(intent.symbol, result);
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
      return executionResult;
    }

    const openPosition = await getOpenPosition(intent.symbol);
    const result = await this.simulateSell(intent.symbol, intent.quantity);
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
