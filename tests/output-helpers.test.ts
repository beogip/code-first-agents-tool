import { describe, expect, it } from "bun:test";
import { z } from "zod";
import {
  classificationTypeOutput,
  dataTypeOutput,
  l1Output,
  l2Output,
  l3Output,
  procedureTypeOutput,
} from "../src/index";
import {
  CLASSIFICATION_HELPER_RESERVED_KEYS,
  CLASSIFICATION_SUBCOMMAND_RESERVED_KEYS,
  DATA_RESERVED_KEYS,
  PROCEDURE_RESERVED_KEYS,
} from "../src/output-helpers";

describe("output helpers", () => {
  it("dataTypeOutput includes ok and message", () => {
    const schema = dataTypeOutput({ count: z.number() });
    const result = schema.safeParse({ ok: true, message: "ok", count: 42 });
    expect(result.success).toBe(true);
  });

  it("classificationTypeOutput includes classification", () => {
    const schema = classificationTypeOutput(z.enum(["a", "b"]));
    const result = schema.safeParse({ ok: true, message: "ok", classification: "a" });
    expect(result.success).toBe(true);
  });

  it("procedureTypeOutput includes instructions", () => {
    const schema = procedureTypeOutput();
    const result = schema.safeParse({ ok: true, message: "ok", instructions: "do this" });
    expect(result.success).toBe(true);
  });

  it("dataTypeOutput rejects when ok is missing", () => {
    const schema = dataTypeOutput({ count: z.number() });
    const result = schema.safeParse({ message: "ok", count: 42 });
    expect(result.success).toBe(false);
  });

  it("dataTypeOutput rejects when message is missing", () => {
    const schema = dataTypeOutput({});
    const result = schema.safeParse({ ok: true });
    expect(result.success).toBe(false);
  });

  it("classificationTypeOutput rejects when classification is missing", () => {
    const schema = classificationTypeOutput(z.enum(["a", "b"]));
    const result = schema.safeParse({ ok: true, message: "ok" });
    expect(result.success).toBe(false);
  });

  it("classificationTypeOutput accepts with extra fields", () => {
    const schema = classificationTypeOutput(z.enum(["a", "b"]), { score: z.number() });
    const result = schema.safeParse({ ok: true, message: "ok", classification: "a", score: 5 });
    expect(result.success).toBe(true);
  });

  it("procedureTypeOutput rejects when instructions is missing", () => {
    const schema = procedureTypeOutput();
    const result = schema.safeParse({ ok: true, message: "ok" });
    expect(result.success).toBe(false);
  });

  it("procedureTypeOutput accepts with extra fields", () => {
    const schema = procedureTypeOutput({ level: z.string() });
    const result = schema.safeParse({
      ok: true,
      message: "ok",
      instructions: "do it",
      level: "high",
    });
    expect(result.success).toBe(true);
  });
});

/**
 * The reserved-field guard closes a hole where an author-declared field won the
 * spread (JS last-key-wins) and silently replaced the envelope contract with a
 * weaker Zod type.
 *
 * Each `@ts-expect-error` below pulls double duty: it suppresses the expected
 * compile error *and* asserts the type layer still produces one. If the type
 * constraint regresses, `bunx tsc --noEmit` fails with
 * `Unused '@ts-expect-error' directive`.
 */
