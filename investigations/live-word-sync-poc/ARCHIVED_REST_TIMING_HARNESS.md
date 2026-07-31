# Archived REST Timing Harness

On 2026-06-28, a separate local harness generated two qualitative REST-TTS captures (Charon and
Kore) and displayed text-only timing schedules beside them. It is intentionally superseded by this
POC and is not part of a PR.

Why it was not promoted:

- the real captures had no forced-alignment or other ground truth, so only the synthetic demo could
  be scored;
- it read a client-style key from a hard-coded local `.env` path and used a stale REST model;
- its app capture hook duplicated the POC's stronger same-stream recording, Chirp audit, Runs
  viewer, and replay workflow;
- embedded base64 audio makes the captures unsuitable for source control.

If the audible samples are wanted later, retain them only under this POC's ignored `artifacts/`
directory, labeled as qualitative historical material. A future production-QA capture feature must
use the backend configuration, an explicit reproducibility manifest, and the POC's audited capture
contract rather than reviving this code.
