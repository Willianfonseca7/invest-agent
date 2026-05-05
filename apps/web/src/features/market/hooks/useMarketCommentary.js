import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchMarketCommentary } from "@/services/marketApi";

export function useMarketCommentary(symbol, market) {
  const { i18n } = useTranslation();
  const [commentary, setCommentary] = useState(null);
  const [loading, setLoading] = useState(false);
  const prevKeyRef = useRef(null);

  const load = useCallback(
    async (signal) => {
      if (!market) return;

      setLoading(true);
      const lang = i18n.language?.split("-")[0] || "pt";
      const text = await fetchMarketCommentary(symbol, lang, { signal });

      if (text !== null) {
        setCommentary(text);
      }

      setLoading(false);
    },
    [symbol, market, i18n.language]
  );

  useEffect(() => {
    if (!market) return;

    const key = `${symbol}-${market.timestamp}-${i18n.language}`;
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    const controller = new AbortController();
    load(controller.signal);

    return () => controller.abort();
  }, [symbol, market, i18n.language, load]);

  return { commentary, loading };
}
