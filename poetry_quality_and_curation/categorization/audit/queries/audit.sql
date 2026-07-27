-- Categorization audit — READ-ONLY diagnostic queries.
-- Reproduces the numbers in ideas/categorization-audit.md against the live corpus.
-- Run:  psql "$DATABASE_URL" -f audit.sql
-- SELECT-only. Nothing here writes.

\echo '== 1. Corpus totals + coverage =='
SELECT
  count(*)                                                              AS total_poems,
  count(*) FILTER (WHERE content IS NOT NULL AND content <> '')         AS with_content,
  count(*) FILTER (WHERE content IS NULL OR content = '')               AS empty_content,
  count(*) FILTER (WHERE categorized_at IS NOT NULL)                    AS categorized_at_set,
  count(*) FILTER (WHERE categories IS NOT NULL)                        AS jsonb_set
FROM poems;

\echo '== 2. Uncategorized poems that DO have content (the real coverage gap) =='
SELECT id, left(title, 40) AS title, length(content) AS content_len
FROM poems
WHERE content IS NOT NULL AND content <> '' AND categorized_at IS NULL
ORDER BY id
LIMIT 20;

\echo '== 3. Poems with >=1 poem_categories row + total links =='
SELECT
  (SELECT count(DISTINCT poem_id) FROM poem_categories) AS poems_with_links,
  (SELECT count(*)                FROM poem_categories) AS total_links;

\echo '== 4. Per-dimension coverage (poems with >=1 value in each dimension) =='
-- motif deliberately lags mood/topic: motif is OPTIONAL (0-N) by taxonomy design.
SELECT d.key AS dimension, count(DISTINCT pc.poem_id) AS poems_with_dim
FROM poem_categories pc
JOIN category_values v      ON pc.value_id = v.id
JOIN category_dimensions d  ON v.dimension_id = d.id
GROUP BY d.key
ORDER BY d.key;

\echo '== 5. Categorized poems MISSING each dimension (motif misses are by design) =='
WITH cat AS (SELECT id FROM poems WHERE categorized_at IS NOT NULL),
dims AS (
  SELECT pc.poem_id, d.key AS dim
  FROM poem_categories pc
  JOIN category_values v     ON pc.value_id = v.id
  JOIN category_dimensions d ON v.dimension_id = d.id
)
SELECT
  (SELECT count(*) FROM cat) AS categorized_poems,
  (SELECT count(*) FROM cat WHERE id NOT IN (SELECT poem_id FROM dims WHERE dim='mood'))  AS missing_mood,
  (SELECT count(*) FROM cat WHERE id NOT IN (SELECT poem_id FROM dims WHERE dim='topic')) AS missing_topic,
  (SELECT count(*) FROM cat WHERE id NOT IN (SELECT poem_id FROM dims WHERE dim='motif')) AS missing_motif;

\echo '== 6. JSONB cache vs normalized table consistency (expect all zeros) =='
SELECT
  count(*) FILTER (WHERE categorized_at IS NOT NULL AND id NOT IN (SELECT poem_id FROM poem_categories)) AS catAt_but_no_links,
  count(*) FILTER (WHERE categorized_at IS NULL     AND id     IN (SELECT poem_id FROM poem_categories)) AS links_but_no_catAt,
  count(*) FILTER (WHERE categories IS NOT NULL     AND id NOT IN (SELECT poem_id FROM poem_categories)) AS jsonb_but_no_links
FROM poems;

\echo '== 7. OVER-TAGGING: labels-per-dimension distribution =='
WITH pd AS (
  SELECT pc.poem_id, d.key AS dim, count(*) AS n
  FROM poem_categories pc
  JOIN category_values v     ON pc.value_id = v.id
  JOIN category_dimensions d ON v.dimension_id = d.id
  GROUP BY pc.poem_id, d.key
)
SELECT dim,
  round(avg(n), 2) AS avg_labels, min(n) AS min, max(n) AS max,
  count(*) FILTER (WHERE n = 1)  AS poems_1,
  count(*) FILTER (WHERE n = 2)  AS poems_2,
  count(*) FILTER (WHERE n = 3)  AS poems_3,
  count(*) FILTER (WHERE n >= 4) AS poems_4plus
FROM pd GROUP BY dim ORDER BY dim;

