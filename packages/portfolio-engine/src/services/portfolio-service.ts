import type {
  AllocationPlan,
  AssetBudget,
  CapitalSnapshot,
  PortfolioState,
  PositionSnapshot
} from "@invest-agent/shared-types";

export type BuildPortfolioStateInput = {
  capital: CapitalSnapshot;
  allocationPlan: AllocationPlan;
  timestamp?: number;
};

export function buildPortfolioState(
  input: BuildPortfolioStateInput
): PortfolioState {
  return {
    timestamp: input.timestamp ?? Date.now(),
    capital: input.capital,
    allocationPlan: input.allocationPlan,
    openSymbols: input.capital.positions.map((position) => position.symbol)
  };
}

export function getPortfolioPosition(
  state: PortfolioState,
  symbol: string
): PositionSnapshot | null {
  return state.capital.positions.find((position) => position.symbol === symbol) ?? null;
}

export function getPortfolioBudget(
  state: PortfolioState,
  symbol: string
): AssetBudget | null {
  return state.allocationPlan.budgets.find((budget) => budget.symbol === symbol) ?? null;
}

export function summarizePortfolioState(state: PortfolioState): string {
  const positions = state.openSymbols.length;
  return `capital=${state.capital.totalCapital.toFixed(2)} free=${state.capital.freeCash.toFixed(2)} available=${state.capital.availableCapital.toFixed(2)} exposure=${state.capital.exposure.toFixed(2)} positions=${positions}`;
}
