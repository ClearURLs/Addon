Run `node --test tests/*.test.cjs tests/*.regressions.cjs` for the full test suite.
The catalog tests use original modules, real provider initialization and the pinned
public fixture. Browser APIs and the catalog download are replaced at the external interface.

The Core exporter verifies the existing utilities without rewriting them; see
the Core project's `BUILDING.md`. Do not edit generated utilities by hand.
