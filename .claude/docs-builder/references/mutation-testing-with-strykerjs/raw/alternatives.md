# Alternatives to Mutation Testing

## Property-based testing: fast-check

fast-check is a PBT framework for JavaScript/TypeScript. Instead of checking test quality (mutation testing), it explores the input space exhaustively by generating thousands of random inputs and verifying invariants hold.

Install: `npm install --save-dev fast-check`
Works inside any Vitest test — just use `fc.assert(fc.property(...))`.

### What it catches

- Edge cases you never thought to try (Unicode, empty strings, very large numbers, NaN, null)
- JavaScript type coercion surprises (NaN is typeof "number", 0 === -0, etc.)
- Race conditions (fc has an async model-based testing mode)
- Parser/formatter roundtrip failures (encode → decode → encode = original)
- Validator logic gaps (valid inputs that get rejected, invalid inputs that slip through)
- Off-by-one boundary conditions

### What it does NOT catch

- Weak assertions in existing tests (that's mutation testing's job)
- Missing test cases for known scenarios (use example-based tests for those)
- UI rendering correctness (it's a logic tool, not a DOM tool)

### Where it shines for this codebase

Best targets: `src/utils/insightParser.js`, `src/utils/wordTiming.js`, `src/utils/audioWordTiming.js`, `src/utils/transliterate.js` (Arabic text edge cases!), `src/utils/filterPoems.js`, `src/utils/jsonRepair.js`.

Example for transliterate:

```js
import fc from 'fast-check';
import { transliterate } from '../utils/transliterate';

test('transliterate never throws on any Arabic string', () => {
  fc.assert(
    fc.property(fc.string({ unit: 'grapheme', minLength: 0, maxLength: 200 }), (s) => {
      expect(() => transliterate(s)).not.toThrow();
    })
  );
});
```

### Speed

Runs fast — 100–1000 examples per property by default, takes milliseconds per property. Total addition to test suite is usually < 5 seconds. CI-safe on every commit.

### Tradeoffs

- You have to think about and write the properties (harder than mutation testing which requires nothing new)
- Non-deterministic failures by default — fast-check seeds runs so failures are replayable but the first failure may differ between machines
- Properties for UI code are hard to express meaningfully

## Snapshot testing drift

Jest/Vitest snapshot tests (`.toMatchSnapshot()`) catch unexpected rendering changes but have a known failure mode: developers auto-update snapshots without reviewing them (`--updateSnapshot`), causing drift where the snapshots no longer mean anything.

This is a human process problem more than a tooling one. Mutation testing can expose it indirectly — if snapshot tests are the only thing covering a component, and they survive mutations (because they're too coarse-grained to kill logic mutants), that's a signal the snapshots aren't asserting behavior.

This codebase appears to use RTL's `screen.getBy*` queries rather than raw snapshots — a better pattern that's more mutation-resilient.

## Coverage analysis (what it misses)

Coverage thresholds (currently 35% statements, 25% branches in this project) tell you lines were executed, not that they were tested. Classic example:

```js
function isAdult(age) {
  return age >= 18; // covered!
}
test('works', () => {
  isAdult(25); // executes the line, no assertion
});
```

This shows 100% coverage. Mutation testing would generate `age > 18`, `age >= 17`, etc. — the test would pass all of them (survived mutants), revealing the assertion is missing.

## Sources consulted

- https://fast-check.dev/
- https://github.com/dubzzz/fast-check
- https://dev.to/tobiastimm/property-based-testing-with-react-and-fast-check-3dce
- https://medium.com/@boxed/mutation-vs-property-based-testing-4c788b06f665
- https://www.howtogeek.com/how-i-rapidly-generate-thousands-of-tests-to-catch-stealthy-bugs/
