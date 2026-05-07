// ── Guardian (English) ────────────────────────────────────────────────────
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
  if (sectionKey)   params.set('section', sectionKey);
  if (query.trim()) params.set('q', query.trim());

  const res = await fetch(`${GUARDIAN_BASE}?${params}`);
  if (!res.ok) throw new Error(`Guardian API error: ${res.status} ${res.statusText}`);
  return (await res.json()).response;
}

// ── Korean RSS via corsproxy.io + DOMParser ────────────────────────────────
// Root cause of previous failures: rss2json count=15 param → HTTP 422 (free plan).
// corsproxy.io proxies any URL for browser fetch without CORS issues.
const CORSPROXY = 'https://corsproxy.io/?';
const MEDIA_NS  = 'http://search.yahoo.com/mrss/'; // Yonhap uses media:content

const KO_FEEDS = [
  { url: 'https://www.yna.co.kr/rss/news.xml',                                                  name: '연합뉴스' },
  { url: 'https://www.chosun.com/arc/outboundfeeds/rss/category/international/?outputType=xml', name: '조선일보' },
  { url: 'https://www.hankyung.com/feed/all-news',                                               name: '한국경제' },
  { url: 'https://www.mk.co.kr/rss/30100041/',                                                   name: '매일경제' },
];

function getText(el, tag) {
  return el.getElementsByTagName(tag)[0]?.textContent?.trim() || '';
}

function stripHtml(str) {
  return (str || '').replace(/<[^>]*>/g, '').trim();
}

function normalizeXmlItem(item, sourceName) {
  const title       = getText(item, 'title');
  const link        = getText(item, 'link') || getText(item, 'guid');
  const description = getText(item, 'description');
  const pubDate     = getText(item, 'pubDate');

  // Thumbnail priority:
  //   1. <media:content url="…"> — Yahoo Media RSS (Yonhap)
  //   2. <enclosure url="…" type="image/…"> — standard RSS (Chosun etc.)
  // DOMParser decodes XML entities automatically, so URLs are clean.
  const mediaContent = item.getElementsByTagNameNS(MEDIA_NS, 'content')[0];
  const enclosure    = item.getElementsByTagName('enclosure')[0];
  const encType      = enclosure?.getAttribute('type') || '';
  const thumb =
    mediaContent?.getAttribute('url') ||
    (encType.startsWith('image') ? enclosure?.getAttribute('url') : '') ||
    '';

  return {
    webTitle:           stripHtml(title),
    webUrl:             link,
    webPublicationDate: pubDate,
    sectionName:        sourceName,
    fields: {
      headline:  stripHtml(title),
      trailText: stripHtml(description).slice(0, 220),
      thumbnail: thumb,
    },
  };
}

async function fetchFeed({ url, name }) {
  const res = await fetch(CORSPROXY + encodeURIComponent(url));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const doc  = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid XML');
  const items = Array.from(doc.querySelectorAll('item'));
  if (!items.length) throw new Error('No items');
  return items.slice(0, 15).map(item => normalizeXmlItem(item, name));
}

export async function fetchKoreanNews() {
  const settled = await Promise.allSettled(KO_FEEDS.map(fetchFeed));
  const items   = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);

  if (!items.length) {
    throw new Error('한국어 뉴스를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
  }

  items.sort((a, b) => new Date(b.webPublicationDate) - new Date(a.webPublicationDate));
  return { results: items.slice(0, 30), total: items.length, pages: 1 };
}