describe("output helpers — reserved envelope fields", () => {
  /** Causal tail shared by every collision message. */
  const TAIL =
    " — the output helper composes these, so declaring them would silently override the envelope contract";

  it("dataTypeOutput rejects a shape redeclaring message", () => {
    // @ts-expect-error — `message` is composed by the envelope, not declarable
    const call = () => dataTypeOutput({ message: z.string() });
    expect(call).toThrow(RangeError);
    expect(call).toThrow(`output shape redeclares reserved envelope field(s): message${TAIL}`);
  });

  it("dataTypeOutput rejects a shape redeclaring ok", () => {
    // @ts-expect-error — `ok` is composed by the envelope, not declarable
    const call = () => dataTypeOutput({ ok: z.literal(true) });
    expect(call).toThrow(RangeError);
    expect(call).toThrow(`output shape redeclares reserved envelope field(s): ok${TAIL}`);
  });

  it("dataTypeOutput rejects a reserved key whatever Zod type weakens it", () => {
    // @ts-expect-error — `.optional()` does not make `message` declarable
    const call = () => dataTypeOutput({ message: z.string().optional() });
    expect(call).toThrow(RangeError);
  });

  it("classificationTypeOutput rejects extras redeclaring message", () => {
    // @ts-expect-error — `message` is composed by the envelope, not declarable
    const call = () => classificationTypeOutput(z.enum(["a", "b"]), { message: z.string() });
    expect(call).toThrow(RangeError);
    expect(call).toThrow(`output shape redeclares reserved envelope field(s): message${TAIL}`);
  });

  /**
   * `classification` is reserved on the STANDALONE helper only, because the enum
   * arrives as its own positional argument here — a `classification` in `fields`
   * would win the spread and silently replace the declared enum with whatever
   * weaker type the author wrote. It stays legal in
   * `classificationSubcommand`'s `output` shape, which is asserted in
   * `index.test.ts`.
   *
   * Dropping `classification` from the helper's reserved set turns this red
   * twice over: `toThrow` fails, and the `@ts-expect-error` below becomes an
   * unused directive that fails `bunx tsc --noEmit`.
   */
  it("classificationTypeOutput rejects extras redeclaring classification", () => {
    // @ts-expect-error — pass the enum as the first argument, not as a `fields` key
    const call = () => classificationTypeOutput(z.enum(["a"]), { classification: z.string() });
    expect(call).toThrow(RangeError);
    expect(call).toThrow(
      `output shape redeclares reserved envelope field(s): classification${TAIL}`,
    );
  });

  it("classificationTypeOutput does not silently weaken the declared enum", () => {
    const widened: z.ZodRawShape = { classification: z.string() };
    const call = () => classificationTypeOutput(z.enum(["a", "b"]), widened);
    expect(call).toThrow(RangeError);
  });

  it("procedureTypeOutput rejects extras redeclaring instructions", () => {
    // @ts-expect-error — `instructions` is composed by the envelope, not declarable
    const call = () => procedureTypeOutput({ instructions: z.string() });
    expect(call).toThrow(RangeError);
    expect(call).toThrow(`output shape redeclares reserved envelope field(s): instructions${TAIL}`);
  });

  /**
   * This test and the next one pin declaration order together, and neither can
   * do it alone — keep both.
   *
   * Reserved-set order is `ok, message, instructions`; alphabetical order is
   * `instructions, message, ok`. Here `{ instructions, ok }` yields
   * `"instructions, ok"`, which rules out reserved-set order but happens to
   * match alphabetical. The next test rules out alphabetical.
   */
  it("names every colliding key, in author declaration order", () => {
    // @ts-expect-error — both `instructions` and `ok` are composed by the envelope
    const call = () => procedureTypeOutput({ instructions: z.string(), ok: z.literal(true) });
    expect(call).toThrow(RangeError);
    expect(call).toThrow(
      `output shape redeclares reserved envelope field(s): instructions, ok${TAIL}`,
    );
  });

  it("does not sort the colliding keys", () => {
    // @ts-expect-error — both `ok` and `message` are composed by the envelope
    const call = () => dataTypeOutput({ ok: z.literal(true), message: z.string() });
    expect(call).toThrow(RangeError);
    // Sorted would be "message, ok" — declaration order wins.
    expect(call).toThrow(`output shape redeclares reserved envelope field(s): ok, message${TAIL}`);
  });

  /**
   * The compile-time layer cannot see through a shape widened to an index
   * signature: there is no per-key type left for `NoReserved` to conflict with,
   * so this call compiles. The runtime guard is the only thing standing between
   * it and a silently broken envelope — which is exactly why the guard exists at
   * both layers rather than only in the type system.
   */
  it("catches an index-signature-typed shape that the type layer cannot", () => {
    const widened: z.ZodRawShape = { message: z.string() };
    expect(() => dataTypeOutput(widened)).toThrow(RangeError);
  });

  /**
   * Asserted through `safeParse` rather than `expect(() => ...).not.toThrow()`:
   * an empty shape gives TypeScript no inference candidate, and inside a generic
   * call like `expect()` the shape parameter is then inferred from the return
   * type instead, which collides with `NoReserved`. Binding the schema first
   * keeps inference local — and parsing proves the shape registered unchanged.
   */
  it("accepts an empty shape on all three helpers", () => {
    const data = dataTypeOutput({});
    const classification = classificationTypeOutput(z.enum(["a", "b"]), {});
    const procedure = procedureTypeOutput({});

    expect(data.safeParse({ ok: true, message: "ok" }).success).toBe(true);
    expect(classification.safeParse({ ok: true, message: "ok", classification: "a" }).success).toBe(
      true,
    );
    expect(procedure.safeParse({ ok: true, message: "ok", instructions: "do it" }).success).toBe(
      true,
    );
  });

  it("accepts the no-argument overloads", () => {
    expect(() => classificationTypeOutput(z.enum(["a", "b"]))).not.toThrow();
    expect(() => procedureTypeOutput()).not.toThrow();
  });

  it("treats reserved keys as case-sensitive", () => {
    const schema = dataTypeOutput({ Message: z.string(), OK: z.boolean() });
    const result = schema.safeParse({ ok: true, message: "ok", Message: "x", OK: false });
    expect(result.success).toBe(true);
  });

  it("ignores prototype-inherited keys", () => {
    const inherited = Object.create({ message: z.string() }) as { count: z.ZodNumber };
    inherited.count = z.number();
    expect(() => dataTypeOutput(inherited)).not.toThrow();
  });

  it("ignores symbol-keyed fields", () => {
    const marker = Symbol("message");
    expect(() => dataTypeOutput({ count: z.number(), [marker]: z.string() })).not.toThrow();
  });

  it("instructions stays declarable on a data output", () => {
    const schema = dataTypeOutput({ instructions: z.string() });
    const result = schema.safeParse({ ok: true, message: "ok", instructions: "do it" });
    expect(result.success).toBe(true);
  });
});

