# Untested Word-Sync Hypotheses

These are research briefs, not results. Each must become one named POC profile, run beside the
production control on poem #87443, and pass the recorded Chirp audit before it is treated as
evidence.

| Hypothesis                                   | Mechanism                                                                                                                                                               | First-audio effect                                                   | Falsify                                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Adaptive jitter buffer with phrase alignment | Keep immediate PCM playback; hold a separate phrase buffer and make a small, phrase-local resampling adjustment once a phrase is observed. Re-anchor at VAD boundaries. | Potentially none for fast path; phrase refinement must not delay it. | Arabic word drift remains >200 ms despite VAD re-anchors.                               |
| Arabic prosody and orthography prior         | Give each known word a duration mass from syllable shape, madd, diacritics, shadda/sukoon, and phrase-final position before audio arrives.                              | None.                                                                | A simple character clock matches or beats it, or it is consistently >200 ms early/late. |
| Progressive certainty grouping               | Mark an upcoming phrase softly, strengthen it when imminent, and use phrase-level emphasis while word certainty is weak.                                                | None.                                                                | Readers still describe the phrase cue as jumpy or out of sync.                          |
| Predictive phrasing and micro-schedules      | Predict relative word duration within one or two buffered phrases, then schedule a new local clock at each phrase start.                                                | Must finish before a word would be spoken.                           | Most within-phrase words remain >200 ms off after phrase-start sync.                    |
| Predictive phase-locked visual clock         | Use VAD/transcript observations as a noisy reference and a stable loop filter to adjust future visual phase and rate.                                                   | None if visual-only.                                                 | The loop oscillates or produces >150 ms successive Arabic-word errors.                  |

Research leads: short-segment phase-vocoder resampling; Arabic phoneme-duration/prosody models;
perceptual grouping during reading; compact phrase-level duration prediction; and Kalman/PLL event
synchronization. Verify primary sources before implementation and never assume Gemini provides word
timestamps without a documented API guarantee.
