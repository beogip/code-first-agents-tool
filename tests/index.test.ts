import { describe, expect, it } from "bun:test";
import * as index from "../src/index";

describe("@code-first-agents/tool", () => {
  it("exports a module", () => {
    expect(index).toBeDefined();
  });
});
