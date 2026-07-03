import type {
  CapitalSnapshot,
  OpenPosition,
  PositionSnapshot,
  PositionValuation,
  UnrealizedPnlSnapshot
} from "@invest-agent/shared-types";

export type PositionMarkMap = Record<string, number | undefined>;

export type BuildCapitalSnapshotInput = {
  freeCash: number;
  reservedCash?: number;
  positions: OpenPosition[];
  markPrices?: PositionMarkMap;
};

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function roundRatio(value: number): number {
  return Number(value.toFixed(4));
}

function getPositionAllocatedCapital(position: OpenPosition): number {
  return roundCurrency(position.entryPrice * position.quantity);
}

function getPositionMarketValue(position: OpenPosition, markPrice?: number): number {
  const effectivePrice =
    typeof markPrice === "number" && Number.isFinite(markPrice)
      ? markPrice
      : position.entryPrice;

  return roundCurrency(effectivePrice * position.quantity);
}

function buildUnrealizedPnl(
  allocatedCapital: number,
  marketValue: number
): UnrealizedPnlSnapshot {
  const amount = roundCurrency(marketValue - allocatedCapital);
  const percent = allocatedCapital === 0 ? 0 : roundRatio(amount / allocatedCapital);

  return {
    amount,
    percent
  };
}

export function createPositionSnapshot(
  position: OpenPosition,
  markPrice?: number
): PositionSnapshot {
  const allocatedCapital = getPositionAllocatedCapital(position);
  const marketValue = getPositionMarketValue(position, markPrice);
  const unrealizedPnl = buildUnrealizedPnl(allocatedCapital, marketValue);

  return {
    ...position,
    allocatedCapital,
    marketValue,
    exposure: marketValue,
    unrealizedPnl
  };
}

export function createPositionValuations(
  positions: OpenPosition[],
  markPrices: PositionMarkMap = {}
): PositionValuation[] {
  return positions.map((position) => ({
    symbol: position.symbol,
    snapshot: createPositionSnapshot(position, markPrices[position.symbol])
  }));
}

export function buildCapitalSnapshot(
  input: BuildCapitalSnapshotInput
): CapitalSnapshot {
  const reservedCash = roundCurrency(input.reservedCash ?? 0);
  const positionSnapshots = input.positions.map((position) =>
    createPositionSnapshot(position, input.markPrices?.[position.symbol])
  );

  const allocatedCapital = roundCurrency(
    positionSnapshots.reduce((sum, position) => sum + position.allocatedCapital, 0)
  );
  const exposure = roundCurrency(
    positionSnapshots.reduce((sum, position) => sum + position.exposure, 0)
  );
  const unrealizedPnl = roundCurrency(
    positionSnapshots.reduce((sum, position) => sum + position.unrealizedPnl.amount, 0)
  );
  const totalCapital = roundCurrency(input.freeCash + reservedCash + exposure);
  const availableCapital = roundCurrency(Math.max(input.freeCash - reservedCash, 0));

  return {
    totalCapital,
    freeCash: roundCurrency(input.freeCash),
    reservedCash,
    availableCapital,
    allocatedCapital,
    exposure,
    unrealizedPnl,
    positions: positionSnapshots
  };
}
