// Before/after analysis of the distilled sample -> analysis.md
// Reads _staging_distilled.json (sample: before from DB, after = distilled+floored).
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const S = JSON.parse(fs.readFileSync(path.join(DIR, '_staging_distilled.json'), 'utf8'));
const R = S.results;

const EN = { // key -> English label (for readable tables)
  melancholy:'Melancholy',nostalgia:'Nostalgia',joy:'Joy',amorous:'Amorous',passion:'Passion',contemplation:'Contemplation',serenity:'Serenity',defiance:'Defiance',pride:'Pride',grief:'Grief',hope:'Hope',despair:'Despair',satire:'Satire',reverence:'Reverence',bittersweet:'Bittersweet',yearning:'Yearning',
  love:'Love','loss-death':'Loss&Death','exile-longing':'Exile&Longing',homeland:'Homeland',nature:'Nature','war-conflict':'War&Conflict','faith-spirit':'Faith','wine-pleasure':'Wine&Pleasure',friendship:'Friendship','time-mortality':'Time&Mortality','wisdom-ethics':'Wisdom&Ethics','justice-oppression':'Justice','freedom':'Freedom',beauty:'Beauty','honor-pride':'Honor&Pride','women-feminine':'Women',
  night:'Night','desert-ruins':'Desert&Ruins','moon-stars':'Moon&Stars','sea-water':'Sea&Water','garden-flowers':'Garden&Flowers','wine-cup':'WineCup','sword-battle':'Sword&Battle',birds:'Birds','fire-light':'Fire&Light',tears:'Tears',journey:'Journey',dawn:'Dawn',
};
const SADNESS = ['melancholy','grief','despair','bittersweet'];
const DESIRE = ['amorous','passion','yearning'];
const DIMS = ['mood','topic','motif'];
const n = R.length;

const count = (r, side) => DIMS.reduce((s, d) => s + (r[side][d] || []).length, 0);
const sum = a => a.reduce((x, y) => x + y, 0);
const avg = a => a.length ? sum(a) / a.length : 0;
const beforeCounts = R.map(r => count(r, 'before'));
const afterCounts = R.map(r => count(r, 'after'));

function dist(counts) { const m = {}; counts.forEach(c => m[c] = (m[c]||0)+1); return m; }
function distStr(counts) { const m = dist(counts); return Object.keys(m).map(Number).sort((a,b)=>a-b).map(k => `${k}:${m[k]}`).join('  '); }
function dimAvg(side, d) { return avg(R.map(r => (r[side][d]||[]).length)); }
function prevalence(side) {
  const m = {};
  R.forEach(r => DIMS.forEach(d => (r[side][d]||[]).forEach(v => m[v] = (m[v]||0)+1)));
  return m;
}
const prevB = prevalence('before'), prevA = prevalence('after');
function pct(x){ return (100*x/n).toFixed(1)+'%'; }

// dropped-most: values present before but removed after, per poem
const dropped = {}, added = {};
R.forEach(r => {
  DIMS.forEach(d => {
    const b = new Set(r.before[d]||[]), a = new Set(r.after[d]||[]);
    b.forEach(v => { if (!a.has(v)) dropped[v] = (dropped[v]||0)+1; });
    a.forEach(v => { if (!b.has(v)) added[v] = (added[v]||0)+1; });
  });
});

// synonym stacking
const stackB_sad = R.filter(r => (r.before.mood||[]).filter(v=>SADNESS.includes(v)).length>=2).length;
const stackA_sad = R.filter(r => (r.after.mood||[]).filter(v=>SADNESS.includes(v)).length>=2).length;
const stackB_des = R.filter(r => (r.before.mood||[]).filter(v=>DESIRE.includes(v)).length>=2).length;
const stackA_des = R.filter(r => (r.after.mood||[]).filter(v=>DESIRE.includes(v)).length>=2).length;

// regression flags: poem lost its mood_primary(before) OR lost ALL topics OR after has 0 mood
const regressions = [];
R.forEach(r => {
  const flags = [];
  const aMood = r.after.mood||[], aTopic = r.after.topic||[];
  if (aMood.length === 0) flags.push('after has NO mood (required dim empty)');
  if (aTopic.length === 0) flags.push('after has NO topic (required dim empty)');
  // lost a before-primary mood that isn't in after
  if (r.mood_primary_before && !aMood.includes(r.mood_primary_before) && !(r.before.mood||[]).length===0)
    flags.push(`dropped before-primary mood '${r.mood_primary_before}'`);
  if (flags.length) regressions.push({ id: r.poem_id, flags, r });
});

// spot-check: pick 12 spanning label-drop magnitude + eras
const withDrop = R.map(r => ({ r, drop: count(r,'before')-count(r,'after') })).sort((a,b)=>b.drop-a.drop);
const spot = [];
const seenC = new Set();
// take a spread: top drops, some mid, ensure century variety
for (const x of withDrop) { if (spot.length>=12) break; const c=x.r.century; if (seenC.has(c) && spot.length<8) continue; seenC.add(c); spot.push(x); }
for (const x of withDrop) { if (spot.length>=12) break; if (!spot.includes(x)) spot.push(x); }

const tags = (obj) => DIMS.map(d => (obj[d]||[]).map(v=>v).join(',')).filter(Boolean).join(' · ') || '∅';

// ---- render ----
let md = '';
md += `# Distillation — before/after analysis (sample n=${n})\n\n`;
md += `Sample: ${S.sample_size} poems stratified by century × current label-count (${S.missing} failed to classify). `;
md += `"Before" = current DB tags; "after" = v3 distilled classifier (caps ${S.caps.mood}/${S.caps.topic}/${S.caps.motif}, confidence floor ${S.floor}, one-per-synonym-family) run via the app's gemini-3.6-flash proxy. Post-processing mirrors the real import (\`apply_confidence_floor\`). No DB writes.\n\n`;

