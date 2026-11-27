import Decimal from "decimal.js";

// Private constructor: never mutate Decimal's process-wide defaults.
const Exact = Decimal.clone({ precision: 256, rounding: Decimal.ROUND_HALF_EVEN, toExpNeg: -1000, toExpPos: 1000 });
const PLAIN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const SIGNED = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const CODE = /^[A-Z][A-Z0-9]{1,11}$/;
const MAX_DIGITS = 80;
const MAX_SCALE = 40;
const MAX_INTEGER = 80;

export type DecimalString = string & { readonly __decimalString: unique symbol };
export type Currency = string & { readonly __currency: unique symbol };
export type Money = Readonly<{ amount: DecimalString; currency: Currency }>;
export type Price = Readonly<{ amount: DecimalString; base: Currency; quote: Currency }>;
export type PriceTick = Readonly<{ kind: "priceTick"; amount: DecimalString; base: Currency; quote: Currency }>;
export type Quantity = Readonly<{ amount: DecimalString; asset: Currency }>;
export type QuantityIncrement = Readonly<{ amount: DecimalString; asset: Currency }>;
export type UnitCost = Readonly<{ amount: DecimalString; base: Currency; quote: Currency }>;
export type FxRate = Readonly<{ amount: DecimalString; from: Currency; to: Currency; source: string; observedAt: string; validUntil: string }>;

function decimal(value: unknown, allowNegative: boolean, allowZero: boolean): DecimalString {
  if (typeof value !== "string" || value.length > 202 || !(allowNegative ? SIGNED : PLAIN).test(value)) throw new Error("Invalid plain decimal string");
  const unsigned = value.startsWith("-") ? value.slice(1) : value;
  const [integer, fraction = ""] = unsigned.split(".");
  if (integer.length > MAX_INTEGER || fraction.length > MAX_SCALE || (integer + fraction).replace(/^0+/, "").length > MAX_DIGITS) throw new Error("Decimal resource envelope exceeded");
  const parsed = new Exact(value);
  if (!parsed.isFinite() || (!allowZero && parsed.isZero())) throw new Error("Invalid decimal domain");
  const canonical = parsed.toFixed();
  return (canonical === "-0" ? "0" : canonical) as DecimalString;
}
function exact(value: DecimalString): Decimal { return new Exact(parseDecimal(value)); }
function output(value: Decimal, negative = true): DecimalString {
  if (!value.isFinite()) throw new Error("Non-finite result");
  return decimal(value.toFixed(), negative, true);
}
export function parseDecimal(value: unknown): DecimalString { return decimal(value, true, true); }
export function parseNonNegative(value: unknown): DecimalString { return decimal(value, false, true); }
export function parsePositive(value: unknown): DecimalString { return decimal(value, false, false); }
export function currency(value: unknown): Currency {
  if (typeof value !== "string" || !CODE.test(value)) throw new Error("Invalid currency or asset code");
  return value as Currency;
}
export function money(amount: unknown, code: unknown): Money { return { amount: parseDecimal(amount), currency: currency(code) }; }
export function nonNegativeMoney(amount: unknown, code: unknown): Money { return { amount: parseNonNegative(amount), currency: currency(code) }; }
export function price(amount: unknown, base: unknown, quote: unknown): Price {
  const b = currency(base), q = currency(quote);
  if (b === q) throw new Error("Price requires distinct base and quote");
  return { amount: parsePositive(amount), base: b, quote: q };
}
export function priceTick(amount: unknown, base: unknown, quote: unknown): PriceTick {
  return { kind: "priceTick", ...price(amount, base, quote) };
}
export function unitCost(amount: unknown, base: unknown, quote: unknown): UnitCost {
  const b = currency(base), q = currency(quote);
  if (b === q) throw new Error("Unit cost requires distinct base and quote");
  return { amount: parseNonNegative(amount), base: b, quote: q };
}
export function quantity(amount: unknown, asset: unknown): Quantity { return { amount: parseNonNegative(amount), asset: currency(asset) }; }
export function increment(amount: unknown, asset: unknown): QuantityIncrement { return { amount: parsePositive(amount), asset: currency(asset) }; }
function sameCurrency(a: Money, b: Money): void { if (a.currency !== b.currency) throw new Error("Currency mismatch"); }
export function add(a: Money, b: Money): Money { sameCurrency(a, b); return money(output(exact(a.amount).plus(exact(b.amount))), a.currency); }
export function subtract(a: Money, b: Money): Money { sameCurrency(a, b); return money(output(exact(a.amount).minus(exact(b.amount))), a.currency); }
export function multiply(a: Price, b: Quantity): Money {
  if (a.base !== b.asset) throw new Error("Asset mismatch");
  return money(output(exact(parsePositive(a.amount)).times(exact(parseNonNegative(b.amount)))), a.quote);
}
export function roundAccounting(value: Money, scale: number): Money {
  if (!Number.isInteger(scale) || scale < 0 || scale > MAX_SCALE) throw new Error("Invalid accounting scale");
  return money(output(exact(value.amount).toDecimalPlaces(scale, Exact.ROUND_HALF_EVEN)), value.currency);
}
export function fxRate(amount: unknown, from: unknown, to: unknown, source: unknown, observedAt: unknown, validUntil: unknown): FxRate {
  const f = currency(from), t = currency(to);
  if (f === t || typeof source !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:/ -]{0,127}$/.test(source)) throw new Error("Invalid FX identity or source");
  const observed = timestamp(observedAt), until = timestamp(validUntil);
  if (observed >= until) throw new Error("Invalid FX validity interval");
  return { amount: parsePositive(amount), from: f, to: t, source, observedAt: observed, validUntil: until };
}
function timestamp(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw new Error("Invalid UTC timestamp");
  return value;
}
export function convertFx(value: Money, rate: FxRate | null | undefined, at: unknown): Money {
  const now = timestamp(at);
  if (!rate) throw new Error("Missing FX rate");
  // Revalidate serialized or externally supplied objects at the boundary.
  const checked = fxRate(rate.amount, rate.from, rate.to, rate.source, rate.observedAt, rate.validUntil);
  if (value.currency !== checked.from) throw new Error("Wrong FX direction");
  if (checked.observedAt > now) throw new Error("Future FX observation");
  if (now >= checked.validUntil) throw new Error("Stale FX rate");
  return money(output(exact(value.amount).times(exact(checked.amount))), checked.to);
}
export function validateInitialCapital(amount: unknown): Money {
  return { amount: parsePositive(amount), currency: currency("EUR") };
}

