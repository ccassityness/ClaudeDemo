/* Puppy Passport matchmaker: scores the breeds that have AKC trait ratings
 * against a short lifestyle quiz. Loaded after app.js. */
(() => {
  'use strict';

  const SIZE_SCALE = { Toy: 1, Small: 2, Medium: 3, Large: 4, Giant: 5 };

  // Each question maps an answer to a rule for one 1–5 trait.
  //   target: best value, score falls off with distance either way
  //   min / max: anything on the right side of the bound is a perfect fit
  //   null: the answer means "doesn't matter", so the trait is ignored
  const QUESTIONS = [
    {
      id: 'size', trait: 'size', weight: 1.5,
      legend: 'How much room does your home have for a dog?',
      options: [
        { label: 'Small apartment', rule: { max: 2 }, why: 'apartment-sized' },
        { label: 'Apartment or small house', rule: { target: 3 }, why: 'a medium size for a modest home' },
        { label: 'House with a yard', rule: { target: 4 }, why: 'a good size for a house with a yard' },
        { label: 'Plenty of space, the bigger the better', rule: { min: 4 }, why: 'a big dog for a big space' },
        { label: 'No preference', rule: null },
      ],
    },
    {
      id: 'energy', trait: 'energy', weight: 1.5,
      legend: 'How active is your day-to-day life?',
      options: [
        { label: 'Mostly on the couch', rule: { max: 2 }, why: 'happy with a calm routine' },
        { label: 'A daily walk or two', rule: { target: 3 }, why: 'content with regular walks' },
        { label: 'Runs, hikes, always on the go', rule: { min: 4 }, why: 'energetic enough to keep up with you' },
        { label: 'No preference', rule: null },
      ],
    },
    {
      id: 'training', trait: 'trainability', weight: 1,
      legend: 'How much dog-training experience do you have?',
      options: [
        { label: 'This is my first dog', rule: { min: 4 }, why: 'easy to train for a first-time owner' },
        { label: "I've had a dog before", rule: { min: 3 }, why: 'reasonably trainable' },
        { label: "Experienced, I like a challenge", rule: null },
      ],
    },
    {
      id: 'grooming', trait: 'grooming_needs', weight: 1,
      legend: 'How much time will you spend on grooming?',
      options: [
        { label: 'As little as possible', rule: { max: 2 }, why: 'low-maintenance coat' },
        { label: 'A brush a few times a week', rule: { max: 3 }, why: 'manageable grooming' },
        { label: 'I enjoy grooming', rule: null },
      ],
    },
    {
      id: 'shedding', trait: 'shedding', weight: 1,
      legend: 'How do you feel about dog hair?',
      options: [
        { label: 'Keep it to a minimum', rule: { max: 2 }, why: 'sheds little' },
        { label: 'Some hair is fine', rule: { max: 3 }, why: 'moderate shedding' },
        { label: "Don't mind at all", rule: null },
      ],
    },
    {
      id: 'social', trait: 'warmth_to_strangers', weight: 1,
      legend: 'How should your dog greet visitors?',
      options: [
        { label: "Everyone's a friend", rule: { min: 4 }, why: 'friendly with strangers' },
        { label: 'Polite but watchful', rule: { target: 2.5 }, why: 'a watchful, loyal companion' },
        { label: "Doesn't matter", rule: null },
      ],
    },
  ];

  const TRAIT_LABEL = {
    size: 'size', energy: 'energy', trainability: 'trainability',
    grooming_needs: 'grooming', shedding: 'shedding', warmth_to_strangers: 'friendliness to strangers',
  };

  function traitValue(breed, trait) {
    const a = breed.akc;
    if (trait === 'size') {
      if (a.size) return SIZE_SCALE[a.size];
      // A couple of breeds lack a size label: fall back to height.
      const h = a.height_cm?.max;
      if (h == null) return null;
      return h < 30 ? 1 : h < 42 ? 2 : h < 60 ? 3 : h < 72 ? 4 : 5;
    }
    return a.traits_1_to_5[trait];
  }

  // 0..1 for how well a value satisfies a rule.
  function fit(v, rule) {
    if (rule.target != null) return Math.max(0, 1 - Math.abs(v - rule.target) / 3);
    if (rule.min != null) return v >= rule.min ? 1 : Math.max(0, 1 - (rule.min - v) / 3);
    if (rule.max != null) return v <= rule.max ? 1 : Math.max(0, 1 - (v - rule.max) / 3);
    return 1;
  }

  function scoreBreed(breed, answers) {
    let total = 0, weightSum = 0, unknown = 0;
    const pros = [], cons = [];
    for (const q of QUESTIONS) {
      const opt = answers[q.id];
      if (!opt?.rule) continue;
      weightSum += q.weight;
      const v = traitValue(breed, q.trait);
      if (v == null) { total += q.weight * 0.5; unknown++; continue; } // no data: neutral
      const f = fit(v, opt.rule);
      total += q.weight * f;
      if (f >= 0.99) pros.push(opt.why);
      else if (f < 0.6) cons.push(TRAIT_LABEL[q.trait]);
    }
    return { breed, score: weightSum ? total / weightSum : 0, pros, cons, unknown };
  }

  function renderQuiz() {
    const form = document.getElementById('match-form');
    form.innerHTML = QUESTIONS.map((q) => `
      <fieldset>
        <legend>${q.legend}</legend>
        <div class="options">
          ${q.options.map((o, i) => `<label>
            <input type="radio" name="${q.id}" value="${i}"${i === q.options.length - 1 ? ' checked' : ''}>
            ${o.label}</label>`).join('')}
        </div>
      </fieldset>`).join('') + `
      <fieldset>
        <legend>Anything else?</legend>
        <div class="options">
          <label><input type="checkbox" name="hideSeen"> Hide breeds already in my passport</label>
        </div>
      </fieldset>
      <div><button class="primary" type="submit">Find my matches</button></div>`;
  }

  function readAnswers(form) {
    const answers = {};
    for (const q of QUESTIONS) {
      const el = form.elements[q.id];
      answers[q.id] = q.options[Number(el.value)];
    }
    return { answers, hideSeen: form.elements.hideSeen.checked };
  }

  function renderResults() {
    const PP = window.PuppyPassport;
    const form = document.getElementById('match-form');
    const out = document.getElementById('match-results');
    const { answers, hideSeen } = readAnswers(form);
    const answered = QUESTIONS.filter((q) => answers[q.id]?.rule).length;
    if (!answered) {
      out.innerHTML = '<p class="hint">Pick at least one preference above and we\'ll find your matches.</p>';
      return;
    }

    const results = PP.breeds
      .filter((b) => b.akc && b.status === 'living' && !(hideSeen && PP.isSeen(b.id)))
      .map((b) => scoreBreed(b, answers))
      // Ties go to breeds with more known data, then to more popular breeds.
      .sort((x, y) => y.score - x.score || x.unknown - y.unknown ||
        (x.breed.akc.popularity_rank ?? 999) - (y.breed.akc.popularity_rank ?? 999))
      .slice(0, 8);

    const esc = PP.esc;
    out.innerHTML = `<h2>Your top matches 💖</h2>
      <ol class="match-list">${results.map((r, i) => {
        const b = r.breed, a = b.akc, seen = PP.isSeen(b.id);
        const life = PP.fmtRange(a.life_expectancy_years, 'years');
        const bits = [b.origin, a.size, life && `lives ${life}`].filter(Boolean);
        return `<li class="match">
          ${PP.picHTML(b)}
          <div class="match-head">
            <h3>${i + 1}. ${esc(b.name)}</h3>
            <span class="score">${Math.round(r.score * 100)}% match</span>
          </div>
          <p class="meta">${esc(bits.join(' · '))}${a.temperament?.length ? ` · ${esc(a.temperament.join(', '))}` : ''}</p>
          ${r.pros.length ? `<ul class="why">${r.pros.map((p) => `<li>${esc(p[0].toUpperCase() + p.slice(1))}</li>`).join('')}</ul>` : ''}
          ${r.cons.length ? `<p class="note">Less of a fit on ${esc(r.cons.join(', '))}.</p>` : ''}
          ${r.unknown ? `<p class="note">AKC has no rating for ${r.unknown} of your priorities, so treat this one as a rough guess.</p>` : ''}
          ${PP.traitsHTML(a)}
          <div class="match-actions">
            <button class="ghost" data-open="${esc(b.id)}">Breed details</button>
            <button class="ghost" data-stamp="${esc(b.id)}" aria-pressed="${seen}">${seen ? '✓ In my passport' : "I've met one: stamp it"}</button>
          </div>
        </li>`;
      }).join('')}</ol>
      <p class="hint">Rescue groups exist for almost every breed, and many shelter mixes share these traits. Search "${esc(results[0]?.breed.name ?? 'breed')} rescue" near you.</p>`;
  }

  function init() {
    const PP = window.PuppyPassport;
    document.getElementById('akc-count').textContent =
      PP.breeds.filter((b) => b.akc && b.status === 'living').length;
    renderQuiz();
    const form = document.getElementById('match-form');
    let shown = false;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      shown = true;
      renderResults();
      document.getElementById('match-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    // Once results are on screen, keep them in sync with the answers and stamps.
    form.addEventListener('change', () => { if (shown) renderResults(); });
    document.addEventListener('puppypassport:stamps', () => { if (shown) renderResults(); });
  }

  if (window.PuppyPassport) init();
  else document.addEventListener('puppypassport:ready', init, { once: true });
})();
