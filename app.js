/* Puppy Passport: plain JavaScript, no build step.
 * Loads puppy_passport_breeds.json, lets you stamp the breeds you've seen
 * (saved in localStorage), and suggests breeds to adopt from a short quiz. */
(() => {
  'use strict';

  const DATA_URL = 'puppy_passport_breeds.json';
  const STORAGE_KEY = 'puppyPassport.v1';
  const PAGE_SIZE = 60;

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  let breeds = [];
  let byId = new Map();
  let shown = PAGE_SIZE;

  /* ---------- Stamp storage ---------- */
  // Shape: { [breedId]: { date: 'YYYY-MM-DD' } }
  let stamps = {};
  function loadStamps() {
    try { stamps = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { stamps = {}; }
  }
  function saveStamps() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stamps)); }
    catch { /* storage blocked: stamps last for this visit only */ }
  }
  const isSeen = (id) => Object.prototype.hasOwnProperty.call(stamps, id);
  const today = () => new Date().toISOString().slice(0, 10);

  function toggleStamp(id) {
    if (isSeen(id)) delete stamps[id];
    else stamps[id] = { date: today() };
    saveStamps();
    refreshAfterStampChange(id);
  }

  /* ---------- Helpers ---------- */
  const fmtRange = (r, unit, digits = 0) => {
    if (!r || r.min == null) return null;
    const a = r.min.toFixed(digits), b = (r.max ?? r.min).toFixed(digits);
    return (a === b ? a : `${a}–${b}`) + ' ' + unit;
  };
  const fmtDate = (iso) => {
    const d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const sizeOf = (b) => b.akc?.size || null;

  /* ---------- Pictures: kawaii cartoons, or Wikipedia photos ---------- */
  const PIC_KEY = 'puppyPassport.pics';
  let picMode = 'cartoon';
  try { if (localStorage.getItem(PIC_KEY) === 'photo') picMode = 'photo'; } catch { /* ignore */ }
  const photos = () => window.BreedPhotos;

  // forcePhoto: show the photo when one exists, whatever the toggle says (dialog).
  function picInner(b, forcePhoto) {
    const url = (picMode === 'photo' || forcePhoto) && photos() ? photos().get(b.id) : null;
    return url
      ? `<img class="pic-img" src="${esc(url)}" alt="Photo of ${esc(b.name)}" loading="lazy" decoding="async">`
      : window.dogSVG(b);
  }
  function picHTML(b, cls = '', forcePhoto = false) {
    return `<div class="pic ${cls}" data-pic="${esc(b.id)}"${forcePhoto ? ' data-force-photo' : ''}>${picInner(b, forcePhoto)}</div>`;
  }
  function repaintPics(ids) {
    const want = ids ? new Set(ids) : null;
    document.querySelectorAll('[data-pic]').forEach((el) => {
      if (want && !want.has(el.dataset.pic)) return;
      const b = byId.get(el.dataset.pic);
      if (b) el.innerHTML = picInner(b, el.hasAttribute('data-force-photo'));
    });
  }
  function requestVisiblePhotos() {
    if (picMode !== 'photo' || !photos()) return;
    const ids = [...document.querySelectorAll('[data-pic]')].map((el) => el.dataset.pic);
    photos().request(ids.map((id) => byId.get(id)).filter(Boolean));
  }
  function setPicMode(mode) {
    picMode = mode;
    try { localStorage.setItem(PIC_KEY, mode); } catch { /* ignore */ }
    document.querySelectorAll('[data-pic-mode]').forEach((btn) =>
      btn.setAttribute('aria-pressed', btn.dataset.picMode === mode));
    repaintPics();
    requestVisiblePhotos();
  }

  /* ---------- Passport tab ---------- */
  function fillFilters() {
    const groups = [...new Set(breeds.map((b) => b.breed_type))].sort();
    const origins = [...new Set(breeds.map((b) => b.origin))].sort((a, b) => a.localeCompare(b));
    $('#filter-group').insertAdjacentHTML('beforeend',
      groups.map((g) => `<option>${esc(g)}</option>`).join(''));
    $('#filter-origin').insertAdjacentHTML('beforeend',
      origins.map((o) => `<option>${esc(o)}</option>`).join(''));
  }

  function filtered() {
    const q = fold($('#search').value.trim());
    const group = $('#filter-group').value;
    const origin = $('#filter-origin').value;
    const status = $('#filter-status').value;
    const seen = $('#filter-seen').value;
    return breeds.filter((b) => {
      if (group && b.breed_type !== group) return false;
      if (origin && b.origin !== origin) return false;
      if (status && b.status !== status) return false;
      if (seen === 'seen' && !isSeen(b.id)) return false;
      if (seen === 'unseen' && isSeen(b.id)) return false;
      if (q && !b._search.includes(q)) return false;
      return true;
    });
  }

  function cardHTML(b) {
    const seen = isSeen(b.id);
    const size = sizeOf(b);
    const aka = b.also_known_as.length ? `<p class="meta">aka ${esc(b.also_known_as.join(', '))}</p>` : '';
    return `<li class="card${seen ? ' seen' : ''}${b.status === 'extinct' ? ' is-extinct' : ''}" data-id="${esc(b.id)}">
      <button class="pic-btn" data-open="${esc(b.id)}" tabindex="-1" aria-hidden="true">${picHTML(b)}</button>
      <button class="stamp-btn" data-stamp="${esc(b.id)}" aria-pressed="${seen}"
        aria-label="${seen ? 'Remove stamp for' : 'Stamp'} ${esc(b.name)}">${seen ? '🐾' : 'Stamp'}</button>
      <h3><button data-open="${esc(b.id)}">${esc(b.name)}</button></h3>
      ${aka}
      <p class="meta">${esc(b.origin)}${seen ? ` · stamped ${esc(fmtDate(stamps[b.id].date))}` : ''}</p>
      <div class="tags">
        <span class="tag">${esc(b.breed_type)}</span>
        ${size && size !== b.breed_type ? `<span class="tag">${esc(size)}</span>` : ''}
        ${b.status === 'extinct' ? '<span class="tag extinct">Extinct</span>' : ''}
      </div>
    </li>`;
  }

  function renderGrid() {
    const list = filtered();
    const page = list.slice(0, shown);
    $('#breed-grid').innerHTML = page.map(cardHTML).join('');
    $('#result-count').textContent = list.length === breeds.length
      ? `${list.length} breeds`
      : `${list.length} of ${breeds.length} breeds match`;
    $('#show-more').hidden = list.length <= shown;
    $('#show-more').textContent = `Show more breeds (${list.length - shown} left)`;
    requestVisiblePhotos();
  }

  function resetPagingAndRender() { shown = PAGE_SIZE; renderGrid(); }

  /* ---------- Progress + stamps tab ---------- */
  function renderProgress() {
    const living = breeds.filter((b) => b.status === 'living');
    const seenLiving = living.filter((b) => isSeen(b.id)).length;
    const total = Object.keys(stamps).filter((id) => byId.has(id)).length;
    $('#seen-count').textContent = seenLiving;
    $('#living-count').textContent = living.length;
    const pct = living.length ? Math.round((seenLiving / living.length) * 100) : 0;
    $('#progress-fill').style.width = `${pct}%`;
    $('#progress-bar').setAttribute('aria-valuenow', pct);
    // Extinct stamps are allowed (museum visits count) but don't move the main bar.
    $('#progress-bar').title = total > seenLiving
      ? `${pct}% of living breeds, plus ${total - seenLiving} extinct` : `${pct}% of living breeds`;
  }

  function renderStampsTab() {
    const groups = [...new Set(breeds.map((b) => b.breed_type))].sort();
    const living = breeds.filter((b) => b.status === 'living');
    const countries = new Set(breeds.filter((b) => isSeen(b.id)).map((b) => b.origin));
    const tile = (label, n, of) => {
      const pct = of ? Math.round((n / of) * 100) : 0;
      return `<div class="stat"><div class="label">${esc(label)}</div>
        <div class="value">${n}${of ? `<small> / ${of}</small>` : ''}</div>
        ${of ? `<div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>` : ''}</div>`;
    };
    $('#group-stats').innerHTML =
      tile('Countries visited', countries.size, null) +
      groups.map((g) => {
        const inGroup = living.filter((b) => b.breed_type === g);
        return tile(g, inGroup.filter((b) => isSeen(b.id)).length, inGroup.length);
      }).join('');

    const collected = Object.entries(stamps)
      .filter(([id]) => byId.has(id))
      .sort((a, b) => b[1].date.localeCompare(a[1].date) || a[0].localeCompare(b[0]));
    $('#stamps-empty').hidden = collected.length > 0;
    $('#stamp-book').innerHTML = collected.map(([id, s]) => {
      const b = byId.get(id);
      return `<li class="stamp"><button data-open="${esc(id)}">
        ${picHTML(b, 'pic-sm')}<small>${esc(b.origin)}</small><strong>${esc(b.name)}</strong><small>${esc(fmtDate(s.date))}</small>
      </button></li>`;
    }).join('');
  }

  function refreshAfterStampChange(id) {
    // Re-render just the affected card so focus and scroll stay put.
    const li = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
    if (li && $('#filter-seen').value === '') {
      li.outerHTML = cardHTML(byId.get(id));
      const btn = document.querySelector(`.stamp-btn[data-stamp="${CSS.escape(id)}"]`);
      if (btn) {
        btn.focus();
        if (isSeen(id)) btn.classList.add('just-stamped');
      }
      requestVisiblePhotos();
    } else {
      renderGrid();
    }
    renderProgress();
    renderStampsTab();
    document.dispatchEvent(new CustomEvent('puppypassport:stamps'));
    if ($('#breed-dialog').open) openBreed(id);
  }

  /* ---------- Breed detail dialog ---------- */
  const TRAIT_NAMES = {
    energy: 'Energy',
    trainability: 'Trainability',
    grooming_needs: 'Grooming needs',
    shedding: 'Shedding',
    warmth_to_strangers: 'Warmth to strangers',
  };
  function pips(n) {
    return `<span class="pips" role="img" aria-label="${n} out of 5">${
      [1, 2, 3, 4, 5].map((i) => `<span class="pip${i <= n ? ' on' : ''}"></span>`).join('')}</span>`;
  }
  function traitsHTML(akc) {
    return `<div class="traits">${Object.entries(TRAIT_NAMES).map(([k, label]) => {
      const v = akc.traits_1_to_5[k];
      return v == null ? '' : `<div class="trait"><span>${label}</span>${pips(v)}</div>`;
    }).join('')}</div>`;
  }

  function openBreed(id) {
    const b = byId.get(id);
    if (!b) return;
    const a = b.akc;
    const seen = isSeen(id);
    const facts = [
      ['Origin', b.origin],
      ['Group', b.breed_type + (b.breed_type_source === 'estimated' ? ' (estimated)' : '')],
      ['Status', b.status === 'living' ? 'Living' : 'Extinct'],
    ];
    if (b.also_known_as.length) facts.push(['Also known as', b.also_known_as.join(', ')]);
    if (a) {
      if (a.size) facts.push(['Size', a.size]);
      const h = fmtRange(a.height_cm, 'cm'), w = fmtRange(a.weight_kg, 'kg', 1),
        life = fmtRange(a.life_expectancy_years, 'years');
      if (h) facts.push(['Height', h]);
      if (w) facts.push(['Weight', w]);
      if (life) facts.push(['Life expectancy', life]);
      if (a.popularity_rank) facts.push(['AKC popularity', `#${a.popularity_rank}`]);
      if (a.temperament?.length) facts.push(['Temperament', a.temperament.join(', ')]);
    }
    $('#dialog-body').innerHTML = `
      <button class="close" data-close aria-label="Close">×</button>
      <div class="dialog-hero">
        <div class="pic pic-lg">${window.dogSVG(b)}</div>
        <figure class="photo-frame" data-photo-for="${esc(id)}">${photoFrameInner(b)}</figure>
      </div>
      <h2 id="dialog-title">${esc(b.name)}</h2>
      ${seen ? `<p class="meta">Stamped ${esc(fmtDate(stamps[id].date))}</p>` : ''}
      <dl class="facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${a ? traitsHTML(a) : '<p class="note">No AKC trait profile for this breed.</p>'}
      ${b.note ? `<p class="note">${esc(b.note)}</p>` : ''}
      <div class="match-actions">
        <button class="primary" data-stamp="${esc(id)}">${seen ? 'Remove stamp' : 'Stamp my passport'}</button>
        <a class="ghost" href="${esc(b.wikipedia)}" target="_blank" rel="noopener">Read on Wikipedia</a>
      </div>`;
    const dlg = $('#breed-dialog');
    if (!dlg.open) dlg.showModal();
    if (photos()) photos().request([b]).then(() => paintPhotoFrame(b));
  }

  // The dialog shows the cartoon and, beside it, the real photo when Wikipedia has one.
  function photoFrameInner(b) {
    const url = photos()?.get(b.id);
    if (url) {
      return `<img class="pic-img" src="${esc(url)}" alt="Photo of ${esc(b.name)}">
        <figcaption><a href="${esc(b.wikipedia)}" target="_blank" rel="noopener">Photo via Wikipedia</a></figcaption>`;
    }
    return `<span class="photo-empty">${url === null ? 'No photo on Wikipedia' : 'Fetching photo…'}</span>`;
  }
  function paintPhotoFrame(b) {
    const el = document.querySelector(`[data-photo-for="${CSS.escape(b.id)}"]`);
    if (el) {
      el.innerHTML = photoFrameInner(b);
      // Request finished without a result (offline / blocked): say so instead of spinning.
      if (photos()?.get(b.id) === undefined) el.innerHTML = '<span class="photo-empty">Photo unavailable offline</span>';
    }
  }

  /* ---------- Tabs ---------- */
  function selectTab(tab) {
    document.querySelectorAll('[role="tab"]').forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    try { sessionStorage.setItem('puppyPassport.tab', tab.id); } catch { /* ignore */ }
  }

  /* ---------- Export / import ---------- */
  function exportStamps() {
    const blob = new Blob([JSON.stringify({ app: 'puppy-passport', version: 1, stamps }, null, 2)],
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `puppy-passport-${today()}.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importStamps(file) {
    try {
      const data = JSON.parse(await file.text());
      const incoming = data.stamps && typeof data.stamps === 'object' ? data.stamps : null;
      if (!incoming) throw new Error('No stamps found in that file.');
      let added = 0;
      for (const [id, s] of Object.entries(incoming)) {
        if (!byId.has(id) || isSeen(id)) continue;
        const date = typeof s?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.date) ? s.date : today();
        stamps[id] = { date };
        added++;
      }
      saveStamps();
      renderAll();
      alert(`Restored ${added} new stamp${added === 1 ? '' : 's'}.`);
    } catch (err) {
      alert(`Couldn't read that file: ${err.message}`);
    }
  }

  function renderAll() {
    renderGrid();
    renderProgress();
    renderStampsTab();
    document.dispatchEvent(new CustomEvent('puppypassport:stamps'));
  }

  // A few random cartoon pups peeking over the cover, refreshed per visit.
  function renderCoverDogs() {
    const pool = breeds.filter((b) => b.status === 'living');
    const chosen = [];
    while (chosen.length < 3 && pool.length) chosen.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    $('#cover-dogs').innerHTML = chosen.map((b) =>
      `<button class="cover-dog" data-open="${esc(b.id)}" aria-label="Meet the ${esc(b.name)}">${window.dogSVG(b)}</button>`).join('');
  }

  /* ---------- Wiring ---------- */
  function bindEvents() {
    let t;
    $('#search').addEventListener('input', () => { clearTimeout(t); t = setTimeout(resetPagingAndRender, 120); });
    ['#filter-group', '#filter-origin', '#filter-status', '#filter-seen']
      .forEach((s) => $(s).addEventListener('change', resetPagingAndRender));
    $('#show-more').addEventListener('click', () => { shown += PAGE_SIZE; renderGrid(); });

    document.addEventListener('click', (e) => {
      const stamp = e.target.closest('[data-stamp]');
      if (stamp) { toggleStamp(stamp.dataset.stamp); return; }
      const open = e.target.closest('[data-open]');
      if (open) { openBreed(open.dataset.open); return; }
      if (e.target.closest('[data-close]')) $('#breed-dialog').close();
    });
    // Click on the backdrop closes the dialog.
    $('#breed-dialog').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) e.currentTarget.close();
    });

    const tabs = [...document.querySelectorAll('[role="tab"]')];
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => selectTab(tab));
      tab.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        const next = tabs[(i + d + tabs.length) % tabs.length];
        selectTab(next); next.focus();
      });
    });

    document.querySelectorAll('[data-pic-mode]').forEach((btn) =>
      btn.addEventListener('click', () => setPicMode(btn.dataset.picMode)));
    document.addEventListener('puppypassport:photos', (e) => {
      repaintPics(e.detail);
      e.detail.forEach((id) => { const b = byId.get(id); if (b) paintPhotoFrame(b); });
    });
    // A photo that fails to load turns back into its cartoon.
    document.addEventListener('error', (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || !img.classList.contains('pic-img')) return;
      const holder = img.closest('[data-pic]');
      const b = holder && byId.get(holder.dataset.pic);
      if (b) holder.innerHTML = window.dogSVG(b);
    }, true);

    $('#export-btn').addEventListener('click', exportStamps);
    $('#import-file').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (f) importStamps(f);
      e.target.value = '';
    });
    $('#reset-btn').addEventListener('click', () => {
      const n = Object.keys(stamps).length;
      if (!n || !confirm(`Remove all ${n} stamps from this browser? Download your passport first if you want a backup.`)) return;
      stamps = {};
      saveStamps();
      renderAll();
    });
  }

  async function init() {
    loadStamps();
    bindEvents();
    try {
      const saved = sessionStorage.getItem('puppyPassport.tab');
      if (saved && document.getElementById(saved)) selectTab(document.getElementById(saved));
    } catch { /* ignore */ }

    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      breeds = data.breeds
        .map((b) => ({
          ...b,
          origin: b.origin || 'Unknown',
          also_known_as: b.also_known_as || [],
          _search: fold([b.name, b.origin, b.breed_type, ...b.also_known_as].join(' ')),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      byId = new Map(breeds.map((b) => [b.id, b]));
    } catch (err) {
      $('#result-count').innerHTML = `Couldn't load the breed list (${esc(err.message)}). ` +
        'If you opened this file directly, serve the folder over HTTP instead, e.g. <code>python3 -m http.server</code>.';
      return;
    }

    fillFilters();
    setPicMode(picMode);
    renderAll();
    renderCoverDogs();
    window.PuppyPassport = { breeds, byId, isSeen, toggleStamp, openBreed, esc, pips, traitsHTML, fmtRange, picHTML, refreshPhotos: requestVisiblePhotos };
    document.dispatchEvent(new CustomEvent('puppypassport:ready'));
  }

  init();
})();
