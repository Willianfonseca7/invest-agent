import { MarketDashboard } from "@/features/market/components/MarketDashboard";
import { useMarketOverview } from "@/features/market/hooks/useMarketOverview";

function App() {
  const { market, loading, refreshing, error } = useMarketOverview("BTCUSDT");

  if (error) {
    return (
      <main className="app-shell">
        <section className="feedback-panel">
          <span className="eyebrow">Trading Dashboard</span>
          <h1>Falha ao carregar o mercado</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (loading || !market) {
    return (
      <main className="app-shell">
        <section className="feedback-panel">
          <span className="eyebrow">Trading Dashboard</span>
          <h1>Carregando mercado</h1>
          <p>Buscando snapshot consolidado do backend.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <MarketDashboard market={market} refreshing={refreshing} />
    </main>
  );
}

export default App;
