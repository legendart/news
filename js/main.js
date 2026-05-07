import { fetchNews, fetchKoreanNews } from './api.js';
import { scoreRisk, riskMeta }        from './risk.js';
import { STRINGS }                    from './i18n.js';

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  lang:       localStorage.getItem('javis-lang') || 'en',
  section:    'all',
  query:      '',
  page:       1,
  sortBy:     'risk',
  loading:    false,
  articles:   [],
  scored:     [],
  totalPages: 1,
};

// Korean articles are cached after first fetch; cleared on lang switch
let koCache = null;

// ── DOM refs ───────────────────────────────────────────────────────────────
const feedEl       = document.getElementById('feed');
const searchInput  = document.getElementById('search-input');
const searchBtn    = document.getElementById('search-btn');
const tabBtns      = document.querySelectorAll('.tab-btn');
const sortSelect   = document.getElementById('sort-select');
const prevBtn      = document.getElementById('prev-page');
const nextBtn      = document.getElementById('next-page');
const pageInfo     = document.getElementById('page-info');
const loadingEl    = document.getElementById('loading');
const loadingText  = document.getElementById('loading-text');
const errorEl      = document.getElementById('error-msg');
const totalCountEl = document.getElementById('total-count');
const lastUpdateEl = document.getElementById('last-update');
const feedTitleEl  = document.getElementById('feed-title');
const brandSubEl   = document.querySelector('.brand-sub');
const footerSrcEl  = document.getElementById('footer-source');
const langOptBtns  = document.querySelectorAll('.lang-opt');

// ── i18n helpers ───────────────────────────────────────────────────────────
const s = () => STRINGS[state.lang];

function applyLang(lang) {
  const str = STRINGS[lang];

  // Language toggle active state
  langOptBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));

  // Header / static text
  brandSubEl.textContent        = str.brandSub;
  searchInput.placeholder       = str.searchPlaceholder;
  searchBtn.textContent         = str.searchBtn;
  feedTitleEl.textContent       = str.feedTitle;
  loadingText.textContent       = str.loadingText;
  prevBtn.textContent           = str.prevPage;
  nextBtn.textContent           = str.nextPage;
  if (footerSrcEl) footerSrcEl.textContent = str.footerSource;

  // Sort select options
  sortSelect.options[0].text = str.sortRisk;
  sortSelect.options[1].text = str.sortDate;

  // Category tabs
  tabBtns.forEach(btn => {
    const section = btn.dataset.section;
    btn.textContent = str.tabs[section];
  });

  // In Korean mode, tab filtering is not supported — reset to 'all'
  if (lang === 'ko') {
    tabBtns.forEach(b => b.classList.remove('active'));
    document.querySelector('[data-section="all"]').classList.add('active');
    state.section = 'all';
  }

  // Re-render cards with updated risk labels
  if (state.scored.length) renderFeed();
}

// ── Scoring + sorting ──────────────────────────────────────────────────────
function buildScored() {
  state.scored = state.articles.map(article => {
    const fields = article.fields ?? {};
    const text   = `${fields.headline || article.webTitle || ''} ${fields.trailText || ''}`;
    return { article, score: scoreRisk(text) };
  });

  if (state.sortBy === 'risk') {
    state.scored.sort((a, b) => b.score - a.score);
  }
}

