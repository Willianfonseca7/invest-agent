import { describe, expect, it } from "vitest";
import type { InvestmentPolicy } from "@invest-agent/investment-policy";
import { equalWeightInvestmentPolicy } from "@invest-agent/investment-policy";
import { AllocationManager, createAllocationPlan } from "../index";

describe("createAllocationPlan", () => {
  it("builds rounded budgets from the equal weight policy", () => {
    const plan = createAllocationPlan({
      totalCapital: 100,
      eligibleSymbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
      policy: equalWeightInvestmentPolicy
    });

    expect(plan.policyName).toBe("equal-weight");
    expect(plan.allocatedCapital).toBe(100);
    expect(plan.unallocatedCapital).toBe(0);
    expect(plan.budgets).toEqual([
      { symbol: "BTCUSDT", weight: 0.33333333, budget: 33.33 },
      { symbol: "ETHUSDT", weight: 0.33333333, budget: 33.33 },
      { symbol: "SOLUSDT", weight: 0.33333334, budget: 33.34 }
    ]);
  });

  it("drops invalid targets and renormalizes remaining weights", () => {
    const policy: InvestmentPolicy = {
      name: "custom",
      buildTargets: () => [
        { symbol: "BTCUSDT", weight: 2 },
        { symbol: "   ", weight: 1 },
        { symbol: "ETHUSDT", weight: 1 },
        { symbol: "SOLUSDT", weight: 0 }
      ]
    };

    const plan = createAllocationPlan({
      totalCapital: 120,
      eligibleSymbols: [],
      policy
    });

    expect(plan.budgets).toEqual([
      { symbol: "BTCUSDT", weight: 0.66666667, budget: 80 },
      { symbol: "ETHUSDT", weight: 0.33333333, budget: 40 }
    ]);
  });

  it("rejects negative capital", () => {
    expect(() =>
      createAllocationPlan({
        totalCapital: -1,
        eligibleSymbols: ["BTCUSDT"],
        policy: equalWeightInvestmentPolicy
      })
    ).toThrow(/non-negative total capital/i);
  });
});

describe("AllocationManager", () => {
  it("delegates plan creation", () => {
    const manager = new AllocationManager();

    const plan = manager.createPlan({
      totalCapital: 50,
      eligibleSymbols: ["BTCUSDT", "ETHUSDT"],
      policy: equalWeightInvestmentPolicy
    });

    expect(plan.budgets.map((budget) => budget.budget)).toEqual([25, 25]);
  });
});
