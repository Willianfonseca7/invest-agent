import MarketDashboard from "@/features/market/components/MarketDashboard";
import { Navbar } from "@/components/layout/Navbar";

function App() {
  return (
    <>
      <Navbar />
      <main className="app-shell">
        <MarketDashboard />
      </main>
    </>
  );
}

export default App;
