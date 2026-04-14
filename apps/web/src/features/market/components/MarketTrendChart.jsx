import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { SectionCard } from "@/components/ui/SectionCard";
import { formatCurrency } from "@/utils/format";

function calculateEMASequence(prices, period) {
  if (!Array.isArray(prices) || prices.length < period) {
    return prices.map(() => null);
  }

  const multiplier = 2 / (period + 1);
  const result = new Array(period - 1).fill(null);

  let ema =
    prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

  result.push(Number(ema.toFixed(2)));

  for (let index = period; index < prices.length; index += 1) {
    ema = (prices[index] - ema) * multiplier + ema;
    result.push(Number(ema.toFixed(2)));
  }

  return result;
}

function buildChartData(closes1h) {
  const ema50Series = calculateEMASequence(closes1h, 50);
  const ema200Series = calculateEMASequence(closes1h, 200);

  return closes1h.map((close, index) => ({
    candle: index + 1,
    price: Number(close.toFixed(2)),
    ema50: ema50Series[index],
    ema200: ema200Series[index]
  }));
}

export function MarketTrendChart({ closes1h = [] }) {
  if (!Array.isArray(closes1h) || closes1h.length === 0) {
    return null;
  }

  const chartData = buildChartData(closes1h);

  return (
    <SectionCard
      title="Movimentação de preços + EMAs (1h)"
      description="Preço, EMA50 e EMA200 nos candles mais recentes de 1h."
    >
      <div style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
            <XAxis dataKey="candle" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${Math.round(value)}`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(value, name) => [formatCurrency(value), name]}
              labelFormatter={(label) => `Candle ${label}`}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#f8fafc"
              strokeWidth={2}
              dot={false}
              name="Preço"
            />
            <Line
              type="monotone"
              dataKey="ema50"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              name="EMA 50"
            />
            <Line
              type="monotone"
              dataKey="ema200"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="EMA 200"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

export default MarketTrendChart;
