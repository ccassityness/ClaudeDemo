/* Kawaii cartoon dog faces, drawn as inline SVG.
 * Each breed gets a deterministic face: ear shape from its group, coat colour
 * from hints in its name (or a stable hash), plus small seeded extras such as
 * eye patches, spots and tongues. Extinct breeds wear a little halo. */
(() => {
  'use strict';

  // FNV-1a hash so every breed id always draws the same dog.
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  // Small seeded random generator (mulberry32).
  function rng(seed) {
    let a = seed;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const mix = (c) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
    const r = mix(n >> 16), g = mix((n >> 8) & 255), b = mix(n & 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  const COATS = {
    cream: '#f7e4c6',
    golden: '#f3c46e',
    tan: '#dda56b',
    red: '#e08454',
    brown: '#b77a4c',
    chocolate: '#7d4d31',
    black: '#46404f',
    white: '#fdf9f4',
    grey: '#b9b6c8',
  };
  const COAT_NAMES = Object.keys(COATS);
  const NAME_HINTS = [
    [/black|noir|schwarz|negro/i, 'black'],
    [/white|blanc|weiss|bianco|blanco|samoyed|maltese|westie|bichon|kuvasz|pyrenean mountain|great pyrenees/i, 'white'],
    [/golden|gold/i, 'golden'],
    [/\bred\b|rouge|irish setter|vizsla|rhodesian|redbone/i, 'red'],
    [/grey|gray|blue|weimaraner|silver/i, 'grey'],
    [/chocolate|brown|liver/i, 'chocolate'],
    [/cream|wheaten/i, 'cream'],
  ];

  // Background tint per group.
  const GROUP_BG = {
    Hound: '#ffe1cc',
    Working: '#e6dcff',
    Herding: '#d4f5e4',
    'Spitz & primitive': '#d6ecff',
    Sporting: '#fff3c4',
    Terrier: '#ffd9e6',
    Toy: '#f6dcff',
    'Non-Sporting': '#d2f4f2',
  };

  // Ear style per group; the seed sometimes swaps in a neighbour style.
  const GROUP_EARS = {
    Hound: ['floppy', 'floppy', 'floppy', 'fold'],
    Sporting: ['floppy', 'floppy', 'floppy', 'round'],
    'Spitz & primitive': ['pointy', 'pointy', 'pointy', 'pointy'],
    Herding: ['pointy', 'pointy', 'fold', 'floppy'],
    Working: ['round', 'pointy', 'floppy', 'fold'],
    Terrier: ['fold', 'fold', 'pointy', 'fold'],
    Toy: ['round', 'pointy', 'floppy', 'round'],
    'Non-Sporting': ['round', 'floppy', 'pointy', 'fold'],
  };

  // Hand-picked looks for well-known breeds; everything else is generated.
  // coat/earColor/cap: COATS key; mask: white blaze + muzzle; muzzle: COATS key.
  const LOOKS = {
    'german-shepherd': { coat: 'tan', ears: 'pointy', cap: 'black', muzzle: 'black' },
    'siberian-husky': { coat: 'grey', ears: 'pointy', mask: true },
    'alaskan-malamute': { coat: 'grey', ears: 'pointy', mask: true },
    dalmatian: { coat: 'white', ears: 'floppy', spots: true },
    beagle: { coat: 'tan', ears: 'floppy', earColor: 'chocolate', mask: true },
    'basset-hound': { coat: 'tan', ears: 'floppy', earColor: 'chocolate', mask: true },
    'labrador-retriever': { coat: 'golden', ears: 'floppy' },
    'golden-retriever': { coat: 'golden', ears: 'floppy', earColor: 'tan' },
    poodle: { coat: 'cream', ears: 'floppy', fluffy: true },
    bulldog: { coat: 'white', ears: 'fold', earColor: 'tan', patch: true },
    'french-bulldog': { coat: 'cream', ears: 'pointy' },
    pug: { coat: 'cream', ears: 'fold', earColor: 'black', muzzle: 'black' },
    rottweiler: { coat: 'black', ears: 'fold', muzzle: 'tan' },
    dobermann: { coat: 'black', ears: 'pointy', muzzle: 'tan' },
    boxer: { coat: 'red', ears: 'fold', mask: true },
    dachshund: { coat: 'red', ears: 'floppy' },
    'pembroke-welsh-corgi': { coat: 'red', ears: 'pointy', mask: true },
    'cardigan-welsh-corgi': { coat: 'red', ears: 'pointy', mask: true },
    'yorkshire-terrier': { coat: 'tan', ears: 'pointy', cap: 'grey', fluffy: true },
    chihuahua: { coat: 'tan', ears: 'pointy' },
    'shih-tzu': { coat: 'white', ears: 'floppy', earColor: 'brown', fluffy: true },
    havanese: { coat: 'cream', ears: 'floppy', fluffy: true },
    maltese: { coat: 'white', ears: 'floppy', fluffy: true },
    'bichon-frise': { coat: 'white', ears: 'round', fluffy: true },
    'border-collie': { coat: 'black', ears: 'fold', mask: true },
    'australian-shepherd': { coat: 'grey', ears: 'fold', mask: true, patch: true },
    'great-dane': { coat: 'tan', ears: 'floppy', muzzle: 'black' },
    'bernese-mountain-dog': { coat: 'black', ears: 'floppy', mask: true },
    'st-bernard': { coat: 'white', ears: 'floppy', earColor: 'red', cap: 'red' },
    newfoundland: { coat: 'black', ears: 'floppy' },
    'cavalier-king-charles-spaniel': { coat: 'white', ears: 'floppy', earColor: 'red', patch: true },
    'english-cocker-spaniel': { coat: 'golden', ears: 'floppy', fluffy: false },
    'american-cocker-spaniel': { coat: 'cream', ears: 'floppy' },
    'shiba-inu': { coat: 'red', ears: 'pointy', mask: true },
    akita: { coat: 'red', ears: 'pointy', mask: true },
    samoyed: { coat: 'white', ears: 'pointy', fluffy: true },
    pomeranian: { coat: 'golden', ears: 'pointy', fluffy: true },
    'boston-terrier': { coat: 'black', ears: 'pointy', mask: true },
    'chow-chow': { coat: 'red', ears: 'round', fluffy: true },
    'jack-russell-terrier': { coat: 'white', ears: 'fold', earColor: 'tan', patch: true },
    'west-highland-white-terrier': { coat: 'white', ears: 'pointy', fluffy: true },
  };

  function earsSVG(style, coat, outline, inner, behind) {
    const s = `fill="${coat}" stroke="${outline}" stroke-width="2.5" stroke-linejoin="round"`;
    if (behind) {
      if (style === 'pointy') return `
        <path d="M26 54 L30 14 L56 34 Z" ${s}/><path d="M33 44 L35 24 L49 35 Z" fill="${inner}"/>
        <path d="M94 54 L90 14 L64 34 Z" ${s}/><path d="M87 44 L85 24 L71 35 Z" fill="${inner}"/>`;
      if (style === 'round') return `
        <circle cx="30" cy="36" r="15" ${s}/><circle cx="30" cy="36" r="8" fill="${inner}"/>
        <circle cx="90" cy="36" r="15" ${s}/><circle cx="90" cy="36" r="8" fill="${inner}"/>`;
      return '';
    }
    if (style === 'floppy') return `
      <path d="M32 36 C14 38 10 62 14 84 C17 96 30 96 33 84 C36 70 40 50 32 36 Z" ${s}/>
      <path d="M88 36 C106 38 110 62 106 84 C103 96 90 96 87 84 C84 70 80 50 88 36 Z" ${s}/>`;
    if (style === 'fold') return `
      <path d="M28 44 C26 30 36 22 52 30 C46 38 40 46 30 50 Z" ${s}/>
      <path d="M92 44 C94 30 84 22 68 30 C74 38 80 46 90 50 Z" ${s}/>`;
    return '';
  }

  // opts.portrait: no circle background, adds shoulders, and sits at the
  // bottom of a taller frame, like a passport photo.
  function dogSVG(breed, opts = {}) {
    const r = rng(hash(breed.id));
    const pick = (arr) => arr[Math.floor(r() * arr.length)];

    const look = LOOKS[breed.id] || {};
    const hint = NAME_HINTS.find(([re]) => re.test(breed.name));
    const coatName = look.coat || (hint ? hint[1] : pick(COAT_NAMES));
    const coat = COATS[coatName];
    const dark = coatName === 'black' || coatName === 'chocolate';
    const outline = shade(coat, dark ? -0.35 : -0.45);
    const muzzle = look.muzzle ? COATS[look.muzzle]
      : look.mask ? COATS.white : dark ? '#e7b788' : shade(coat, 0.55);
    const patchColor = coatName === 'white' || coatName === 'cream'
      ? pick(['#b77a4c', '#46404f', '#dda56b']) : shade(coat, -0.25);
    const earStyle = look.ears || pick(GROUP_EARS[breed.breed_type] || ['round', 'floppy', 'pointy', 'fold']);
    const earRoll = r();
    const earColor = look.earColor ? COATS[look.earColor]
      : look.coat ? coat : earRoll < 0.35 ? patchColor : coat;
    const inner = '#ffc2d4';
    const bg = GROUP_BG[breed.breed_type] || '#ffe4ef';

    const energy = breed.akc?.traits_1_to_5?.energy ?? 3;
    const tongue = energy >= 4 || r() < 0.25;
    const patchRoll = r(), sideRoll = r();
    const patch = look.patch || (!look.coat && patchRoll < 0.3) ? (sideRoll < 0.5 ? 'left' : 'right') : null;
    const spotty = look.spots || /dalmat|spotted|pointer|harlequin|leopard|catahoula/i.test(breed.name);
    const fluffy = look.fluffy ?? (breed.breed_type === 'Spitz & primitive' || /poodle|bichon|chow|pomeranian|samoyed|sheepdog|shih|lhasa|komondor|puli/i.test(breed.name));
    const sleepy = r() < 0.12;
    const extinct = breed.status === 'extinct';
    const eyeY = 62, eyeDx = 14 + Math.round(r() * 3);

    const eye = (cx) => sleepy
      ? `<path d="M${cx - 6} ${eyeY} q6 6 12 0" fill="none" stroke="#2b2230" stroke-width="3" stroke-linecap="round"/>`
      : `<ellipse cx="${cx}" cy="${eyeY}" rx="6.5" ry="7.5" fill="#2b2230"/>
         <circle cx="${cx - 2.2}" cy="${eyeY - 2.8}" r="2.6" fill="#fff"/>
         <circle cx="${cx + 2.4}" cy="${eyeY + 2.4}" r="1.2" fill="#fff"/>`;

    let spots = '';
    if (spotty) {
      for (let i = 0; i < (look.spots ? 10 : 6); i++) {
        const a = r() * Math.PI * 2, d = 18 + r() * 14;
        spots += `<circle cx="${(60 + Math.cos(a) * d).toFixed(1)}" cy="${(60 + Math.sin(a) * d * 0.8).toFixed(1)}" r="${(2 + r() * 2.5).toFixed(1)}" fill="${coatName === 'black' ? '#fdf9f4' : '#46404f'}"/>`;
      }
    }

    const fluff = fluffy ? `
      <g fill="${coat}" stroke="${outline}" stroke-width="2.5">
        <circle cx="25" cy="72" r="11"/><circle cx="95" cy="72" r="11"/>
        <circle cx="34" cy="88" r="11"/><circle cx="86" cy="88" r="11"/><circle cx="60" cy="96" r="11"/>
      </g>` : '';

    const halo = extinct ? `<ellipse cx="60" cy="14" rx="22" ry="6" fill="none" stroke="#f5c542" stroke-width="4"/>` : '';

    const portrait = !!opts.portrait;
    const shoulders = portrait
      ? `<path d="M8 140 C10 104 34 94 60 94 C86 94 110 104 112 140 Z" fill="${coat}" stroke="${outline}" stroke-width="2.5"/>
         <path d="M44 97 Q60 112 76 97" fill="none" stroke="#ff7eb3" stroke-width="5" stroke-linecap="round"/>
         <circle cx="60" cy="110" r="5" fill="#ffd166" stroke="#e0a930" stroke-width="1.5"/>`
      : '';
    return `<svg class="dog-svg" viewBox="${portrait ? '0 0 120 140' : '0 0 120 120'}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Cartoon ${breed.name.replace(/[<>&"]/g, '')}">
      ${portrait ? '' : `<circle cx="60" cy="60" r="58" fill="${bg}"/>`}
      <g ${extinct ? 'opacity=".75"' : ''}>
        ${shoulders}
        ${earsSVG(earStyle, earColor, outline, inner, true)}
        ${fluff}
        <ellipse cx="60" cy="64" rx="38" ry="34" fill="${coat}" stroke="${outline}" stroke-width="2.5"/>
        ${look.cap ? `<path d="M23 60 C22 30 98 30 97 60 C86 47 34 47 23 60 Z" fill="${COATS[look.cap]}"/>` : ''}
        ${look.mask ? `<ellipse cx="60" cy="58" rx="7" ry="16" fill="${COATS.white}"/>` : ''}
        ${spots}
        ${patch ? `<ellipse cx="${patch === 'left' ? 60 - eyeDx : 60 + eyeDx}" cy="${eyeY}" rx="12" ry="11" fill="${patchColor}"/>` : ''}
        ${earsSVG(earStyle, earColor, outline, inner, false)}
        <ellipse cx="60" cy="80" rx="17" ry="12.5" fill="${muzzle}"/>
        ${eye(60 - eyeDx)}${eye(60 + eyeDx)}
        <ellipse cx="${60 - eyeDx - 8}" cy="77" rx="6.5" ry="3.8" fill="#ff8fb1" opacity=".55"/>
        <ellipse cx="${60 + eyeDx + 8}" cy="77" rx="6.5" ry="3.8" fill="#ff8fb1" opacity=".55"/>
        <ellipse cx="60" cy="73" rx="5.5" ry="4" fill="#2b2230"/>
        <ellipse cx="58.5" cy="71.8" rx="1.8" ry="1.1" fill="#fff" opacity=".8"/>
        ${tongue ? '<path d="M56 82 q4 9 8 0 Z" fill="#ff7a9c" stroke="#e05a80" stroke-width="1"/>' : ''}
        <path d="M53 79 q3.5 4 7 0 q3.5 4 7 0" fill="none" stroke="${look.muzzle === 'black' ? '#f3d6c6' : '#2b2230'}" stroke-width="2.2" stroke-linecap="round"/>
      </g>
      ${halo}
    </svg>`;
  }

  window.dogSVG = dogSVG;
  window.dogSVG.background = (breed) => GROUP_BG[breed.breed_type] || '#ffe4ef';
})();
