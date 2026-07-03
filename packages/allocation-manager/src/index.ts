import type {
  AllocationPlan,
  AllocationTarget,
  AssetBudget,
  InvestmentPolicyInput
} from "@invest-agent/shared-types";
import type { InvestmentPolicy } from "@invest-agent/investment-policy";

export type AllocationManagerInput = InvestmentPolicyInput & {
  totalCapital: number;
  policy: InvestmentPolicy;
};

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function assertValidCapital(totalCapital: number): void {
  if (!Number.isFinite(totalCapital) || totalCapital < 0) {
    throw new Error("Allocation Manager requires a non-negative total capital.");
  }
}

function normalizeTargets(targets: AllocationTarget[]): AllocationTarget[] {
  const validTargets = targets.filter(
    (target) => target.symbol.trim().length > 0 && target.weight > 0
  );

  const totalWeight = validTargets.reduce((sum, target) => sum + target.weight, 0);
  if (validTargets.length === 0 || totalWeight <= 0) {
    return [];
  }

  return validTargets.map((target, index) => {
    const isLast = index === validTargets.length - 1;
    const normalizedWeight = target.weight / totalWeight;
    const priorWeight = validTargets
      .slice(0, index)
      .reduce((sum, item) => sum + item.weight / totalWeight, 0);

    return {
      symbol: target.symbol,
      weight: isLast
        ? Number((1 - priorWeight).toFixed(8))
        : Number(normalizedWeight.toFixed(8))
    };
  });
}

function buildBudgets(
  targets: AllocationTarget[],
  totalCapital: number
): AssetBudget[] {
  if (targets.length === 0) {
    return [];
  }

  let allocatedCapital = 0;

  return targets.map((target, index) => {
    const isLast = index === targets.length - 1;
    const budget = isLast
      ? roundCurrency(totalCapital - allocatedCapital)
      : roundCurrency(totalCapital * target.weight);

    allocatedCapital = roundCurrency(allocatedCapital + budget);

    return {
      symbol: target.symbol,
      weight: target.weight,
      budget
    };
  });
}

export function createAllocationPlan(
  input: AllocationManagerInput
): AllocationPlan {
  assertValidCapital(input.totalCapital);

  const normalizedTargets = normalizeTargets(input.policy.buildTargets(input));
  const budgets = buildBudgets(normalizedTargets, input.totalCapital);
  const allocatedCapital = roundCurrency(
    budgets.reduce((sum, budget) => sum + budget.budget, 0)
  );

  return {
    policyName: input.policy.name,
    totalCapital: roundCurrency(input.totalCapital),
    allocatedCapital,
    unallocatedCapital: roundCurrency(input.totalCapital - allocatedCapital),
    budgets,
    generatedAt: Date.now()
  };
}

export class AllocationManager {
  createPlan(input: AllocationManagerInput): AllocationPlan {
    return createAllocationPlan(input);
  }
}
