import { readHistoryFile } from "@invest-agent/utils";
import express from "express";
import cors from "cors";
import { config } from "@invest-agent/config";
import { BinanceAdapter } from "@invest-agent/exchange-adapters";
import { marketRouter } from "./routes/market";
import { getMarketOverview } from "./services/market-data";
import { generateMarketCommentary } from "./services/commentary";

export const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", marketRouter);

const binance = new BinanceAdapter();

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "api", mode: config.executionMode });
});

app.get("/signal/:symbol", async (req, res) => {
  try {
    const signal = await getMarketOverview(req.params.symbol.toUpperCase());
    res.json(signal);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Signal error" });
  }
});

app.get("/market/ticker/:symbol", async (req, res) => {
  try {
    const ticker = await binance.getTicker(req.params.symbol);
    res.json(ticker);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Ticker error" });
  }
});

app.get("/api/market/commentary", async (req, res) => {
  try {
    const rawSymbol = req.query.symbol;
    const symbol =
      typeof rawSymbol === "string" && rawSymbol.trim().length > 0
        ? rawSymbol.trim().toUpperCase()
        : config.trading.defaultSymbol;

    const lang =
      typeof req.query.lang === "string" ? req.query.lang : "pt";

    const market = await getMarketOverview(symbol);
    const commentary = await generateMarketCommentary(market, lang);

    res.json({ symbol, commentary });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Commentary generation failed",
    });
  }
});

app.get("/history", async (_req, res) => {
  try {
    const history = await readHistoryFile();
    res.json(history);
  } catch {
    res.status(500).json({ error: "History read error" });
  }
});
