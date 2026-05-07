// ── Guardian (English) ─────────────────────────────────────────────────────
const GUARDIAN_BASE = 'https://content.guardianapis.com/search';
const GUARDIAN_KEY  = 'test';
const PAGE_SIZE     = 20;

const SECTION_MAP = {
  all: '', world: 'world', politics: 'politics',
  business: 'business', environment: 'environment', technology: 'technology',
};

export async function fetchNews({ section = 'all', query = '', page = 1 } = {}) {
  const params = new URLSearchParams({
    'api-key':     GUARDIAN_KEY,
    'show-fields': 'headline,trailText,thumbnail,bodyText',
    'page-size':   PAGE_SIZE,
    'order-by':    'newest',
    page,
  });
  const sectionKey = SECTION_MAP[section] ?? '';
  if (sectionKey)    params.set('section', sectionKey);
  if (query.trim())  params.set('q', query.trim());

  const res = await fetch(`${GUARDIAN_BASE}?${params}`);
  if (!res.ok) throw new Error(`Guardian API error: ${res.status} ${res.statusText}`);
  return (await res.json()).response;
}

// ── Korean RSS via rss2json ────────────────────────────────────────────────
const RSS2JSON = 'https://api.rss2json.com/v1/api.json';

const KO_FEEDS = [
  { url: 'https://world.kbs.co.kr/rss/rss_news.htm?lang=k',                                    name: 'KBS' },
  { url: 'https://www.yonhapnewstv.co.kr/category/news/international/feed/',                    name: '연합뉴스' },
  { url: 'https://www.chosun.com/arc/outboundfeeds/rss/category/international/?outputType=xml', name: '조선일보' },
];

function stripHtml(str) {
  return (str || '').replace(/<[^>]*>/g, '').trim();
}

function normalizeItem(item, sourceName) {
  const thumb = item.thumbnail ||
    (item.enclosure?.type?.startsWith('image') ? item.enclosure.link : '') || '';
  return {
    webTitle:           stripHtml(item.title),
    webUrl:             item.link,
    webPublicationDate: item.pubDate,
    sectionName:        sourceName,
    fields: {
      headline:  stripHtml(item.title),
      trailText: stripHtml(item.description).slice(0, 220),
      thumbnail: thumb,
    },
  };
}

async function fetchFeed(feedUrl, sourceName) {
  const params = new URLSearchParams({ rss_url: feedUrl, count: '15' });
  const res  = await fetch(`${RSS2JSON}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== 'ok') throw new Error(data.message || 'feed error');
  return (data.items || []).map(item => normalizeItem(item, sourceName));
}

export async function fetchKoreanNews() {
  const settled = await Promise.allSettled(KO_FEEDS.map(f => fetchFeed(f.url, f.name)));
  const items   = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);

  if (!items.length) {
    throw new Error('한국어 뉴스를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
  }

  items.sort((a, b) => new Date(b.webPublicationDate) - new Date(a.webPublicationDate));
  return { results: items.slice(0, 30), total: items.length, pages: 1 };
}