/**
 * The deprecated aliases are plain `export const x = y` bindings, so they
 * inherit the guard for free. Asserted explicitly so they cannot silently
 * diverge before the next breaking change removes them.
 */
describe("deprecated output helper aliases — reserved envelope fields", () => {
  it("l1Output rejects a shape redeclaring ok", () => {
    // @ts-expect-error — `ok` is composed by the envelope, not declarable
    const call = () => l1Output({ ok: z.literal(true) });
    expect(call).toThrow(RangeError);
  });

  it("l2Output rejects extras redeclaring message", () => {
    // @ts-expect-error — `message` is composed by the envelope, not declarable
    const call = () => l2Output(z.enum(["a", "b"]), { message: z.string() });
    expect(call).toThrow(RangeError);
  });

  it("l3Output rejects extras redeclaring instructions", () => {
    // @ts-expect-error — `instructions` is composed by the envelope, not declarable
    const call = () => l3Output({ instructions: z.string() });
    expect(call).toThrow(RangeError);
  });
});

/**
 * Each reserved set and the envelope it protects are declared separately, and
 * only these assertions keep them in sync. Drift in one direction is silent: a
 * key added to a composer's `z.object` but not to its reserved set reopens the
 * exact hole this guard closes.
 */
describe("reserved-key sets match the envelopes they protect", () => {
  it("dataTypeOutput reserves every key it composes", () => {
    expect(Object.keys(dataTypeOutput({}).shape)).toEqual([...DATA_RESERVED_KEYS]);
  });

  it("classificationTypeOutput reserves every key it composes", () => {
    const schema = classificationTypeOutput(z.enum(["a", "b"]));
    expect(Object.keys(schema.shape)).toEqual([...CLASSIFICATION_HELPER_RESERVED_KEYS]);
  });

  it("procedureTypeOutput reserves every key it composes", () => {
    expect(Object.keys(procedureTypeOutput().shape)).toEqual([...PROCEDURE_RESERVED_KEYS]);
  });

  // The subcommand set is the helper set minus `classification` — the one
  // documented exemption. Pinned so the two cannot drift for any other reason.
  it("the classificationSubcommand set is the helper set minus classification", () => {
    expect([...CLASSIFICATION_SUBCOMMAND_RESERVED_KEYS]).toEqual(
      CLASSIFICATION_HELPER_RESERVED_KEYS.filter((key) => key !== "classification"),
    );
  });
});
