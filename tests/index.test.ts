import { describe, expect, it } from "bun:test";
import { greet } from "../src/index";

describe("greet", () => {
  it("returns a greeting with the given name", () => {
    expect(greet("world")).toBe("Hello, world!");
  });

  it("uses the provided name", () => {
    expect(greet("Bun")).toBe("Hello, Bun!");
  });
});
