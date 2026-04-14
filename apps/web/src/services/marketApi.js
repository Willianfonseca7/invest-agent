import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const marketApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    Accept: "application/json"
  }
});

function getErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    if (error.code === "ERR_CANCELED") {
      return "REQUEST_CANCELED";
    }

    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Erro ao buscar dados do mercado."
    );
  }

  return error instanceof Error
    ? error.message
    : "Erro ao buscar dados do mercado.";
}

function normalizeMarketOverview(payload, symbol) {
  if (!payload || typeof payload !== "object") {
    return {
      symbol,
      action: "HOLD",
      reason: {
        code: "INSUFFICIENT_INDICATOR_DATA",
        summary: "Payload de mercado inválido.",
        details: [],
        metrics: {}
      }
    };
  }

  return {
    ...payload,
    symbol: payload.symbol || symbol,
    price: payload.price ?? payload.currentPrice ?? null,
    avgVolume: payload.avgVolume ?? payload.averageVolume ?? null,
    trend4H: payload.trend4H ?? payload.trend4h ?? payload.trend ?? "SIDEWAYS",
    trendStrength:
      payload.trendStrength ?? payload.combinedDistance ?? payload.trendScore ?? null,
    action: payload.action || payload.signal || payload.decision || "HOLD",
    reason:
      payload.reason && typeof payload.reason === "object"
        ? payload.reason
        : {
            code: payload.reasonCode || payload.code || "INSUFFICIENT_INDICATOR_DATA",
            summary: payload.reason || payload.decisionReason || "Sem justificativa.",
            details: [],
            metrics: {}
          }
  };
}

export async function fetchMarketOverview(
  symbol = "BTCUSDT",
  options = {}
) {
  const safeSymbol = String(symbol || "BTCUSDT").trim().toUpperCase();

  try {
    const response = await marketApi.get("/market", {
      params: { symbol: safeSymbol },
      signal: options.signal
    });

    return normalizeMarketOverview(response.data, safeSymbol);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
