import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from "recharts";
import { useTranslation } from "react-i18next";
import { SectionCard } from "@/components/ui/SectionCard";
import { formatNumber } from "@/utils/format";

function calculateRSISequence(prices, period = 14) {
  if (!Array.isArray(prices) || prices.length <= period) {
    return prices.map(() => null);
  }

  const rsiSeries = new Array(period).fill(null);

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i += 1) {
    const diff = prices[i] - prices[i - 1];

    if (diff > 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  if (avgLoss === 0) {
    rsiSeries.push(100);
  } else {
    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    rsiSeries.push(Number(rsi.toFixed(2)));
  }

  for (let i = period + 1; i < prices.length; i += 1) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsiSeries.push(100);
    } else {
      const rs = avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);
      rsiSeries.push(Number(rsi.toFixed(2)));
    }
  }

  return rsiSeries;
}

function buildRsiChartData(closes5m, closes1h) {
  const rsi5mSeries = calculateRSISequence(closes5m, 14);
  const rsi1hSeries = calculateRSISequence(closes1h, 14);

  const length = Math.max(rsi5mSeries.length, rsi1hSeries.length);

  return Array.from({ length }, (_, index) => ({
    candle: index + 1,
    rsi5m: rsi5mSeries[index] ?? null,
    rsi1h: rsi1hSeries[index] ?? null,
    overbought: 70,
    oversold: 30
  }));
}

export function MarketRsiChart({ closes5m = [], closes1h = [] }) {
  const { t } = useTranslation();

  if (
    !Array.isArray(closes5m) ||
    !Array.isArray(closes1h) ||
    closes5m.length === 0 ||
    closes1h.length === 0
  ) {
    return null;
  }

  const chartData = buildRsiChartData(closes5m, closes1h);

  return (
    <SectionCard
      title={t("charts.rsiTitle")}
      description={t("charts.rsiDesc")}
    >
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
            <XAxis dataKey="candle" tick={{ fontSize: 12 }} />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              formatter={(value, name) => [formatNumber(value), name]}
              labelFormatter={(label) => t("charts.candle", { number: label })}
            />

            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" />
            <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="4 4" />

            <Line
              type="monotone"
              dataKey="rsi5m"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              name="RSI 5m"
            />
            <Line
              type="monotone"
              dataKey="rsi1h"
              stroke="#a78bfa"
              strokeWidth={2}
              dot={false}
              name="RSI 1h"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

export default MarketRsiChart;
