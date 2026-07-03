import { useCallback, useEffect, useState } from "react";
import { fetchOperationsOverview } from "@/services/marketApi";
import i18n from "@/i18n";
import type { OperationsOverview } from "@/types/operations";

const REFRESH_INTERVAL_IN_MS = 30_000;

export function useOperationsOverview() {
  const [operations, setOperations] = useState<OperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadOperations = useCallback(
    async (
      isBackgroundRefresh = false,
      options: { signal?: AbortSignal } = {}
    ) => {
      try {
        setError("");

        if (isBackgroundRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const nextOperations = await fetchOperationsOverview({
          signal: options.signal
        });
        setOperations(nextOperations);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.message === "REQUEST_CANCELED") {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : i18n.t("errors.loadOperations")
        );
      } finally {
        if (isBackgroundRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();

    loadOperations(false, { signal: controller.signal });

    const interval = window.setInterval(() => {
      loadOperations(true, { signal: controller.signal });
    }, REFRESH_INTERVAL_IN_MS);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [loadOperations]);

  return {
    operations,
    loading,
    refreshing,
    error,
    refetch: async () => loadOperations(true)
  };
}
