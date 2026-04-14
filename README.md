# Invest Agent

Trading dashboard and bot workspace organized as a small monorepo.

## Architecture

- `apps/api`
  - HTTP layer only.
  - Exposes market data endpoints such as `GET /api/market`.
- `apps/web`
  - React/Vite frontend.
  - Consumes the API and renders the dashboard.
- `apps/worker`
  - Background runner that polls the market and persists signal history.
- `packages/strategy-engine`
  - The bot brain.
  - Calculates RSI, EMA, trend strength, confidence, action, and structured reason.
- `packages/exchange-adapters`
  - Binance integration.
- `packages/config`
  - Shared execution and trading config.
- `packages/utils`
  - Shared file/history utilities.

## Data Flow

1. `apps/api` requests candles from Binance through `packages/exchange-adapters`.
2. `packages/strategy-engine` analyzes 5m and 1h data and returns:
   - `price`
   - `rsi5m`
   - `rsi1h`
   - `ema50`
   - `ema200`
   - `trend4H`
   - `volume`
   - `avgVolume`
   - `action`
   - `confidence`
   - `trendStrength`
   - `reason`
3. `apps/web` consumes `/api/market` and renders the result without recalculating indicators.
4. `apps/worker` uses the same strategy engine, avoiding duplication across API, worker, and frontend.

## Running Locally

From the project root:

```bash
npm run dev:api
```

In another terminal:

```bash
npm run dev:web
```

The Vite app proxies `/api` to `http://localhost:3001`.
The frontend prefers port `4173`. If `4173` is already in use, Vite automatically
falls back to the next free port instead of crashing.

Useful commands:

```bash
npm run lint:web
npm run build:web
npx tsc -p apps/api/tsconfig.json --noEmit
```

## Project Roles

- `apps/api`: transport and HTTP concerns only
- `apps/web`: presentation only
- `packages/strategy-engine`: market logic only
- `apps/worker`: scheduled execution using the same market logic

## Notes

- Keep trading logic out of the frontend.
- Keep API thin and orchestration-focused.
- Keep shared market rules centralized in `packages/strategy-engine`.
