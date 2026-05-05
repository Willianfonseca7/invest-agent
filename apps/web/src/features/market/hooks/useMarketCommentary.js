import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function useMarketCommentary(market) {
  const { t } = useTranslation();

  const commentary = useMemo(() => {
    if (!market?.reason?.code) return null;

    const code = market.reason.code;
    const action = market.action;
    const confidence = market.confidence
      ? `${(market.confidence * 100).toFixed(0)}%`
      : null;
    const trend = market.trend4H;

    const summary = t(`reasons.${code}.summary`, {
      defaultValue: market.reason.summary || null,
    });

    const details = t(`reasons.${code}.details`, {
      defaultValue: market.reason.details?.join(" ") || null,
    });

    if (!summary && !details) return null;

    const parts = [];

    if (summary) parts.push(summary);
    if (details && details !== summary) parts.push(details);

    if (action && confidence && trend) {
      parts.push(
        t("dashboard.commentary.context", {
          action,
          confidence,
          trend,
          defaultValue: "",
        })
      );
    }

    return parts.filter(Boolean).join(" ");
  }, [market, t]);

  return { commentary, loading: false };
}
