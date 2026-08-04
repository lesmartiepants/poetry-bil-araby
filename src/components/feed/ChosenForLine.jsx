/**
 * "chosen for الحب والهوى" — a quiet note under the poet on a STRONG match.
 *
 * The design decision worth protecting here is what this component does on a
 * weak match: nothing at all. Not a muted version, not "a wider pick", nothing.
 *
 * Under scoring, a poem the reader did not ask for turning up is the feature
 * working — the unanchored candidate page is what keeps the whole corpus
 * reachable. But a surprise that announces itself has stopped being a surprise,
 * and labelling those draws would turn a discovery into a system disclosure.
 * The reader gets told when the app clearly listened, and is left alone
 * otherwise.
 *
 * `attribution` is null below ATTRIBUTION_RATIO, which is where that threshold
 * is enforced; this component just declines to render when there is nothing to
 * say. One reason, never a list — the full breakdown is the debug panel's job.
 *
 * Arabic-primary, matching the rest of the reader chrome: the taxonomy label
 * reads in Arabic at full size with the English underneath it, and the whole
 * line scales with the reader's text-size setting rather than sitting at a fixed
 * pixel size next to type the reader has scaled up.
 */

const ChosenForLine = ({ draw, scale = 1 }) => {
  const attribution = draw?.attribution;
  if (!attribution) return null;

  return (
    <div
      data-testid="chosen-for"
      data-attribution-dim={attribution.dim}
      data-attribution-key={attribution.key}
      dir="rtl"
      style={{
        marginTop: 7,
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.4rem',
        // Sits below the poet, so it must read as an aside rather than as
        // another line of the poem's identity.
        opacity: 0.52,
        animation: 'chosenForFade 1.1s ease .35s both',
      }}
    >
      <span
        lang="ar"
        style={{
          fontFamily: "'Tajawal', sans-serif",
          fontSize: `calc(clamp(0.72rem, 2.9vw, 0.86rem) * ${scale})`,
          color: 'rgba(197,160,89,0.92)',
          fontWeight: 500,
        }}
      >
        اختيرت لك: {attribution.label_ar}
      </span>
      <span
        dir="ltr"
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: `calc(clamp(0.62rem, 2.4vw, 0.72rem) * ${scale})`,
          color: 'rgba(255,255,255,0.42)',
          letterSpacing: '0.03em',
        }}
      >
        chosen for {attribution.label_en}
      </span>
    </div>
  );
};

export default ChosenForLine;
