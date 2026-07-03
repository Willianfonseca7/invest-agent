import axios from "axios";
import i18n from "@/i18n";
import type { MarketApiPayload, MarketOverview, StructuredReason } from "@/types/market";
import type { OperationsOverview } from "@/types/operations";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const marketApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    Accept: "application/json"
  }
});

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.code === "ERR_CANCELED") {
      return "REQUEST_CANCELED";
    }

    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      i18n.t("errors.fetchMarket")
    );
  }

  return error instanceof Error
    ? error.message
    : i18n.t("errors.fetchMarket");
}

function normalizeReason(
  payload: MarketApiPayload
): StructuredReason {
  if (payload.reason && typeof payload.reason === "object") {
    const reason = payload.reason as StructuredReason;
    return {
      code: reason.code || "INSUFFICIENT_INDICATOR_DATA",
      summary: reason.summary || i18n.t("errors.noReason"),
      details: Array.isArray(reason.details) ? reason.details : [],
      metrics: reason.metrics ?? {}
    };
  }

  return {
    code: payload.reasonCode || payload.code || "INSUFFICIENT_INDICATOR_DATA",
    summary:
      typeof payload.reason === "string"
        ? payload.reason
        : payload.decisionReason || i18n.t("errors.noReason"),
    details: [],
    metrics: {}
  };
}

function normalizeMarketOverview(
  payload: MarketApiPayload | unknown,
  symbol: string
): MarketOverview {
  if (!payload || typeof payload !== "object") {
    return {
      symbol,
      price: null,
      avgVolume: null,
      trend4H: "SIDEWAYS",
      trendStrength: null,
      action: "HOLD",
      reason: {
        code: "INSUFFICIENT_INDICATOR_DATA",
        summary: i18n.t("errors.invalidPayload"),
        details: [],
        metrics: {}
      }
    };
  }

  const data = payload as MarketApiPayload;

  return {
    ...data,
    symbol: data.symbol || symbol,
    price: data.price ?? data.currentPrice ?? null,
    avgVolume: data.avgVolume ?? data.averageVolume ?? null,
    trend4H: data.trend4H ?? data.trend4h ?? data.trend ?? "SIDEWAYS",
    trendStrength:
      data.trendStrength ?? data.combinedDistance ?? data.trendScore ?? null,
    action: data.action || data.signal || data.decision || "HOLD",
    reason: normalizeReason(data)
  };
}

export async function fetchMarketOverview(
  symbol = "BTCUSDT",
  options: { signal?: AbortSignal } = {}
): Promise<MarketOverview> {
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

export async function fetchOperationsOverview(
  options: { signal?: AbortSignal } = {}
): Promise<OperationsOverview> {
  try {
    const response = await marketApi.get("/operations", {
      signal: options.signal
    });

    return response.data as OperationsOverview;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