\echo '== 8. OVER-TAGGING: total labels per poem (all dimensions) =='
WITH t AS (SELECT poem_id, count(*) n FROM poem_categories GROUP BY poem_id)
SELECT round(avg(n), 2) AS avg_total, min(n) AS min, max(n) AS max,
  count(*) FILTER (WHERE n >= 8)  AS poems_8plus,
  count(*) FILTER (WHERE n >= 10) AS poems_10plus
FROM t;

\echo '== 9. Filters barely discriminate: value prevalence (% of categorized poems) =='
-- Any value on >40% of poems is a near-useless discovery filter.
WITH cat AS (SELECT count(*) n FROM poems WHERE categorized_at IS NOT NULL)
SELECT d.key AS dim, v.key AS value, v.label_en,
  count(DISTINCT pc.poem_id) AS poems,
  round(100.0 * count(DISTINCT pc.poem_id) / (SELECT n FROM cat), 1) AS pct
FROM poem_categories pc
JOIN category_values v     ON pc.value_id = v.id
JOIN category_dimensions d ON v.dimension_id = d.id
GROUP BY d.key, v.key, v.label_en
ORDER BY poems DESC
LIMIT 20;

\echo '== 10. Synonym stacking: top co-occurring MOOD pairs =='
WITH m AS (
  SELECT pc.poem_id, v.key
  FROM poem_categories pc
  JOIN category_values v     ON pc.value_id = v.id
  JOIN category_dimensions d ON v.dimension_id = d.id
  WHERE d.key = 'mood'
)
SELECT a.key || ' + ' || b.key AS pair, count(*) AS n
FROM m a JOIN m b ON a.poem_id = b.poem_id AND a.key < b.key
GROUP BY 1 ORDER BY n DESC LIMIT 15;

\echo '== 11. Synonym stacking: sadness + desire family redundancy =='
WITH sad AS (
  SELECT pc.poem_id, count(*) n
  FROM poem_categories pc
  JOIN category_values v     ON pc.value_id = v.id
  JOIN category_dimensions d ON v.dimension_id = d.id
  WHERE d.key = 'mood' AND v.key IN ('melancholy','grief','despair','bittersweet')
  GROUP BY pc.poem_id
),
des AS (
  SELECT pc.poem_id, count(*) n
  FROM poem_categories pc
  JOIN category_values v     ON pc.value_id = v.id
  JOIN category_dimensions d ON v.dimension_id = d.id
  WHERE d.key = 'mood' AND v.key IN ('amorous','passion','yearning')
  GROUP BY pc.poem_id
)
SELECT
  (SELECT count(*) FROM sad WHERE n >= 2) AS sadness_2plus,
  (SELECT count(*) FROM sad WHERE n >= 3) AS sadness_3plus,
  (SELECT count(*) FROM des WHERE n >= 2) AS desire_2plus,
  (SELECT count(*) FROM des WHERE n  = 3) AS desire_all3;

\echo '== 12. Confidence distribution (headroom for a floor at ~65-70) =='
SELECT
  count(*)                                                     AS total,
  count(*) FILTER (WHERE confidence IS NULL)                   AS null_conf,
  count(*) FILTER (WHERE confidence < 50)                      AS lt50,
  count(*) FILTER (WHERE confidence >= 50 AND confidence < 70) AS c50_70,
  count(*) FILTER (WHERE confidence >= 70 AND confidence < 85) AS c70_85,
  count(*) FILTER (WHERE confidence >= 85)                     AS c85plus,
  round(avg(confidence), 1)                                    AS avg_conf
FROM poem_categories;

\echo '== 13. DISTILLATION projection: prune to top-2 per dim by confidence =='
-- Deterministic lower bound on the fix (no re-classification): shows link volume drop.
WITH ranked AS (
  SELECT pc.poem_id, d.key AS dim, pc.confidence,
         row_number() OVER (PARTITION BY pc.poem_id, d.key
                            ORDER BY pc.confidence DESC NULLS LAST) AS rn
  FROM poem_categories pc
  JOIN category_values v     ON pc.value_id = v.id
  JOIN category_dimensions d ON v.dimension_id = d.id
)
SELECT
  (SELECT count(*) FROM poem_categories)                                           AS current_links,
  count(*) FILTER (WHERE rn <= 2)                                                   AS cap_2_2_2_links,
  count(*) FILTER (WHERE rn <= 2 AND (confidence IS NULL OR confidence >= 70))      AS cap_2_2_2_floor70_links
FROM ranked;
