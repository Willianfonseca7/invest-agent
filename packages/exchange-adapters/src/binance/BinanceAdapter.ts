import crypto from "node:crypto";
import { MarketTicker } from "@invest-agent/shared-types";

type BinanceTickerResponse = {
  symbol: string;
  price: string;
};

type BinanceOrderResponse = {
  orderId: number;
  symbol: string;
  side: string;
  status: string;
  executedQty: string;
  cummulativeQuoteQty: string;
};

type BinanceBalanceEntry = {
  asset: string;
  free: string;
  locked: string;
};

type BinanceAccountResponse = {
  balances: BinanceBalanceEntry[];
};

export class BinanceAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor() {
    const isTestnet = process.env.BINANCE_TESTNET !== "false";
    this.baseUrl = isTestnet
      ? "https://testnet.binance.vision"
      : "https://api.binance.com";
    this.apiKey = process.env.BINANCE_API_KEY ?? "";
    this.apiSecret = process.env.BINANCE_API_SECRET ?? "";
  }

  private sign(query: string): string {
    return crypto.createHmac("sha256", this.apiSecret).update(query).digest("hex");
  }

  private buildSignedQuery(params: Record<string, string | number>): string {
    const withTimestamp = { ...params, timestamp: Date.now() };
    const query = new URLSearchParams(
      Object.entries(withTimestamp).map(([k, v]) => [k, String(v)])
    ).toString();
    return `${query}&signature=${this.sign(query)}`;
  }

  async getTicker(symbol: string): Promise<MarketTicker> {
    const url = new URL("/api/v3/ticker/price", this.baseUrl);
    url.searchParams.set("symbol", symbol);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Binance ticker failed: ${res.status}`);
    const data = (await res.json()) as BinanceTickerResponse;
    return { symbol: data.symbol, price: Number(data.price) };
  }

  async getTickers(symbols: string[]): Promise<MarketTicker[]> {
    const url = new URL("/api/v3/ticker/price", this.baseUrl);
    url.searchParams.set("symbols", JSON.stringify(symbols));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Binance tickers failed: ${res.status}`);
    const data = (await res.json()) as BinanceTickerResponse[];
    return data.map((item) => ({ symbol: item.symbol, price: Number(item.price) }));
  }

  async getCandles(symbol: string, interval = "1m", limit = 100) {
    const url = `${this.baseUrl}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance klines failed: ${res.status}`);
    const data = await res.json();
    return (data as any[]).map((candle) => ({
      open: Number(candle[1]),
      high: Number(candle[2]),
      low: Number(candle[3]),
      close: Number(candle[4]),
      volume: Number(candle[5]),
      time: candle[0],
    }));
  }

  async getBalance(asset: string): Promise<number> {
    const query = this.buildSignedQuery({});
    const res = await fetch(`${this.baseUrl}/api/v3/account?${query}`, {
      headers: { "X-MBX-APIKEY": this.apiKey },
    });
    if (!res.ok) throw new Error(`Binance account failed: ${res.status}`);
    const data = (await res.json()) as BinanceAccountResponse;
    const entry = data.balances.find((b) => b.asset === asset);
    return entry ? Number(entry.free) : 0;
  }

  async createMarketBuy(
    symbol: string,
    quoteOrderQty: number
  ): Promise<{ orderId: string; executedPrice: number; quantity: number }> {
    const query = this.buildSignedQuery({
      symbol,
      side: "BUY",
      type: "MARKET",
      quoteOrderQty: quoteOrderQty.toFixed(2),
    });
    const res = await fetch(`${this.baseUrl}/api/v3/order`, {
      method: "POST",
      headers: {
        "X-MBX-APIKEY": this.apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: query,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Binance BUY failed: ${res.status} - ${err}`);
    }
    const data = (await res.json()) as BinanceOrderResponse;
    const quantity = Number(data.executedQty);
    const spent = Number(data.cummulativeQuoteQty);
    const executedPrice = quantity > 0 ? spent / quantity : 0;
    return { orderId: String(data.orderId), executedPrice, quantity };
  }

  async createMarketSell(
    symbol: string,
    quantity: number
  ): Promise<{ orderId: string; executedPrice: number }> {
    const qty = Number(quantity.toFixed(5));
    const query = this.buildSignedQuery({
      symbol,
      side: "SELL",
      type: "MARKET",
      quantity: String(qty),
    });
    const res = await fetch(`${this.baseUrl}/api/v3/order`, {
      method: "POST",
      headers: {
        "X-MBX-APIKEY": this.apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: query,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Binance SELL failed: ${res.status} - ${err}`);
    }
    const data = (await res.json()) as BinanceOrderResponse;
    const executedQty = Number(data.executedQty);
    const received = Number(data.cummulativeQuoteQty);
    const executedPrice = executedQty > 0 ? received / executedQty : 0;
    return { orderId: String(data.orderId), executedPrice };
  }
}