export type BuyQuote = Readonly<{ budget: Money; executionPrice: Price; priceTick: PriceTick; quantityIncrement: QuantityIncrement; fixedCost: Money; costPerUnit: UnitCost }>;
export type BuySizing = Readonly<{ quantity: Quantity; gross: Money; cost: Money; total: Money; remainder: Money }>;
export function floorBuy(input: BuyQuote): BuySizing {
  const { budget, executionPrice: p, priceTick: tick, quantityIncrement: step, fixedCost, costPerUnit } = input;
  if (!tick || tick.kind !== "priceTick") throw new Error("Missing or invalid price tick");
  if (budget.currency !== p.quote || fixedCost.currency !== p.quote || costPerUnit.quote !== p.quote || step.asset !== p.base || costPerUnit.base !== p.base || tick.base !== p.base || tick.quote !== p.quote) throw new Error("Buy domain mismatch");
  const priceValue = exact(parsePositive(p.amount));
  const tickValue = exact(parsePositive(tick.amount));
  if (!priceValue.mod(tickValue).isZero()) throw new Error("Execution price is not a multiple of price tick");
  const available = exact(parseNonNegative(budget.amount));
  const fixed = exact(parseNonNegative(fixedCost.amount));
  const perUnit = priceValue.plus(exact(parseNonNegative(costPerUnit.amount)));
  const stepValue = exact(parsePositive(step.amount));
  if (perUnit.isZero() || stepValue.isZero()) throw new Error("Division by zero");
  if (available.lt(fixed)) throw new Error("Insufficient budget for fixed cost");
  const units = available.minus(fixed).dividedToIntegerBy(perUnit.times(stepValue));
  const qty = units.times(stepValue);
  if (qty.isZero()) throw new Error("Insufficient budget for one increment");
  const gross = priceValue.times(qty);
  const cost = fixed.plus(exact(costPerUnit.amount).times(qty));
  const total = gross.plus(cost);
  if (total.gt(available)) throw new Error("Buy would overspend");
  return { quantity: quantity(output(qty, false), p.base), gross: nonNegativeMoney(output(gross, false), p.quote), cost: nonNegativeMoney(output(cost, false), p.quote), total: nonNegativeMoney(output(total, false), p.quote), remainder: nonNegativeMoney(output(available.minus(total), false), p.quote) };
}
