import type {
  AllocationTarget,
  AssetSymbol,
  InvestmentPolicyInput
} from "@invest-agent/shared-types";

export interface InvestmentPolicy {
  readonly name: string;
  buildTargets(input: InvestmentPolicyInput): AllocationTarget[];
}

function uniqueSymbols(symbols: AssetSymbol[]): AssetSymbol[] {
  const seen = new Set<AssetSymbol>();
  const result: AssetSymbol[] = [];

  for (const symbol of symbols) {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

export class EqualWeightInvestmentPolicy implements InvestmentPolicy {
  readonly name = "equal-weight";

  buildTargets(input: InvestmentPolicyInput): AllocationTarget[] {
    const symbols = uniqueSymbols(input.eligibleSymbols);
    if (symbols.length === 0) {
      return [];
    }

    const rawWeight = 1 / symbols.length;

    return symbols.map((symbol, index) => {
      const isLast = index === symbols.length - 1;
      const allocatedWeight = Number(rawWeight.toFixed(8));
      const priorWeight = allocatedWeight * index;
      const weight = isLast
        ? Number((1 - priorWeight).toFixed(8))
        : allocatedWeight;

      return {
        symbol,
        weight
      };
    });
  }
}

export const equalWeightInvestmentPolicy = new EqualWeightInvestmentPolicy();
