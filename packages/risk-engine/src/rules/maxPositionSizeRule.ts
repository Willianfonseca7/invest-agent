import type { CapitalSnapshot } from "@invest-agent/shared-types";

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

export function getPerTradeCapitalCap(
  capital: CapitalSnapshot,
  maxPositionSizePct: number
): number {
  return roundCurrency(capital.totalCapital * maxPositionSizePct);
}

export function getPortfolioExposureHeadroom(
  capital: CapitalSnapshot,
  maxPortfolioExposurePct: number
): number {
  const maxExposure = roundCurrency(capital.totalCapital * maxPortfolioExposurePct);
  return roundCurrency(Math.max(maxExposure - capital.exposure, 0));
}
