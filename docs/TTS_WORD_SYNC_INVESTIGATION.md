# Low-Latency Arabic Word-Sync Decision Record

## Decision

The shipped Live-TTS default is **mora-weighted verse allocation after a
transcript anchor**, with the existing character-weighted clock retained while
the transcript is incomplete. This is the production equivalent of the
investigation's `transcript-moras-weighted-fallback` profile.

It preserves fast first audio: PCM is scheduled before any complete
transcript-anchored verse is available. Once an aligned verse span is known,
its words divide that observed span by tashkeel-aware mora mass.

## Measurement protocol

- Fixed reference: poem #87443, *شهادة السريرة*, seven lines.
- Gemini Live PCM is scheduled immediately; there are no provider word
  timestamps.
- The Web Audio playhead drives the displayed cursor.
- Each POC run records audio and visual highlights in one stream.
- Google Chirp 3 provides post-run timestamps for audit only.
- The broad screen contains one fresh delivery for each of 21 surviving voices
  and 13 methods (273 audited captures). Generated delivery varies, so the
  matrix is a screen, not proof of per-voice reliability.

## Method ranking

| Rank | Method | Mean audit quality |
| ---: | --- | ---: |
| 1 | Full mora + weighted pre-anchor fallback | **67.3** |
| 2 | 75% mora blend | 66.0 |
| 3 | Full mora | 65.6 |
| 4 | Transcript letters | 62.5 |
| 5 | 25% mora blend | 62.4 |
| 6 | 50/50 mora + weighted fallback | 62.1 |
| 7 | Verse-final mora | 58.9 |
| 8 | Transcript even | 51.8 |
| 9 | Character-weighted baseline | 49.5 |
| 10 | Verse-local clock | 49.2 |
| 11 | Agreement window | 47.2 |
| 12 | VAD phase-lock | 46.5 |
| 13 | Acoustic nucleus clock | 34.3 |

The first seven remain active investigation candidates. The lower six are
archived, not deleted: their recordings and immutable reports remain available
in the POC Runs viewer for comparison.

## Voice portfolio

`Default` is the shipped mora + weighted-fallback score. `Rescue` records the
strongest one-run alternative from the screen; it is a repeat-test candidate,
not a per-voice production rule.

| Voice | Default | Best screened rescue | Catalog status |
| --- | ---: | --- | --- |
| Pulcherrima | 88.5 | letters 76.3 | active |
| Iapetus | 86.0 | 75% mora 86.0 | active |
| Aoede | 84.9 | 25% mora 86.3 | active |
| Algenib | 84.4 | 50/50 fallback 86.3 | active |
| Autonoe | 84.2 | letters 76.9 | active |
| Vindemiatrix | 80.6 | full mora 88.0 | active |
| Enceladus | 80.6 | letters 84.2 | active |
| Laomedeia | 80.1 | 50/50 fallback 84.8 | active |
| Zephyr | 78.9 | letters 83.5 | active |
| Algieba | 77.4 | full mora 85.1 | active |
| Zubenelgenubi | 75.7 | full/75% mora 82.8 | active |
| Orus | 75.4 | letters 70.1 | active |
| Alnilam | 70.6 | 50/50 fallback 84.9 | active |
| Sulafat | 59.2 | letters 77.6 | active |
| Charon | 53.8 | full mora 83.5 | active; 50/50 repeat mean 87.2, floor 85.1 |
| Achernar | 49.7 | 50/50 fallback 87.6 | archived pending repeat |
| Leda | 48.5 | 25% mora 88.5 | archived pending repeat |
| Puck | 46.7 | 75% mora 86.8 | archived pending repeat |
| Callirrhoe | 39.0 | 50/50 fallback 79.3 | archived pending repeat |
| Despina | 35.1 | letters/final mora 73.5 | archived pending repeat |
| Rasalgethi | 34.4 | 25% mora 84.7 | archived pending repeat |

The six archived low-default voices are deliberately kept as comments in the
catalog. They are not declared intrinsically poor: each has a promising rescue
profile, which must clear a 3–5-run repeat screen before reactivation.

## Rejected and UX-only work

- **Nucleus clock:** rejected. It kept first audio fast but mapped causal energy
  peaks to Arabic words poorly (34.3 mean).
- **VAD / verse / agreement clocks:** retained as evidence only; none improved
  the baseline globally.
- **Progressive certainty overlay:** UX-only. It contextualizes the current and
  upcoming line but does not claim more accurate word timing; judge it with
  blinded reader preference testing.

## CTC lag-align stub: deferred, gated spike

The only high-upside unimplemented direction is a local Arabic CTC forced-
alignment sidecar. It would tee already-scheduled PCM, resample it to 16 kHz,
align a bounded known-text window, and use only confident *past* lexical
anchors to adjust words that have not appeared yet. It must never delay first
audio, move the cursor backward, or publish a word after it is audible.

```text
scheduled 24 kHz PCM
  ├─ Web Audio + current fallback/mora cursor
  └─ optional CTC sidecar
       → 16 kHz resample + sample-time map
       → overlapping CTC emissions and constrained trellis
       → high-confidence committed lexical anchor
       → bounded correction of future words only
```

Do not implement the sidecar until it clears all gates:

1. 100% normalized poem-token coverage by the selected Arabic model;
2. offline monotonic alignment on at least six Gemini captures, with median
   start error at or below 120 ms and P90 at or below 250 ms against Chirp;
3. a 1.5–2 s overlapping window completes at P95 at or below 300 ms without a
   growing queue;
4. committed anchors arrive within 750 ms of their audio time;
5. first audible audio regresses by no more than 50 ms at P95; and
6. six paired live batches improve median displayed offset by at least 40 ms
   and 15% without a P90 regression or highlight reversal.

The candidate model is heavyweight and not proven causal for this use. Treat
this as a documented interface and exit criterion, not as a runtime dependency.
