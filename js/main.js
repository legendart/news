import { fetchNews } from './api.js';
import { scoreRisk, riskMeta } from './risk.js';

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  section:    'all',
  query:      '',
  page:       1,
  sortBy:     'risk',   // 'risk' | 'date'
  loading:    false,
  articles:   [],       // raw Guardian results
  scored:     [],       // { article, score } sorted
  totalPages: 1,
};

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
const errorEl      = document.getElementById('error-msg');
const totalCountEl = document.getElementById('total-count');
const lastUpdateEl = document.getElementById('last-update');

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
  // 'date' keeps Guardian's default newest-first order
}

// ── Render ─────────────────────────────────────────────────────────────────
function renderCard({ article, score }) {
  const fields  = article.fields ?? {};
  const title   = fields.headline || article.webTitle || 'Untitled';
  const summary = fields.trailText || '';
  const thumb   = fields.thumbnail || '';
  const section = article.sectionName || '';
  const pubDate = article.webPublicationDate
    ? new Date(article.webPublicationDate).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '';

  const meta = riskMeta(score);

  const card = document.createElement('article');
  card.className = `card ${meta.cssClass}`;
  card.innerHTML = `
    ${thumb
      ? `<div class="card-thumb"><img src="${thumb}" alt="" loading="lazy"></div>`
      : '<div class="card-thumb card-thumb--empty"></div>'}
    <div class="card-body">
      <div class="card-meta">
        <span class="section-tag">${section}</span>
        <span class="risk-badge ${meta.cssClass}">${meta.label}</span>
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
    feedEl.innerHTML = '<p class="empty-msg">No articles found.</p>';
    return;
  }
  const frag = document.createDocumentFragment();
  state.scored.forEach(item => frag.appendChild(renderCard(item)));
  feedEl.appendChild(frag);
}

function updatePagination() {
  pageInfo.textContent = `Page ${state.page} / ${state.totalPages}`;
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
    const res = await fetchNews({
      section: state.section,
      query:   state.query,
      page:    state.page,
    });

    state.articles   = res.results ?? [];
    state.totalPages = Math.min(res.pages ?? 1, 50);

    totalCountEl.textContent = res.total
      ? `${res.total.toLocaleString()} articles found`
      : '';
    lastUpdateEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;

    buildScored();
    renderFeed();
    updatePagination();
  } catch (err) {
    errorEl.textContent = `Failed to load news: ${err.message}`;
    errorEl.hidden = false;
  } finally {
    state.loading = false;
    loadingEl.hidden = true;
  }
}

// ── Event wiring ───────────────────────────────────────────────────────────
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
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
load();
