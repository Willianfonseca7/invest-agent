const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchMarketOverview(symbol = "BTCUSDT") {
  const url = new URL(
    `/api/market?symbol=${encodeURIComponent(symbol)}`,
    DEFAULT_API_BASE_URL || window.location.origin
  );

  const response = await fetch(url.toString());

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload?.error || "Erro ao carregar dados consolidados do mercado.";

    throw new Error(message);
  }

  return response.json();
}
