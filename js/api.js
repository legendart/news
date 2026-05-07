const BASE_URL = 'https://content.guardianapis.com/search';
const API_KEY = 'test';
const PAGE_SIZE = 20;

const SECTION_MAP = {
  all:         '',
  world:       'world',
  politics:    'politics',
  business:    'business',
  environment: 'environment',
  technology:  'technology',
};

/**
 * @param {{ section?: string, query?: string, page?: number }} opts
 */
export async function fetchNews({ section = 'all', query = '', page = 1 } = {}) {
  const params = new URLSearchParams({
    'api-key': API_KEY,
    'show-fields': 'headline,trailText,thumbnail,bodyText',
    'page-size': PAGE_SIZE,
    'order-by': 'newest',
    page,
  });

  const sectionKey = SECTION_MAP[section] ?? '';
  if (sectionKey) params.set('section', sectionKey);
  if (query.trim()) params.set('q', query.trim());

  const url = `${BASE_URL}?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Guardian API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.response;
}