// ── Render ─────────────────────────────────────────────────────────────────
function renderCard({ article, score }) {
  const fields  = article.fields ?? {};
  const title   = fields.headline || article.webTitle || 'Untitled';
  const summary = fields.trailText || '';
  const thumb   = fields.thumbnail || '';
  const section = article.sectionName || '';
  const pubDate = article.webPublicationDate
    ? new Date(article.webPublicationDate).toLocaleDateString(
        state.lang === 'ko' ? 'ko-KR' : 'en-US',
        { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      )
    : '';

  const meta      = riskMeta(score);
  const riskLabel = s().riskLabel(score);

  const card = document.createElement('article');
  card.className = `card ${meta.cssClass}`;
  card.innerHTML = `
    ${thumb
      ? `<div class="card-thumb"><img src="${thumb}" alt="" loading="lazy"></div>`
      : '<div class="card-thumb card-thumb--empty"></div>'}
    <div class="card-body">
      <div class="card-meta">
        <span class="section-tag">${section}</span>
        <span class="risk-badge ${meta.cssClass}">${riskLabel}</span>
      </div>
      <h2 class="card-title">
        <a href="${article.webUrl}" target="_blank" rel="noopener">${title}</a>
      </h2>
      ${summary ? `<p class="card-summary">${summary}</p>` : ''}
      <time class="card-date">${pubDate}</time>
    </div>
  `;
  return card;
}

function renderFeed() {
  feedEl.innerHTML = '';
  if (!state.scored.length) {
    feedEl.innerHTML = `<p class="empty-msg">${s().noArticles}</p>`;
    return;
  }
  const frag = document.createDocumentFragment();
  state.scored.forEach(item => frag.appendChild(renderCard(item)));
  feedEl.appendChild(frag);
}

function updatePagination() {
  pageInfo.textContent = `${state.page} / ${state.totalPages}`;
  prevBtn.disabled = state.page <= 1;
  nextBtn.disabled = state.page >= state.totalPages;
}

// ── Data loading ───────────────────────────────────────────────────────────
async function load() {
  if (state.loading) return;
  state.loading = true;
  loadingEl.hidden = false;
  errorEl.hidden = true;
  feedEl.innerHTML = '';

  try {
    if (state.lang === 'ko') {
      // Korean mode: fetch RSS once, cache, filter client-side
      if (!koCache) {
        const res = await fetchKoreanNews();
        koCache = res.results;
      }

      let articles = koCache;
      if (state.query) {
        const q = state.query.toLowerCase();
        articles = koCache.filter(a => {
          const t = (a.fields?.headline || a.webTitle || '').toLowerCase();
          const d = (a.fields?.trailText || '').toLowerCase();
          return t.includes(q) || d.includes(q);
        });
      }

      state.articles   = articles;
      state.totalPages = 1;
      state.page       = 1;
      totalCountEl.textContent = s().articlesFound(articles.length);

    } else {
      // English mode: Guardian API with section + search + pagination
      const res = await fetchNews({
        section: state.section,
        query:   state.query,
        page:    state.page,
      });
      state.articles   = res.results ?? [];
      state.totalPages = Math.min(res.pages ?? 1, 50);
      totalCountEl.textContent = res.total ? s().articlesFound(res.total) : '';
    }

    lastUpdateEl.textContent = s().updatedAt(new Date().toLocaleTimeString());
    buildScored();
    renderFeed();
    updatePagination();

  } catch (err) {
    errorEl.textContent = s().loadError(err.message);
    errorEl.hidden = false;
  } finally {
    state.loading = false;
    loadingEl.hidden = true;
  }
}

// ── Event wiring ───────────────────────────────────────────────────────────
langOptBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const newLang = btn.dataset.lang;
    if (newLang === state.lang) return;

    state.lang  = newLang;
    state.page  = 1;
    state.query = '';
    searchInput.value = '';
    koCache = null;

    localStorage.setItem('javis-lang', newLang);
    applyLang(newLang);
    load();
  });
});

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Korean mode: tabs only rename, section filtering not supported
    if (state.lang === 'ko') {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      return;
    }
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.section = btn.dataset.section;
    state.page = 1;
    load();
  });
});

searchBtn.addEventListener('click', () => {
  state.query = searchInput.value.trim();
  state.page = 1;
  load();
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') searchBtn.click();
});

sortSelect.addEventListener('change', () => {
  state.sortBy = sortSelect.value;
  buildScored();
  renderFeed();
});

prevBtn.addEventListener('click', () => {
  if (state.page > 1) { state.page--; load(); window.scrollTo(0, 0); }
});

nextBtn.addEventListener('click', () => {
  if (state.page < state.totalPages) { state.page++; load(); window.scrollTo(0, 0); }
});

// ── Boot ───────────────────────────────────────────────────────────────────
applyLang(state.lang);
load();
