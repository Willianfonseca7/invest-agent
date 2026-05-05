# Invest Agent

Invest Agent ist ein automatisierter Trading-Bot und ein Echtzeit-Marktdashboard, entwickelt als TypeScript-Monorepo. Das System analysiert Kryptowährungspaare auf mehreren Zeitrahmen, bewertet technische Indikatoren und gibt strukturierte Handelsentscheidungen aus: BUY, SELL oder HOLD.

Das Projekt wurde mit dem Ziel entwickelt, eine saubere Trennung zwischen Marktlogik, HTTP-Schicht, Frontend-Darstellung und Hintergrundverarbeitung herzustellen.

---

## Funktionen

- Echtzeit-Marktanalyse basierend auf RSI, EMA50, EMA200, Volumen und Trendstärke
- Mehrzeitrahmen-Analyse (5-Minuten und 1-Stunden-Kerzen)
- Konfidenzbewertung für jede Handelsentscheidung
- Strukturierter Entscheidungsgrund mit Metriken und Details
- Interaktives Dashboard mit Preis- und RSI-Diagrammen
- Mehrsprachige Oberfläche: Portugiesisch, Englisch, Deutsch
- Marktkommentar-Sektion mit kontextueller Analyse basierend auf den aktuellen Indikatoren
- Signalverlauf mit persistenter Speicherung
- Worker-Prozess für automatisierte Ausführung im Hintergrund
- Unterstützung für Binance Testnet und Produktionsumgebung
- Deployment-Konfiguration für Railway und Koyeb

---

## Technologien

**Backend**

- Node.js mit TypeScript
- Express 5
- Binance REST API
- Upstash Redis (Produktion) mit Fallback auf lokale JSON-Dateien

**Frontend**

- React 18 mit Vite
- i18next für Mehrsprachigkeit
- Recharts für Diagramme
- Axios

**Infrastruktur**

- npm Workspaces (Monorepo)
- GitHub Actions für automatisierten Betrieb
- esbuild für die Produktionskompilierung

---

## Monorepo-Struktur

```
invest-agent/
├── apps/
│   ├── api/          HTTP-Server, Marktdaten-Endpunkte
│   ├── web/          React-Dashboard
│   └── worker/       Hintergrundprozess für automatisierte Signale
└── packages/
    ├── strategy-engine/    Kernlogik: RSI, EMA, Entscheidungen
    ├── exchange-adapters/  Binance-Integration
    ├── ai-client/          Validierungsschicht für externe API-Anfragen
    ├── config/             Gemeinsame Konfiguration
    ├── shared-types/       Gemeinsame TypeScript-Typen
    ├── risk-engine/        Risikoregeln
    ├── portfolio-engine/   Portfolio- und Positionsverwaltung
    └── utils/              Hilfsfunktionen und Signalverlauf
```

---

## Datenfluss

1. Das Frontend oder der Worker fragt `GET /api/market?symbol=BTCUSDT` an.
2. Die API holt 5m- und 1h-Kerzen von Binance über `packages/exchange-adapters`.
3. `packages/strategy-engine` berechnet RSI, EMA50, EMA200, Trendstärke, Volumenratio und gibt eine strukturierte Entscheidung zurück.
4. Das Frontend zeigt alle Werte ohne eigene Neuberechnung an.
5. Der Worker führt dieselbe Analyse im Hintergrund aus und speichert den Signalverlauf.

---

## Entscheidungslogik

Die Strategie-Engine bewertet folgende Bedingungen:

- Trendrichtung: EMA50 im Verhältnis zu EMA200
- Trendstärke: Kombination aus EMA-Abstand und EMA50-Steigung
- RSI auf dem 5m-Zeitrahmen für kurzfristigen Einstiegsmoment
- RSI auf dem 1h-Zeitrahmen für den übergeordneten Kontext
- Volumenbestätigung: aktuelles Volumen gegenüber Durchschnitts- und Kurzzeit-Volumen
- Preisentfernung zur EMA50 als Überdehungsfilter

Nur wenn alle relevanten Bedingungen gleichzeitig erfüllt sind, gibt die Engine ein BUY- oder SELL-Signal aus. Andernfalls gibt sie HOLD mit einem strukturierten Entscheidungsgrund und zugehörigen Metriken zurück.

---

## Lokale Installation

Voraussetzung: Node.js 20 oder neuer.

Repository klonen und Abhängigkeiten installieren:

```bash
git clone https://github.com/Willianfonseca7/invest-agent.git
cd invest-agent
npm install
```

Umgebungsvariablen konfigurieren:

```bash
cp .env.example .env
```

Die `.env`-Datei öffnen und die Binance-Zugangsdaten eintragen. Für Tests werden Testnet-Schlüssel empfohlen: https://testnet.binance.vision

API starten:

```bash
npm run dev:api
```

In einem zweiten Terminal das Frontend starten:

```bash
npm run dev:web
```

Das Dashboard ist unter `http://localhost:4173` erreichbar. Alle Anfragen an `/api` werden automatisch an `http://localhost:3001` weitergeleitet.

---

## Umgebungsvariablen

| Variable | Beschreibung | Standardwert |
|---|---|---|
| `BINANCE_API_KEY` | Binance API-Schlüssel | |
| `BINANCE_API_SECRET` | Binance API-Secret | |
| `BINANCE_TESTNET` | Testnet verwenden | `true` |
| `EXECUTION_MODE` | `simulation` oder `live` | `simulation` |
| `TRADE_AMOUNT_USDT` | Handelsbetrag pro Position in USDT | `50` |
| `MAX_OPEN_TRADES` | Maximale offene Positionen | `2` |
| `STOP_LOSS_PCT` | Stop-Loss-Prozentsatz | `0.03` |
| `TAKE_PROFIT_PCT` | Take-Profit-Prozentsatz | `0.05` |
| `UPSTASH_REDIS_REST_URL` | Redis-URL für Produktion | |
| `UPSTASH_REDIS_REST_TOKEN` | Redis-Token für Produktion | |
| `PORT` | API-Port | `3001` |

Im Modus `simulation` werden Signale berechnet und gespeichert, aber keine echten Aufträge bei Binance platziert. Im Modus `live` werden echte Aufträge ausgeführt.

---

## Nützliche Befehle

```bash
npm run dev:api          API im Entwicklungsmodus starten
npm run dev:web          Frontend im Entwicklungsmodus starten
npm run dev:worker       Worker im Entwicklungsmodus starten
npm run build:web        Frontend für Produktion bauen
npm run lint:web         Linting des Frontends
npx tsc -p apps/api/tsconfig.json --noEmit    TypeScript-Prüfung der API
```

---

## Sicherheitshinweise

Beim Erstellen eines Binance-API-Schlüssels für den Live-Betrieb sollten folgende Einschränkungen gesetzt werden:

- Nur "Spot Trading" aktivieren
- Auszahlungen deaktivieren
- IP-Beschränkung auf den Server setzen

So kann der Schlüssel auch im Falle eines Lecks keinen finanziellen Schaden verursachen.

---

## Geplante Erweiterungen

- Wechsel von Binance Testnet auf Produktionsumgebung für den echten Handelsbetrieb
- Erweiterung um weitere Handelspaare
- Benachrichtigungen bei Signalen per Telegram oder E-Mail
- Erweitertes Risikomanagement mit dynamischen Stop-Loss-Levels
