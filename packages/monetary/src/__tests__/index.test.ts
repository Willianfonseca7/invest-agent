import { describe, expect, it } from "vitest";
import { add, convertFx, currency, floorBuy, fxRate, increment, money, multiply, nonNegativeMoney, PAPER_OPENING_BALANCE, parseDecimal, parseNonNegative, parsePositive, price, priceTick, quantity, roundAccounting, subtract, unitCost } from "../index";

const eur = (amount: string) => money(amount, "EUR");

describe("exact monetary foundation", () => {
  it("defines only the virtual EUR opening contract", () => {
    expect(PAPER_OPENING_BALANCE).toEqual({ amount: "100", currency: "EUR" });
  });
  it("canonicalizes finite plain decimal strings and rejects numeric or unbounded inputs", () => {
    expect(() => parseDecimal("-000")).toThrow();
    expect(parseDecimal("0.0100")).toBe("0.01");
    expect(parseDecimal("-0")).toBe("0");
    for (const value of [1, NaN, Infinity, "NaN", "Infinity", "1e3", " 1", "+1", "01", "1.", ".1", "1".repeat(81), `0.${"1".repeat(41)}`]) expect(() => parseDecimal(value)).toThrow();
    expect(() => parseNonNegative("-0.01")).toThrow();
    expect(() => parsePositive("0")).toThrow();
    expect(() => currency("usd")).toThrow();
  });
  it("adds, subtracts, multiplies exactly and keeps USD distinct from USDT", () => {
    expect(add(eur("0.1"), eur("0.2"))).toEqual(eur("0.3"));
    expect(subtract(eur("0.1"), eur("0.2"))).toEqual(eur("-0.1"));
    expect(multiply(price("0.123456789", "BTC", "USDT"), quantity("0.3", "BTC"))).toEqual(money("0.0370370367", "USDT"));
    expect(() => add(money("1", "USD"), money("1", "USDT"))).toThrow();
    expect(() => multiply(price("1", "BTC", "USDT"), quantity("1", "ETH"))).toThrow();
    expect(() => multiply({ ...price("1", "BTC", "USDT"), amount: "-1" as never }, quantity("1", "BTC"))).toThrow();
    expect(multiply(price("0.00000000000000000001", "BTC", "EUR"), quantity("0.1", "BTC"))).toEqual(eur("0.000000000000000000001"));
  });
  it("rounds once at an explicit accounting scale using half-even", () => {
    expect(roundAccounting(eur("1.005"), 2)).toEqual(eur("1"));
    expect(roundAccounting(eur("1.015"), 2)).toEqual(eur("1.02"));
    expect(roundAccounting(eur("-1.015"), 2)).toEqual(eur("-1.02"));
    expect(() => roundAccounting(eur("1"), 41)).toThrow();
  });
  it("rejects output beyond the envelope instead of silently rounding", () => {
    expect(() => multiply(price("9".repeat(80), "BTC", "EUR"), quantity("9".repeat(80), "BTC"))).toThrow();
  });
  it("converts only with directional sourced time-valid FX", () => {
    const r = fxRate("0.9", "USD", "EUR", "fixture", "2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z");
    expect(convertFx(money("10", "USD"), r, "2026-01-01T12:00:00.000Z")).toEqual(eur("9"));
    expect(() => convertFx(money("10", "USD"), null, "2026-01-01T12:00:00.000Z")).toThrow("Missing");
    expect(() => convertFx(eur("10"), r, "2026-01-01T12:00:00.000Z")).toThrow("direction");
    expect(() => convertFx(money("10", "USD"), r, "2025-12-31T23:59:59.999Z")).toThrow("Future");
    expect(() => convertFx(money("10", "USD"), r, "2026-01-02T00:00:00.000Z")).toThrow("Stale");
    expect(() => fxRate("1", "USD", "EUR", "", "2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z")).toThrow();
    expect(() => fxRate("0", "USD", "EUR", "fixture", "2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z")).toThrow();
    expect(() => fxRate("1", "USD", "EUR", "fixture", "2026-02-30T00:00:00.000Z", "2026-03-01T00:00:00.000Z")).toThrow();
  });
  it("floors to the instrument increment with explicit costs and never overspends", () => {
    const input = { budget: nonNegativeMoney("100", "EUR"), executionPrice: price("3.33", "ABC", "EUR"), priceTick: priceTick("0.01", "ABC", "EUR"), quantityIncrement: increment("0.01", "ABC"), fixedCost: nonNegativeMoney("0.10", "EUR"), costPerUnit: unitCost("0.02", "ABC", "EUR") };
    const result = floorBuy(input);
    expect(result.quantity.amount).toBe("29.82");
    expect(result.total.amount).toBe("99.997");
    expect(result.remainder.amount).toBe("0.003");
    expect(add(result.total, result.remainder)).toEqual(input.budget);
    expect(add(result.gross, result.cost)).toEqual(result.total);
    expect(() => floorBuy({ ...input, budget: nonNegativeMoney("0.1", "EUR") })).toThrow("Insufficient");
    expect(floorBuy({ ...input, costPerUnit: unitCost("0", "ABC", "EUR") }).quantity.amount).toBe("30");
    expect(() => floorBuy({ ...input, budget: nonNegativeMoney("0.11", "EUR") })).toThrow("Insufficient");
  });
  it("enforces the caller's positive price tick at the sizing boundary", () => {
    const input = { budget: nonNegativeMoney("10", "EUR"), executionPrice: price("1.03", "ABC", "EUR"), priceTick: priceTick("0.05", "ABC", "EUR"), quantityIncrement: increment("0.01", "ABC"), fixedCost: nonNegativeMoney("0", "EUR"), costPerUnit: unitCost("0", "ABC", "EUR") };
    expect(() => floorBuy(input)).toThrow("multiple of price tick");
    expect(floorBuy({ ...input, executionPrice: price("1.05", "ABC", "EUR") }).quantity.amount).toBe("9.52");
    expect(floorBuy({ ...input, executionPrice: price("0.0000000000000000000000000000000000000002", "ABC", "EUR"), priceTick: priceTick("0.0000000000000000000000000000000000000001", "ABC", "EUR") }).quantity.amount).toBe("50000000000000000000000000000000000000000");
    expect(() => floorBuy({ ...input, priceTick: undefined as never })).toThrow("price tick");
    expect(() => floorBuy({ ...input, priceTick: price("0.05", "ABC", "EUR") as never })).toThrow("price tick");
    expect(() => floorBuy({ ...input, priceTick: { ...input.priceTick, amount: "0" as never } })).toThrow();
    expect(() => floorBuy({ ...input, priceTick: { ...input.priceTick, amount: "NaN" as never } })).toThrow();
    expect(() => floorBuy({ ...input, priceTick: priceTick("0.05", "XYZ", "EUR") })).toThrow("domain mismatch");
    expect(() => floorBuy({ ...input, priceTick: priceTick("0.05", "ABC", "USD") })).toThrow("domain mismatch");
  });
  it("rejects domain mismatch and supports string serialization for NUMERIC boundaries", () => {
    const row = { amount: add(eur("0.1"), eur("0.2")).amount, currency: "EUR" };
    expect(money(JSON.parse(JSON.stringify(row)).amount, JSON.parse(JSON.stringify(row)).currency)).toEqual(eur("0.3"));
    expect(() => floorBuy({ budget: eur("10"), executionPrice: price("1", "ABC", "USD"), priceTick: priceTick("0.01", "ABC", "USD"), quantityIncrement: increment("1", "ABC"), fixedCost: eur("0"), costPerUnit: unitCost("0.01", "ABC", "USD") })).toThrow("domain");
  });
});