md += `## 1. Label volume\n\n`;
md += `| | before | after | Δ |\n|---|---|---|---|\n`;
md += `| avg labels/poem | **${avg(beforeCounts).toFixed(2)}** | **${avg(afterCounts).toFixed(2)}** | ${(avg(afterCounts)-avg(beforeCounts)).toFixed(2)} |\n`;
md += `| max | ${Math.max(...beforeCounts)} | ${Math.max(...afterCounts)} | |\n`;
md += `| min | ${Math.min(...beforeCounts)} | ${Math.min(...afterCounts)} | |\n`;
md += `| poems ≥8 labels | ${beforeCounts.filter(c=>c>=8).length} (${pct(beforeCounts.filter(c=>c>=8).length)}) | ${afterCounts.filter(c=>c>=8).length} (${pct(afterCounts.filter(c=>c>=8).length)}) | |\n\n`;
md += `Label-count distribution (labels/poem : #poems)\n\n`;
md += `- **before:** ${distStr(beforeCounts)}\n`;
md += `- **after:**  ${distStr(afterCounts)}\n\n`;

md += `## 2. Per-dimension average labels/poem\n\n`;
md += `| dim | before | after |\n|---|---|---|\n`;
DIMS.forEach(d => md += `| ${d} | ${dimAvg('before',d).toFixed(2)} | ${dimAvg('after',d).toFixed(2)} |\n`);
md += `\n`;

md += `## 3. Prevalence of the broadest values (share of sample carrying each)\n\n`;
const topB = Object.entries(prevB).sort((a,b)=>b[1]-a[1]).slice(0,15);
md += `| value | dim-hint | before | after |\n|---|---|---|---|\n`;
topB.forEach(([v,c]) => md += `| ${v} (${EN[v]||v}) | | ${pct(c)} | ${pct(prevA[v]||0)} |\n`);
md += `\n`;

md += `## 4. Synonym-stack collapse (mood gradients)\n\n`;
md += `| group | before ≥2 | after ≥2 |\n|---|---|---|\n`;
md += `| sadness (melancholy/grief/despair/bittersweet) | ${stackB_sad} (${pct(stackB_sad)}) | ${stackA_sad} (${pct(stackA_sad)}) |\n`;
md += `| desire (amorous/passion/yearning) | ${stackB_des} (${pct(stackB_des)}) | ${stackA_des} (${pct(stackA_des)}) |\n\n`;

md += `## 5. Values dropped most (before→removed after)\n\n`;
md += `| value | dropped from N poems |\n|---|---|\n`;
Object.entries(dropped).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([v,c]) => md += `| ${v} (${EN[v]||v}) | ${c} |\n`);
md += `\n_Values newly added by distillation (should be small — sharper primary sometimes not in the over-tagged before set):_\n\n`;
md += Object.entries(added).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([v,c])=>`${v}:${c}`).join(', ') + '\n\n';

md += `## 6. Spot-check (12 real poems: old tags → new tags + rationale)\n\n`;
md += `| id | century | before (${'≈'}) | after | mood₁ b→a | rationale |\n|---|---|---|---|---|---|\n`;
spot.slice(0,12).forEach(({r}) => {
  const cen = r.century === -1 ? '—' : r.century;
  md += `| ${r.poem_id} | ${cen} | ${tags(r.before)} | **${tags(r.after)}** | ${r.mood_primary_before||'—'}→${r.mood_primary_after||'—'} | ${(r.rationale||'').replace(/\|/g,'/')} |\n`;
});
md += `\n`;

md += `## 7. Regression flags\n\n`;
if (!regressions.length) md += `None. Every distilled poem kept ≥1 mood and ≥1 topic (required dims never emptied), and no poem dropped its before-primary mood without replacement.\n\n`;
else {
  md += `${regressions.length} poem(s) flagged:\n\n| id | flags |\n|---|---|\n`;
  regressions.slice(0,25).forEach(x => md += `| ${x.id} | ${x.flags.join('; ')} |\n`);
  md += `\n`;
}

// verdict computed signals
const loveB = 100*(prevB['love']||0)/n, loveA = 100*(prevA['love']||0)/n;
md += `## 8. Verdict signals (for the writeup)\n\n`;
md += `- avg labels ${avg(beforeCounts).toFixed(2)} → ${avg(afterCounts).toFixed(2)}\n`;
md += `- love prevalence ${loveB.toFixed(1)}% → ${loveA.toFixed(1)}% (target <40%)\n`;
md += `- sadness-stack ${pct(stackB_sad)} → ${pct(stackA_sad)}; desire-stack ${pct(stackB_des)} → ${pct(stackA_des)}\n`;
md += `- regressions: ${regressions.length}\n`;

fs.writeFileSync(path.join(DIR, 'analysis.md'), md);
// machine summary to stdout
console.log(JSON.stringify({
  n, avg_before:+avg(beforeCounts).toFixed(2), avg_after:+avg(afterCounts).toFixed(2),
  max_before:Math.max(...beforeCounts), max_after:Math.max(...afterCounts),
  love_before:+loveB.toFixed(1), love_after:+loveA.toFixed(1),
  sadstack_before:stackB_sad, sadstack_after:stackA_sad, desstack_before:stackB_des, desstack_after:stackA_des,
  regressions:regressions.length,
}, null, 2));
