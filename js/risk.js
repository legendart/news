const HIGH_KEYWORDS = [
  'war', 'conflict', 'sanctions', 'crisis', 'emergency',
  'attack', 'nuclear', 'missile', 'invasion', 'bombing',
  'explosion', 'terror', 'assassination', 'coup', 'genocide',
  'catastrophe', 'collapse', 'meltdown', 'outbreak', 'pandemic',
];

const MED_KEYWORDS = [
  'tension', 'protest', 'inflation', 'recession', 'tariff',
  'trade war', 'dispute', 'threat', 'warning', 'concern',
  'uncertainty', 'volatile', 'escalation', 'sanctions',
  'embargo', 'shutdown', 'default', 'deficit', 'instability',
];

/**
 * @param {string} text
 * @returns {'HIGH'|'MED'|'LOW'}
 */
export function assessRisk(text) {
  const lower = text.toLowerCase();

  for (const kw of HIGH_KEYWORDS) {
    if (lower.includes(kw)) return 'HIGH';
  }

  for (const kw of MED_KEYWORDS) {
    if (lower.includes(kw)) return 'MED';
  }

  return 'LOW';
}

export function riskMeta(level) {
  const map = {
    HIGH: { label: 'HIGH RISK', cssClass: 'risk-high', icon: '⚠' },
    MED:  { label: 'MED RISK',  cssClass: 'risk-med',  icon: '◆' },
    LOW:  { label: 'LOW RISK',  cssClass: 'risk-low',  icon: '●' },
  };
  return map[level];
}
