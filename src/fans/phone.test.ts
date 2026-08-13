import { describe, expect, it } from "vitest";
import { normalizeUsPhone } from "./phone";

describe("normalizeUsPhone", () => {
  it("normalizes a plain 10-digit number to E.164", () => {
    expect(normalizeUsPhone("6175551234")).toBe("+16175551234");
  });

  it("normalizes common human-typed formats", () => {
    expect(normalizeUsPhone("(617) 555-1234")).toBe("+16175551234");
    expect(normalizeUsPhone("617-555-1234")).toBe("+16175551234");
    expect(normalizeUsPhone("617.555.1234")).toBe("+16175551234");
  });

  it("normalizes an 11-digit number with a leading 1", () => {
    expect(normalizeUsPhone("16175551234")).toBe("+16175551234");
    expect(normalizeUsPhone("+1 617 555 1234")).toBe("+16175551234");
  });

  it("rejects an 11-digit number that doesn't start with 1", () => {
    expect(normalizeUsPhone("26175551234")).toBeNull();
  });

  it("rejects too few or too many digits", () => {
    expect(normalizeUsPhone("5551234")).toBeNull();
    expect(normalizeUsPhone("123456789012")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(normalizeUsPhone("not a phone number")).toBeNull();
  });
});
