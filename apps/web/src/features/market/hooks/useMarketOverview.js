import { useCallback, useEffect, useState } from "react";
import { fetchMarketOverview } from "@/services/marketApi";
import i18n from "@/i18n";

const REFRESH_INTERVAL_IN_MS = 30_000;

export function useMarketOverview(symbol = "BTCUSDT") {
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const loadMarket = useCallback(
    async (isBackgroundRefresh = false, options = {}) => {
      try {
        setError("");

        if (isBackgroundRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const nextMarket = await fetchMarketOverview(symbol, {
          signal: options.signal
        });
        setMarket(nextMarket);
        setLastUpdatedAt(new Date());
      } catch (requestError) {
        if (
          requestError instanceof Error &&
          requestError.message === "REQUEST_CANCELED"
        ) {
          return;
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
    [symbol]
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
    refetch: () => loadMarket(true),
  };
}
