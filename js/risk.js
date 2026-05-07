// Weighted keyword scoring for stock-market impact.
// Each entry: [keyword, weight]. Score is capped at 100.

const KEYWORDS = [
  // ── Financial / market direct shock (weight 20) ────────────────────────
  ['market crash',     20],
  ['stock market',     18],
  ['financial crisis', 20],
  ['bank run',         20],
  ['currency crisis',  20],
  ['debt ceiling',     18],
  ['credit default',   20],
  ['bankruptcy',       18],
  ['recession',        18],
  ['fed rate',         16],
  ['interest rate',    15],
  ['rate hike',        15],
  ['inflation',        14],
  ['default',          16],
  ['bond yield',       15],
  ['yield',            12],
  ['bond',             10],
  ['stock',            10],

  // ── Geopolitical risk (weight 15) ─────────────────────────────────────
  ['nuclear',          15],
  ['invasion',         15],
  ['civil war',        15],
  ['terrorism',        14],
  ['war',              13],
  ['conflict',         12],
  ['sanctions',        13],
  ['coup',             14],
  ['missile',          13],
  ['attack',           11],
  ['bombing',          12],
  ['assassination',    13],

  // ── Supply chain / energy (weight 12) ─────────────────────────────────
  ['oil price',        12],
  ['energy crisis',    12],
  ['supply chain',     11],
  ['chip shortage',    11],
  ['trade war',        12],
  ['tariff',           10],
  ['embargo',          11],
  ['oil',               8],

  // ── Political / policy uncertainty (weight 8) ──────────────────────────
  ['impeachment',       8],
  ['protest',           7],
  ['regulation',        6],
  ['election',          6],
  ['tension',           6],
  ['uncertainty',       5],
];

/**
 * Score text against the keyword table.
 * Only title + trailText should be passed (bodyText adds noise).
 * @param {string} text
 * @returns {number} 0–100
 */
export function scoreRisk(text) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const [kw, weight] of KEYWORDS) {
    if (lower.includes(kw)) score += weight;
  }
  return Math.min(score, 100);
}

/**
 * @param {number} score 0–100
 * @returns {{ label: string, cssClass: string }}
 */
export function riskMeta(score) {
  if (score >= 70) return { label: `RISK ${score}`, cssClass: 'risk-high' };
  if (score >= 40) return { label: `RISK ${score}`, cssClass: 'risk-med'  };
  return               { label: `RISK ${score}`, cssClass: 'risk-low'  };
}
