import { MarketTicker } from "@invest-agent/shared-types";

type BinanceTickerResponse = {
  symbol: string;
  price: string;
};

export class BinanceAdapter {
  private readonly baseUrl = "https://api.binance.com";

  async getTicker(symbol: string): Promise<MarketTicker> {
    const url = new URL("/api/v3/ticker/price", this.baseUrl);
    url.searchParams.set("symbol", symbol);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Binance ticker request failed: ${response.status}`);
    }

    const data = (await response.json()) as BinanceTickerResponse;

    return {
      symbol: data.symbol,
      price: Number(data.price)
    };
  }

  async getTickers(symbols: string[]): Promise<MarketTicker[]> {
    const url = new URL("/api/v3/ticker/price", this.baseUrl);
    url.searchParams.set("symbols", JSON.stringify(symbols));

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Binance tickers request failed: ${response.status}`);
    }

    const data = (await response.json()) as BinanceTickerResponse[];

    return data.map((item) => ({
      symbol: item.symbol,
      price: Number(item.price)
    }));
  }

  async getCandles(symbol: string, interval = "1m", limit = 100) {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );

      const data = await res.json();

      return data.map((candle: any) => ({
        open: Number(candle[1]),
        high: Number(candle[2]),
        low: Number(candle[3]),
        close: Number(candle[4]),
        volume: Number(candle[5]),
        time: candle[0]
      }));
    }
  
}
