import { useCallback, useEffect, useState } from "react";
import { fetchMarketOverview } from "@/services/marketApi";
import i18n from "@/i18n";
import type { MarketOverview } from "@/types/market";

const REFRESH_INTERVAL_IN_MS = 30_000;
const DEFAULT_SYMBOL = "BTCUSDT";

export function useMarketOverview(
  symbol = DEFAULT_SYMBOL,
  hookOptions: { onInvalidSymbol?: (symbol: string) => void } = {}
) {
  const { onInvalidSymbol } = hookOptions;
  const [market, setMarket] = useState<MarketOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const loadMarket = useCallback(
    async (
      isBackgroundRefresh = false,
      requestOptions: { signal?: AbortSignal } = {}
    ) => {
      try {
        setError("");

        if (isBackgroundRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const nextMarket = await fetchMarketOverview(symbol, {
          signal: requestOptions.signal
        });
        setMarket(nextMarket);
        setLastUpdatedAt(new Date());
      } catch (requestError) {
        if (requestError instanceof Error && requestError.message === "REQUEST_CANCELED") {
          return;
        }

        const shouldFallbackToDefault =
          symbol !== DEFAULT_SYMBOL &&
          requestError instanceof Error &&
          /Binance klines failed: 400/i.test(requestError.message);

        if (shouldFallbackToDefault) {
          try {
            const fallbackMarket = await fetchMarketOverview(DEFAULT_SYMBOL, {
              signal: requestOptions.signal
            });
            setMarket(fallbackMarket);
            setLastUpdatedAt(new Date());
            setError("");
            onInvalidSymbol?.(DEFAULT_SYMBOL);
            return;
          } catch {
            // Fall through to the generic error state if the fallback request also fails.
          }
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : i18n.t("errors.loadMarket")
        );
      } finally {
        if (isBackgroundRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [onInvalidSymbol, symbol]
  );

  useEffect(() => {
    const controller = new AbortController();

    loadMarket(false, { signal: controller.signal });

    const interval = window.setInterval(() => {
      loadMarket(true, { signal: controller.signal });
    }, REFRESH_INTERVAL_IN_MS);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [loadMarket]);

  return {
    market,
    loading,
    refreshing,
    error,
    lastUpdatedAt,
    refetch: async () => loadMarket(true),
  };
}
