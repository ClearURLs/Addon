Run `node --test tests/*.test.cjs` for the normal test suite. The catalog tests
use original modules, real provider initialization and the pinned public fixture.
Browser APIs and the catalog download are replaced at the external interface.

Run `node --test tests/url-cleaning.regressions.cjs` to reproduce the known URL,
fragment, redirect and History defects. These desired-behavior assertions are
intentionally separate from the green suite until the corresponding fixes land.

The Core exporter verifies the existing utilities without rewriting them; see
the Core project's `BUILDING.md`. Do not edit generated utilities by hand.
