// Weighted keyword scoring for stock-market impact (English + Korean).
// Score is capped at 100. 70+ = HIGH, 40-69 = MED, 0-39 = LOW.

const KEYWORDS = [
  // ── Financial / market direct shock ───────────────────────────────────
  ['market crash',     20], ['financial crisis', 20], ['bank run',    20],
  ['currency crisis',  20], ['credit default',   20], ['debt ceiling', 18],
  ['stock market',     18], ['bankruptcy',        18], ['recession',   18],
  ['fed rate',         16], ['default',           16], ['bond yield',  15],
  ['rate hike',        15], ['interest rate',     15], ['inflation',   14],
  ['yield',            12], ['bond',              10], ['stock',       10],

  // ── Geopolitical risk ─────────────────────────────────────────────────
  ['nuclear',          15], ['invasion',          15], ['civil war',   15],
  ['terrorism',        14], ['coup',              14], ['assassination', 13],
  ['war',              13], ['sanctions',         13], ['missile',     13],
  ['conflict',         12], ['attack',            11], ['bombing',     12],

  // ── Supply chain / energy ─────────────────────────────────────────────
  ['oil price',        12], ['energy crisis',     12], ['trade war',   12],
  ['supply chain',     11], ['chip shortage',     11], ['embargo',     11],
  ['tariff',           10], ['oil',                8],

  // ── Political / policy uncertainty ────────────────────────────────────
  ['impeachment',       8], ['protest',            7], ['election',     6],
  ['regulation',        6], ['tension',            6], ['uncertainty',  5],

  // ── Korean: 금융/시장 충격 ──────────────────────────────────────────────
  ['금융위기',          20], ['주가폭락',           20], ['경기침체',   18],
  ['파산',              18], ['부도',               16], ['금리인상',   15],
  ['기준금리',          14], ['인플레이션',         14], ['금리',       13],
  ['물가급등',          12], ['채권',               10],

  // ── Korean: 지정학적 리스크 ───────────────────────────────────────────
  ['핵무기',            15], ['침공',               15], ['내전',       15],
  ['쿠데타',            14], ['테러',               14], ['암살',       13],
  ['전쟁',              13], ['제재',               13], ['미사일',     13],
  ['분쟁',              12], ['폭격',               12], ['핵',         11],

  // ── Korean: 공급망/에너지 ─────────────────────────────────────────────
  ['유가급등',          12], ['에너지위기',         12], ['무역전쟁',   12],
  ['공급망',            11], ['반도체부족',         11], ['수출규제',   11],
  ['관세',              10], ['유가',                9],

  // ── Korean: 정치/정책 불확실성 ────────────────────────────────────────
  ['탄핵',               8], ['시위',                7], ['선거',        6],
  ['규제',               6], ['긴장',                6], ['불확실',      5],
];

/**
 * Score title + summary text (do not pass full body — adds noise).
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
 * @returns {{ cssClass: string }}
 */
export function riskMeta(score) {
  if (score >= 70) return { cssClass: 'risk-high' };
  if (score >= 40) return { cssClass: 'risk-med'  };
  return               { cssClass: 'risk-low'  };
}
