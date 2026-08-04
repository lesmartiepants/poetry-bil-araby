/**
 * The running total under a preference step.
 *
 * ## The honesty problem this component exists to solve
 *
 * An intersection count is NOT a promise about the feed. The feed scores every
 * candidate and samples by that score, so a poem outside this count can still
 * appear, and a poem inside it is not guaranteed to. Writing "1,240 poems in
 * your feed" over a scored draw would be false in both directions.
 *
 * So the copy says what the number actually is — "match all your choices" —
 * and the second bar is what makes the scoring legible rather than making the
 * first number look like a filter that is closing in on the reader:
 *
 *     ▓▓░░░░░░░░░░      21  match everything you chose
 *     ▓▓▓▓▓▓▓▓▓░░░   4,146  match at least one
 *
 * Both bars are drawn against the SERVABLE corpus, so the track length means
 * something fixed and the two rows are directly comparable. `servable` is the
 * count the feed can actually reach (~4,767), not the raw corpus (9,073) — see
 * the serving-predicate note on /api/categories.
 *
 * When the first number gets very small the reader is NOT being warned, because
 * nothing is going wrong: a narrow answer set biases the feed without shrinking
 * it. The second bar staying wide is what says that.
 */

const GOLD = '#c5a059';

const Bar = ({ value, total, tone }) => {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        height: 4,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.07)',
        overflow: 'hidden',
        flex: 1,
        minWidth: 60,
      }}
    >
      <div
        style={{
          position: 'absolute',
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          // A count of 21 against 4,767 is 0.44% and would render as nothing at
          // all. Floor the fill so a real, small number still reads as present
          // rather than as a bug or an empty state.
          width: `${Math.max(pct, value > 0 ? 1.5 : 0)}%`,
          background: tone,
          borderRadius: 999,
          transition: 'width .45s cubic-bezier(.2,.7,.3,1)',
        }}
      />
    </div>
  );
};

const Row = ({ value, total, labelAr, labelEn, tone, testId }) => (
  <div
    data-testid={testId}
    data-count={value}
    style={{ display: 'flex', alignItems: 'center', gap: '.6rem', width: '100%' }}
  >
    <span
      style={{
        fontVariantNumeric: 'tabular-nums',
        fontSize: '.8125rem',
        color: tone,
        minWidth: '3.4em',
        textAlign: 'end',
        fontWeight: 600,
      }}
    >
      {value.toLocaleString('en-US')}
    </span>
    <Bar value={value} total={total} tone={tone} />
    <span style={{ display: 'flex', flexDirection: 'column', minWidth: '9.5em' }}>
      <span
        lang="ar"
        dir="rtl"
        style={{
          fontFamily: "'Tajawal', sans-serif",
          fontSize: '.75rem',
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.3,
        }}
      >
        {labelAr}
      </span>
      <span style={{ fontSize: '.625rem', color: 'rgba(255,255,255,0.3)' }}>{labelEn}</span>
    </span>
  </div>
);

const MatchTally = ({ scope, loading = false }) => {
  // Nothing answered yet (or a server predating the scoped counts) — say
  // nothing rather than render a bar at 100%, which would be meaningless.
  if (!scope || !scope.servable) return null;

  const { total = 0, totalAny = 0, servable } = scope;

  return (
    <div
      data-testid="onboarding-tally"
      data-total={total}
      data-total-any={totalAny}
      data-servable={servable}
      dir="rtl"
      style={{
        marginTop: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '.45rem',
        width: '100%',
        maxWidth: 420,
        marginInline: 'auto',
        opacity: loading ? 0.4 : 1,
        transition: 'opacity .25s ease',
      }}
    >
      <Row
        testId="onboarding-tally-all"
        value={total}
        total={servable}
        tone={GOLD}
        labelAr="تطابق كل اختياراتك"
        labelEn="match all your choices"
      />
      <Row
        testId="onboarding-tally-any"
        value={totalAny}
        total={servable}
        tone="rgba(255,255,255,0.45)"
        labelAr="تطابق واحداً منها على الأقل"
        labelEn="match at least one"
      />
      <p
        style={{
          fontSize: '.625rem',
          color: 'rgba(255,255,255,0.26)',
          lineHeight: 1.45,
          margin: 0,
          textAlign: 'center',
        }}
      >
        <span lang="ar" dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif" }}>
          اختياراتك ترجّح ما تقرأ، ولا تحجب عنك شيئاً من {servable.toLocaleString('en-US')} قصيدة.
        </span>
        <br />
        <span dir="ltr">
          Your answers weight the feed — none of the {servable.toLocaleString('en-US')} poems are
          ruled out.
        </span>
      </p>
    </div>
  );
};

export default MatchTally;
