import { describe, expect, it } from "vitest";
import { EqualWeightInvestmentPolicy } from "../index";

describe("EqualWeightInvestmentPolicy", () => {
  it("normalizes symbols and splits weights evenly", () => {
    const policy = new EqualWeightInvestmentPolicy();

    const targets = policy.buildTargets({
      eligibleSymbols: [" btcusdt ", "ETHUSDT", "BTCUSDT", "SOLUSDT", ""]
    });

    expect(targets).toEqual([
      { symbol: "BTCUSDT", weight: 0.33333333 },
      { symbol: "ETHUSDT", weight: 0.33333333 },
      { symbol: "SOLUSDT", weight: 0.33333334 }
    ]);
  });

  it("returns an empty list when there are no eligible symbols", () => {
    const policy = new EqualWeightInvestmentPolicy();

    expect(policy.buildTargets({ eligibleSymbols: ["", "   "] })).toEqual([]);
  });
});
