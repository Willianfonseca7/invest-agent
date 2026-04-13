import { Router } from "express";
import { config } from "@invest-agent/config";
import { getMarketOverview } from "../services/market-data";

export const marketRouter = Router();

marketRouter.get("/market", async (req, res) => {
  try {
    const rawSymbol = req.query.symbol;
    const symbol =
      typeof rawSymbol === "string" && rawSymbol.trim().length > 0
        ? rawSymbol.toUpperCase()
        : config.trading.defaultSymbol;

    const market = await getMarketOverview(symbol);

    res.json(market);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao obter dados de mercado"
    });
  }
});
