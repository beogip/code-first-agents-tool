## [0.1.4](https://github.com/beogip/code-first-agents-tool/compare/v0.1.3...v0.1.4) (2026-06-07)


### Bug Fixes

* **package:** complete metadata for npm discovery ([#31](https://github.com/beogip/code-first-agents-tool/issues/31)) ([27dd3f6](https://github.com/beogip/code-first-agents-tool/commit/27dd3f65339a01376d15a569625bb4aa15f0a6fe)), closes [#24](https://github.com/beogip/code-first-agents-tool/issues/24)

## [0.1.3](https://github.com/beogip/code-first-agents-tool/compare/v0.1.2...v0.1.3) (2026-06-07)


### Bug Fixes

* **ci:** rewrite kael.code SSH URL to HTTPS so plugin install works in CI ([#29](https://github.com/beogip/code-first-agents-tool/issues/29)) ([f3239e9](https://github.com/beogip/code-first-agents-tool/commit/f3239e98f16b3c6f3caf764edb4dafa8d2fecb6c))

## [0.1.2](https://github.com/beogip/code-first-agents-tool/compare/v0.1.1...v0.1.2) (2026-06-07)


### Bug Fixes

* **ci:** pin Bun to exact 1.2.23 — setup-bun rejects 1.2.x wildcard ([#28](https://github.com/beogip/code-first-agents-tool/issues/28)) ([83bea42](https://github.com/beogip/code-first-agents-tool/commit/83bea428d4a520db1ed385e4c968492e738665c7))

## [0.1.1](https://github.com/beogip/code-first-agents-tool/compare/v0.1.0...v0.1.1) (2026-05-24)


### Bug Fixes

* add SSH key and persist credentials for checkout step ([6544536](https://github.com/beogip/code-first-agents-tool/commit/654453692417e458b9a38d74f170489e54e83d6b))
* **ci:** use SSH repositoryUrl for semantic-release to bypass branch ruleset ([b72e2be](https://github.com/beogip/code-first-agents-tool/commit/b72e2beaec3812da17511ca46cbd59f5590e8028))
* trigger first automated release ([17e6cdd](https://github.com/beogip/code-first-agents-tool/commit/17e6cdd9504c9f3f8932317b8730d5474b7080fe))

## [0.1.0](https://github.com/beogip/code-first-agents-tool/commits/v0.1.0) (2026-05-24)

Initial release of `@code-first-agents/tool` — the TypeScript implementation of the
[Code-First Agents](https://code-first-agents.com/patterns/deterministic-tools.html) pattern. It
provides the `Tool` base class for building deterministic CLI tools that LLM agents can discover,
validate, and invoke with zero guesswork.

### Features

* **`Tool` base class** — register subcommands (`.subcommand()`) with Zod input/output schemas, then
  dispatch from the CLI via `.run(argv)` — which always exits 0 — or call `.invoke(name, args)` for
  in-process use, which returns the result envelope without exiting.
* **Typed output levels (L1/L2/L3)** — `l1Output` (raw data fields), `l2Output` (requires a
  `classification` enum), and `l3Output` (adds a required `instructions` string) helpers, each baking
  the `{ ok, message }` envelope for the output spectrum.
* **Self-describing introspection** — auto-registered `schema` (JSON Schema for every subcommand) and
  `help` builtins; neither is user-overridable.
* **Always-exit-0 semantics** — every path, including errors, exits 0 and reports status via an
  `ok: false` JSON envelope (`unknown_subcommand`, `input_validation_error`, `schema_violation`,
  `non_object_return`, `unexpected_error`); handlers throw `ToolError` for domain-specific codes.
* **Zod v4 schema validation** — input/output validated on every call; `.strict()` input schemas
  reject unknown flags. Requires the `zod@^4` peer dependency; developed and tested on Bun >= 1.2.
