import { useEffect, useState } from "react";
import { fetchMarketOverview } from "@/services/marketApi";

const REFRESH_INTERVAL_IN_MS = 30_000;

export function useMarketOverview(symbol = "BTCUSDT") {
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load(isBackgroundRefresh = false) {
      try {
        setError("");

        if (isBackgroundRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const nextMarket = await fetchMarketOverview(symbol);

        if (active) {
          setMarket(nextMarket);
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Erro ao carregar mercado."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    load(false);

    const intervalId = window.setInterval(() => {
      load(true);
    }, REFRESH_INTERVAL_IN_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [symbol]);

  return {
    market,
    loading,
    refreshing,
    error,
  };
}
