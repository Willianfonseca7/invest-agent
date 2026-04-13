import { readHistoryFile } from "@invest-agent/utils";
import express from "express";
import cors from "cors";
import { config } from "@invest-agent/config";
import { BinanceAdapter } from "@invest-agent/exchange-adapters";
import { marketRouter } from "./routes/market";
import { getMarketOverview } from "./services/market-data";

export const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", marketRouter);

const binance = new BinanceAdapter();

// HEALTH
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "api",
    mode: config.executionMode,
    message: "Invest Agent API online"
  });
});

// SIGNAL
app.get("/signal/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const signal = await getMarketOverview(symbol);

    res.json(signal);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao gerar sinal"
    });
  }
});

// MARKET
app.get("/market/ticker/:symbol", async (req, res) => {
  try {
    const ticker = await binance.getTicker(req.params.symbol);
    res.json(ticker);
  } catch (error) {
    res.status(500).json({
      mensagem: "Falha ao obter o ticker",
      erro: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

// HISTORY
app.get("/history", async (_req, res) => {
  try {
    const history = await readHistoryFile();
    res.json(history);
  } catch {
    res.status(500).json({ error: "Erro ao ler histórico" });
  }
});
