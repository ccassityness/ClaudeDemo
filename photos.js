/* Breed photos from Wikipedia, fetched in the visitor's browser.
 * Uses the MediaWiki API (CORS-enabled with origin=*) to look up each breed
 * article's lead image, 50 titles per request, and caches the results in
 * localStorage for a week. Breeds without a photo fall back to the cartoon. */
(() => {
  'use strict';

  const API = 'https://en.wikipedia.org/w/api.php';
  const CACHE_KEY = 'puppyPassport.photos.v1';
  const MAX_AGE = 7 * 24 * 3600 * 1000;
  const BATCH = 50;

  const urls = new Map();   // breed id -> thumbnail URL, or null when the article has none
  const pending = new Set();
  const failed = new Set(); // network errors this visit: don't retry in a loop

  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (saved && Date.now() - saved.ts < MAX_AGE) {
      for (const [id, u] of Object.entries(saved.map)) urls.set(id, u);
    }
  } catch { /* no cache */ }

  function persist() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), map: Object.fromEntries(urls) }));
    } catch { /* storage full or blocked */ }
  }

  const titleOf = (breed) => {
    const part = breed.wikipedia.split('/wiki/')[1] || breed.name;
    try { return decodeURIComponent(part).replace(/_/g, ' '); } catch { return part.replace(/_/g, ' '); }
  };

  async function fetchBatch(batch) {
    const titles = batch.map(titleOf);
    const params = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2', origin: '*',
      prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '400', redirects: '1',
      titles: titles.join('|'),
    });
    const res = await fetch(`${API}?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const q = (await res.json()).query || {};
    // Follow the title through normalisation and redirects to the page.
    const hop = new Map();
    for (const n of q.normalized || []) hop.set(n.from, n.to);
    for (const r of q.redirects || []) hop.set(r.from, r.to);
    const thumbs = new Map((q.pages || []).map((p) => [p.title, p.thumbnail?.source || null]));
    batch.forEach((breed, i) => {
      let t = titles[i];
      for (let guard = 0; hop.has(t) && guard < 4; guard++) t = hop.get(t);
      urls.set(breed.id, thumbs.get(t) ?? null);
    });
  }

  /** Look up photos for these breeds; resolves with the ids that changed. */
  async function request(breeds) {
    const todo = breeds.filter((b) => !urls.has(b.id) && !pending.has(b.id) && !failed.has(b.id));
    if (!todo.length) return [];
    todo.forEach((b) => pending.add(b.id));
    const done = [];
    for (let i = 0; i < todo.length; i += BATCH) {
      const batch = todo.slice(i, i + BATCH);
      try {
        await fetchBatch(batch);
        done.push(...batch.map((b) => b.id));
      } catch {
        batch.forEach((b) => failed.add(b.id));
      } finally {
        batch.forEach((b) => pending.delete(b.id));
      }
    }
    if (done.length) {
      persist();
      document.dispatchEvent(new CustomEvent('puppypassport:photos', { detail: done }));
    }
    return done;
  }

  window.BreedPhotos = {
    request,
    /** URL string, null (no photo exists), or undefined (not looked up yet). */
    get: (id) => urls.get(id),
  };
})();
