/* =========================================================
   Wine Down Wednesday — stream dashboard
   Sections:
     1. Helpers (DOM, storage, media database, toasts)
     2. Settings + theme
     3. Panels (open/close, drag, resize, auto-scale)
     4. Settings drawer & stream mode
     5. Background
     6. Sounds
     7. Timer
     8. Music
     9. Affirmations
    10. Quotes
    11. Spinner
    12. To-do
    13. Backup
    14. Start-up
   Your existing saved lists (affirmations, quotes, spinner
   items, to-dos, Spotify link, sounds, background image) are
   read from the same browser storage the old version used.
   ========================================================= */
(() => {
  'use strict';

  /* ======================= 1. Helpers ======================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
  const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (v === true) node.setAttribute(k, '');
      else node.setAttribute(k, v);
    }
    for (const c of children) if (c != null) node.append(c);
    return node;
  }

  function toast(message, type = 'info') {
    const t = el('div', { class: `toast ${type}`, text: message });
    $('#toasts').append(t);
    setTimeout(() => t.remove(), type === 'error' ? 5000 : 2600);
  }

  // localStorage wrapper: never throws, warns when the browser's storage is full.
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch { toast('Couldn’t save — this browser’s storage is full.', 'error'); return false; }
    },
    raw(key) { try { return localStorage.getItem(key); } catch { return null; } },
    remove(...keys) { for (const k of keys) { try { localStorage.removeItem(k); } catch { /* ignore */ } } },
  };

  // IndexedDB key/value store for big files (videos, sounds, images).
  // Files are stored as-is instead of as giant text strings, which is
  // far lighter and has no 5 MB limit.
  const mediaDB = (() => {
    let dbPromise;
    function open() {
      if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
          const req = indexedDB.open('wdw-media', 1);
          req.onupgradeneeded = () => req.result.createObjectStore('media');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      }
      return dbPromise;
    }
    async function run(mode, fn) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('media', mode);
        const req = fn(tx.objectStore('media'));
        tx.oncomplete = () => resolve(req ? req.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    }
    return {
      get: key => run('readonly', s => s.get(key)),
      set: (key, val) => run('readwrite', s => s.put(val, key)),
      del: key => run('readwrite', s => s.delete(key)),
      keys: () => run('readonly', s => s.getAllKeys()),
    };
  })();

  const objectUrls = {};
  /** Returns { url, name, isVideo, source } for a saved file/link, or null. */
  async function resolveMedia(key, legacyKeys = []) {
    let rec = null;
    try { rec = await mediaDB.get(key); } catch (e) { console.warn('Media DB unavailable', e); }
    if (objectUrls[key]) { URL.revokeObjectURL(objectUrls[key]); delete objectUrls[key]; }
    if (rec && rec.kind === 'blob' && rec.blob) {
      const url = URL.createObjectURL(rec.blob);
      objectUrls[key] = url;
      return { url, name: rec.name || 'file', isVideo: (rec.type || '').startsWith('video'), source: 'file' };
    }
    if (rec && rec.kind === 'url' && rec.url) {
      return { url: rec.url, name: rec.url, isVideo: looksLikeVideo(rec.url), source: 'link' };
    }
    for (const lk of legacyKeys) {
      const v = store.raw(lk);
      if (v) return { url: v, name: v.startsWith('data:') ? 'saved file' : v, isVideo: false, source: v.startsWith('data:') ? 'file' : 'link' };
    }
    return null;
  }

  function looksLikeVideo(url) {
    return /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url) || /^data:video\//i.test(url);
  }

  function readText(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsText(file);
    });
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  function download(filename, text) {
    const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: filename });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  const lines = text => text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  /** "Task ~ Category" → { text, category }. Category is optional. */
  function parseTildeLine(line, fallbackCategory = '') {
    const i = line.indexOf('~');
    if (i === -1) return { text: line, category: fallbackCategory };
    const text = line.slice(0, i).trim();
    const category = line.slice(i + 1).replace(/~/g, '').trim() || fallbackCategory;
    return { text, category };
  }

  function nextIndex(current, length, shuffle, loop) {
    if (length === 0) return -1;
    if (shuffle) {
      if (length === 1) return 0;
      let n;
      do { n = Math.floor(Math.random() * length); } while (n === current);
      return n;
    }
    const n = current + 1;
    if (n < length) return n;
    return loop ? 0 : length - 1;
  }

  function renderChips(container, categories, hiddenList, onChange) {
    container.replaceChildren(...categories.map(cat => {
      const input = el('input', { type: 'checkbox', value: cat });
      input.checked = !hiddenList.includes(cat);
      input.addEventListener('change', () => {
        const idx = hiddenList.indexOf(cat);
        if (input.checked && idx > -1) hiddenList.splice(idx, 1);
        if (!input.checked && idx === -1) hiddenList.push(cat);
        onChange();
      });
      return el('label', { class: 'chip' }, input, cat);
    }));
  }

  const isTyping = target => target && (target.closest('input, textarea, select, [contenteditable="true"]'));

  /* ================== 2. Settings + theme =================== */
  const DEFAULT_SETTINGS = {
    timer: {
      phases: {
        work: { button: 'Regular Sprint', title: 'Reading/Productivity', minutes: 60 },
        short: { button: 'Break/Chat', title: 'Break/Chat', minutes: 20 },
        long: { button: 'Short Sprint', title: 'Short Sprint', minutes: 30 },
      },
      autoStartBreak: true,
    },
    volumes: { timer: 0.5, click: 0.5, spin: 0.5, result: 0.5 },
    affirmations: { shuffle: false, loop: true, index: -1 },
    quotes: { shuffle: false, loop: true, hidden: [], index: -1 },
    spinner: { hiddenCats: [], onWheel: null },
    todo: { title: 'Today’s', subtitle: 'Checklist', hiddenCats: [] },
    background: { mode: 'media', paused: false },
    stream: { on: false, hideButtons: false },
  };

  function deepMerge(base, extra) {
    if (Array.isArray(base) || typeof base !== 'object' || base === null) return extra === undefined ? base : extra;
    const out = { ...base };
    if (extra && typeof extra === 'object') {
      for (const k of Object.keys(extra)) out[k] = k in base ? deepMerge(base[k], extra[k]) : extra[k];
    }
    return out;
  }

  const settings = deepMerge(structuredCloneSafe(DEFAULT_SETTINGS), store.get('wdw.settings', {}));
  const saveSettings = debounce(() => store.set('wdw.settings', settings), 200);

  function structuredCloneSafe(o) { return JSON.parse(JSON.stringify(o)); }

  const FONTS = {
    'Playfair Display': 'serif', 'DM Serif Display': 'serif', 'Cormorant Garamond': 'serif', 'Italiana': 'serif',
    'Great Vibes': 'cursive', 'DM Sans': 'sans-serif', 'Poppins': 'sans-serif', 'Montserrat': 'sans-serif', 'Lato': 'sans-serif',
  };

  const THEME_DEFAULT = {
    pageBg: '#FDFCF8',
    navBg: '#5C2190', navAlpha: 0.85, navBtnBg: '#F7AB53', navBtnHover: '#F4C95D', navBtnText: '#333333',
    panelBg: '#FDFCF8', panelAlpha: 0.92, panelBorder: '#6F5C48', radius: 20, text: '#333333', muted: '#777777',
    btnBg: '#8C52FF', btnText: '#FFFFFF', timerColor: '#333333', accent: '#D24726',
    wheelColor: '#8C52FF', pointerColor: '#CDA67F', inputBorder: '#C9D6B5',
    fontHeading: 'Playfair Display', fontTimer: 'DM Serif Display', fontBody: 'DM Sans', fontScript: 'Great Vibes',
  };

  const THEME_FIELDS = [
    { group: 'Top bar', fields: [['navBg', 'Bar color'], ['navAlpha', 'Bar opacity', 'alpha'], ['navBtnBg', 'Tab buttons'], ['navBtnHover', 'Tab hover'], ['navBtnText', 'Tab text']] },
    { group: 'Panels', fields: [['panelBg', 'Panel color'], ['panelAlpha', 'Panel opacity', 'alpha'], ['panelBorder', 'Border'], ['radius', 'Corner roundness', 'radius'], ['text', 'Text'], ['muted', 'Soft text']] },
    { group: 'Buttons & accents', fields: [['btnBg', 'Buttons'], ['btnText', 'Button text'], ['timerColor', 'Timer'], ['accent', 'Spinner result'], ['wheelColor', 'Wheel color'], ['pointerColor', 'Wheel pointer'], ['inputBorder', 'Input borders']] },
    { group: 'Page', fields: [['pageBg', 'Plain background']] },
    { group: 'Fonts', fields: [['fontHeading', 'Headings & quotes', 'font'], ['fontTimer', 'Timer numbers', 'font'], ['fontBody', 'Body text', 'font'], ['fontScript', 'Script line', 'font']] },
  ];

  let theme = { ...THEME_DEFAULT, ...store.get('wdw.theme', {}) };
  let themePresets = store.get('wdw.themePresets', {});
  const saveTheme = debounce(() => store.set('wdw.theme', theme), 200);

  function hexToRgb(hex) {
    let h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (hex, a) => `rgba(${hexToRgb(hex).join(', ')}, ${a})`;
  const fontStack = name => `'${name}', ${FONTS[name] || 'sans-serif'}`;

  function applyTheme() {
    const s = document.documentElement.style;
    const t = theme;
    s.setProperty('--page-bg', t.pageBg);
    s.setProperty('--nav-bg', rgba(t.navBg, t.navAlpha));
    s.setProperty('--nav-btn-bg', t.navBtnBg);
    s.setProperty('--nav-btn-hover', t.navBtnHover);
    s.setProperty('--nav-btn-text', t.navBtnText);
    s.setProperty('--panel-bg', rgba(t.panelBg, t.panelAlpha));
    s.setProperty('--surface', t.panelBg);
    s.setProperty('--panel-border', t.panelBorder);
    s.setProperty('--radius', `${t.radius}px`);
    s.setProperty('--text', t.text);
    s.setProperty('--muted', t.muted);
    s.setProperty('--btn-bg', t.btnBg);
    s.setProperty('--btn-text', t.btnText);
    s.setProperty('--timer-color', t.timerColor);
    s.setProperty('--accent', t.accent);
    s.setProperty('--input-border', t.inputBorder);
    s.setProperty('--font-heading', fontStack(t.fontHeading));
    s.setProperty('--font-timer', fontStack(t.fontTimer));
    s.setProperty('--font-body', fontStack(t.fontBody));
    s.setProperty('--font-script', fontStack(t.fontScript));
    if (typeof drawWheel === 'function') drawWheel();
    refitAll();
  }

  function buildThemeEditor() {
    const root = $('#themeFields');
    root.replaceChildren();
    for (const { group, fields } of THEME_FIELDS) {
      const grid = el('div', { class: 'theme-grid' });
      for (const [key, label, kind] of fields) {
        let input;
        if (kind === 'alpha') {
          input = el('input', { type: 'range', min: 0, max: 1, step: 0.01 });
        } else if (kind === 'radius') {
          input = el('input', { type: 'range', min: 0, max: 40, step: 1 });
        } else if (kind === 'font') {
          input = el('select', {}, ...Object.keys(FONTS).map(f => el('option', { value: f, text: f })));
        } else {
          input = el('input', { type: 'color' });
        }
        input.dataset.themeKey = key;
        input.value = theme[key];
        input.addEventListener('input', () => {
          theme[key] = kind === 'alpha' || kind === 'radius' ? Number(input.value) : input.value;
          applyTheme();
          saveTheme();
        });
        grid.append(el('label', { class: 'theme-field' }, label, input));
      }
      root.append(el('div', { class: 'group' }, el('h3', { text: group }), grid));
    }
  }

  function syncThemeEditor() {
    $$('[data-theme-key]').forEach(input => { input.value = theme[input.dataset.themeKey]; });
  }

  function renderPresetSelect(selected) {
    const sel = $('#themePresetSelect');
    const names = Object.keys(themePresets).sort((a, b) => a.localeCompare(b));
    sel.replaceChildren(
      el('option', { value: '__default', text: 'Original (purple & gold)' }),
      ...names.map(n => el('option', { value: n, text: n })),
    );
    if (selected && (selected === '__default' || themePresets[selected])) sel.value = selected;
  }

  function setTheme(next) {
    theme = { ...THEME_DEFAULT, ...next };
    applyTheme();
    syncThemeEditor();
    store.set('wdw.theme', theme);
  }

  function initThemeControls() {
    buildThemeEditor();
    renderPresetSelect();

    $('#themeApplyPreset').addEventListener('click', () => {
      const name = $('#themePresetSelect').value;
      setTheme(name === '__default' ? THEME_DEFAULT : themePresets[name]);
      toast(`Applied “${name === '__default' ? 'Original' : name}”`);
    });
    $('#themeSavePreset').addEventListener('click', () => {
      const name = $('#themePresetName').value.trim();
      if (!name) { toast('Give the theme a name first.', 'error'); return; }
      if (themePresets[name] && !confirm(`Replace the saved theme “${name}”?`)) return;
      themePresets[name] = { ...theme };
      store.set('wdw.themePresets', themePresets);
      renderPresetSelect(name);
      $('#themePresetName').value = '';
      toast(`Saved “${name}”`);
    });
    $('#themeDeletePreset').addEventListener('click', () => {
      const name = $('#themePresetSelect').value;
      if (name === '__default') { toast('The original theme can’t be deleted.'); return; }
      if (!confirm(`Delete the saved theme “${name}”?`)) return;
      delete themePresets[name];
      store.set('wdw.themePresets', themePresets);
      renderPresetSelect();
    });
    $('#themeExport').addEventListener('click', () => {
      download('dashboard-theme.json', JSON.stringify({ type: 'wdw-theme', theme, presets: themePresets }, null, 2));
    });
    $('#themeImport').addEventListener('change', async e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const data = JSON.parse(await readText(file));
        if (data.presets) { themePresets = { ...themePresets, ...data.presets }; store.set('wdw.themePresets', themePresets); }
        if (data.theme) setTheme(data.theme);
        renderPresetSelect();
        toast('Theme imported');
      } catch { toast('That file isn’t a theme export.', 'error'); }
    });
    $('#themeReset').addEventListener('click', () => {
      if (confirm('Go back to the original colors and fonts? Your saved themes stay.')) setTheme(THEME_DEFAULT);
    });
  }

  /* ===================== 3. Panels ========================== */
  const PANEL_DEFAULTS = {
    timer:        { x: 0.03, y: 0.11, w: 0.31, h: 0.44, open: true },
    music:        { x: 0.03, y: 0.58, w: 0.31, h: 0.2,  open: false },
    affirmations: { x: 0.36, y: 0.11, w: 0.29, h: 0.24, open: false },
    quotes:       { x: 0.36, y: 0.38, w: 0.29, h: 0.3,  open: false },
    spinner:      { x: 0.67, y: 0.11, w: 0.3,  h: 0.5,  open: false },
    todo:         { x: 0.67, y: 0.63, w: 0.3,  h: 0.34, open: false },
  };
  const MIN_W = 180, MIN_H = 110;
  let layout = store.get('wdw.layout', {});
  const panelHooks = {};               // id → function called when the panel resizes
  const saveLayout = debounce(() => store.set('wdw.layout', layout), 150);

  function panelState(id) {
    if (!layout[id]) layout[id] = { ...PANEL_DEFAULTS[id] };
    return layout[id];
  }

  function placePanel(panel) {
    const st = panelState(panel.dataset.panel);
    const W = window.innerWidth, H = window.innerHeight;
    const w = Math.min(Math.max(st.w * W, MIN_W), W);
    const h = Math.min(Math.max(st.h * H, MIN_H), H);
    const x = clamp(st.x * W, 0, Math.max(0, W - w));
    const y = clamp(st.y * H, 0, Math.max(0, H - h));
    Object.assign(panel.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, zIndex: st.z || 10 });
    panel.hidden = !st.open;
  }

  function commitPanel(panel) {
    const st = panelState(panel.dataset.panel);
    const W = window.innerWidth, H = window.innerHeight;
    st.x = panel.offsetLeft / W;
    st.y = panel.offsetTop / H;
    st.w = panel.offsetWidth / W;
    st.h = panel.offsetHeight / H;
    saveLayout();
  }

  function bringToFront(panel) {
    const top = Math.max(10, ...Object.values(layout).map(s => s.z || 10));
    const st = panelState(panel.dataset.panel);
    if ((st.z || 10) === top && top > 10) return;
    st.z = top + 1;
    panel.style.zIndex = st.z;
    saveLayout();
  }

  function setPanelOpen(id, open) {
    const panel = $(`.panel[data-panel="${id}"]`);
    panelState(id).open = open;
    panel.hidden = !open;
    if (open) bringToFront(panel);
    $(`[data-toggle="${id}"]`).setAttribute('aria-pressed', String(open));
    saveLayout();
  }

  const ICONS = {
    gear: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };

  function initPanels() {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const panel = entry.target;
        const { width, height } = entry.contentRect;
        panel.style.setProperty('--pw', `${width}px`);
        panel.style.setProperty('--ph', `${height}px`);
        panel.classList.toggle('compact', height < 230);
        const hook = panelHooks[panel.dataset.panel];
        if (hook) hook();
      }
    });

    $$('.panel').forEach(panel => {
      const id = panel.dataset.panel;

      // Header strip (drag handle) + resize corner are added here so the HTML stays tidy.
      const bar = el('div', { class: 'panel-bar' },
        el('span', { class: 'panel-title', text: panel.dataset.title }));
      const gear = el('button', { class: 'icon-btn', title: `${panel.dataset.title} settings`, 'aria-label': `${panel.dataset.title} settings` });
      gear.innerHTML = ICONS.gear;
      gear.addEventListener('click', () => openDrawer(id));
      const close = el('button', { class: 'icon-btn', title: 'Hide panel', 'aria-label': `Hide ${panel.dataset.title}` });
      close.innerHTML = ICONS.close;
      close.addEventListener('click', () => setPanelOpen(id, false));
      bar.append(gear, close);
      panel.prepend(bar);
      const handle = el('div', { class: 'resize-handle', title: 'Drag to resize' });
      panel.append(handle);

      panel.addEventListener('pointerdown', () => bringToFront(panel));

      // Drag to move
      bar.addEventListener('pointerdown', e => {
        if (e.button !== 0 || e.target.closest('button')) return;
        e.preventDefault();
        const startX = e.clientX, startY = e.clientY;
        const left = panel.offsetLeft, top = panel.offsetTop;
        const w = panel.offsetWidth, h = panel.offsetHeight;
        bar.setPointerCapture(e.pointerId);
        panel.classList.add('dragging');
        document.body.classList.add('no-select');
        const move = ev => {
          panel.style.left = `${clamp(left + ev.clientX - startX, 0, Math.max(0, window.innerWidth - w))}px`;
          panel.style.top = `${clamp(top + ev.clientY - startY, 0, Math.max(0, window.innerHeight - h))}px`;
        };
        const up = () => {
          bar.removeEventListener('pointermove', move);
          bar.removeEventListener('pointerup', up);
          bar.removeEventListener('pointercancel', up);
          panel.classList.remove('dragging');
          document.body.classList.remove('no-select');
          commitPanel(panel);
        };
        bar.addEventListener('pointermove', move);
        bar.addEventListener('pointerup', up);
        bar.addEventListener('pointercancel', up);
      });

      // Drag corner to resize (no maximum other than the screen)
      handle.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        bringToFront(panel);
        const startX = e.clientX, startY = e.clientY;
        const w = panel.offsetWidth, h = panel.offsetHeight;
        handle.setPointerCapture(e.pointerId);
        panel.classList.add('resizing');
        document.body.classList.add('no-select');
        const move = ev => {
          panel.style.width = `${clamp(w + ev.clientX - startX, MIN_W, window.innerWidth - panel.offsetLeft)}px`;
          panel.style.height = `${clamp(h + ev.clientY - startY, MIN_H, window.innerHeight - panel.offsetTop)}px`;
        };
        const up = () => {
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', up);
          handle.removeEventListener('pointercancel', up);
          panel.classList.remove('resizing');
          document.body.classList.remove('no-select');
          commitPanel(panel);
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
        handle.addEventListener('pointercancel', up);
      });

      placePanel(panel);
      observer.observe(panel);
    });

    $$('[data-toggle]').forEach(btn => {
      const id = btn.dataset.toggle;
      btn.setAttribute('aria-pressed', String(panelState(id).open));
      btn.addEventListener('click', () => setPanelOpen(id, !panelState(id).open));
    });

    // Keep everything proportional when the window/screen size changes.
    let raf = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => $$('.panel').forEach(placePanel));
    });

    $('#resetLayout').addEventListener('click', () => {
      for (const id of Object.keys(PANEL_DEFAULTS)) {
        const open = panelState(id).open;
        layout[id] = { ...PANEL_DEFAULTS[id], open };
      }
      $$('.panel').forEach(placePanel);
      saveLayout();
      toast('Panel positions reset');
    });
  }

  // Shrinks/grows text until it fills its box without overflowing.
  function fitText(box, inner, maxPx) {
    if (!box || !inner || box.offsetParent === null) return;
    const H = box.clientHeight, W = box.clientWidth;
    if (!H || !W) return;
    let lo = 10, hi = Math.max(12, maxPx), best = lo;
    for (let i = 0; i < 9; i++) {
      const mid = (lo + hi) / 2;
      inner.style.fontSize = `${mid}px`;
      if (inner.offsetHeight <= H && inner.scrollWidth <= W + 1) { best = mid; lo = mid; } else { hi = mid; }
    }
    inner.style.fontSize = `${best}px`;
  }

  function refitAll() {
    for (const hook of Object.values(panelHooks)) hook();
  }

  /* ============ 4. Settings drawer & stream mode ============ */
  function openDrawer(tab) {
    const drawer = $('#drawer');
    if (tab) selectTab(tab);
    else if (!$('.tab-pane.active')) selectTab('timer');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
  }
  function closeDrawer() {
    $('#drawer').classList.remove('open');
    $('#drawer').setAttribute('aria-hidden', 'true');
  }
  function selectTab(tab) {
    $$('.drawer-tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    $$('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
    $('.drawer-body').scrollTop = 0;
  }

  let exitTimer = 0;
  function setStreamMode(on, persist = true) {
    document.body.classList.toggle('stream', on);
    if (on) closeDrawer();
    if (persist) { settings.stream.on = on; saveSettings(); }
    requestAnimationFrame(refitAll);
  }

  function initDrawerAndStream() {
    $('#openSettings').addEventListener('click', () => {
      $('#drawer').classList.contains('open') ? closeDrawer() : openDrawer();
    });
    $('#closeSettings').addEventListener('click', closeDrawer);
    $$('.drawer-tabs [data-tab]').forEach(b => b.addEventListener('click', () => selectTab(b.dataset.tab)));
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-open-settings]');
      if (btn) openDrawer(btn.dataset.openSettings);
    });

    $('#streamModeBtn').addEventListener('click', () => setStreamMode(true));
    $('#exitStream').addEventListener('click', () => setStreamMode(false));

    const hideBtns = $('#streamHideButtons');
    hideBtns.checked = settings.stream.hideButtons;
    document.body.classList.toggle('hide-panel-buttons', settings.stream.hideButtons);
    hideBtns.addEventListener('change', () => {
      settings.stream.hideButtons = hideBtns.checked;
      document.body.classList.toggle('hide-panel-buttons', hideBtns.checked);
      saveSettings();
    });

    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (e.key === 'h' || e.key === 'H') setStreamMode(!document.body.classList.contains('stream'));
      if (e.key === 'Escape') {
        if ($('#drawer').classList.contains('open')) closeDrawer();
        else if (document.body.classList.contains('stream')) setStreamMode(false);
      }
    });

    document.addEventListener('mousemove', () => {
      if (!document.body.classList.contains('stream')) return;
      document.body.classList.add('show-exit');
      clearTimeout(exitTimer);
      exitTimer = setTimeout(() => document.body.classList.remove('show-exit'), 2500);
    });

    const forceStream = new URLSearchParams(location.search).has('stream');
    if (forceStream) setStreamMode(true, false);
    else if (settings.stream.on) setStreamMode(true, false);
  }

  /* ===================== 5. Background ====================== */
  const bgVideo = $('#bgVideo');
  const bgImage = $('#bgImage');
  const BG_LEGACY = ['backgroundData', 'backgroundImageFile', 'backgroundImageURL'];

  function stopVideo() {
    // Fully unload the video so it stops decoding (hiding it isn't enough).
    bgVideo.pause();
    bgVideo.classList.remove('show');
    if (bgVideo.getAttribute('src')) {
      bgVideo.removeAttribute('src');
      bgVideo.load();
    }
  }

  async function applyBackground() {
    const mode = settings.background.mode;
    const status = $('#bgStatus');
    document.body.classList.toggle('bg-transparent', mode === 'transparent');
    stopVideo();
    bgImage.style.backgroundImage = '';
    if (mode === 'transparent') { status.textContent = 'Transparent — layer it over anything in OBS'; return; }
    if (mode === 'color') { status.textContent = 'Plain color (change it under Colors & Fonts)'; return; }

    const media = await resolveMedia('background', BG_LEGACY);
    if (!media) {
      status.textContent = store.raw('backgroundType') === '"video"' || store.raw('backgroundType') === 'video'
        ? 'Your last video wasn’t saved by the old version — upload it once more and it will be remembered.'
        : 'Plain color — no image or video saved yet';
      return;
    }
    if (media.isVideo) {
      bgVideo.src = media.url;
      bgVideo.classList.add('show');
      if (!settings.background.paused && !document.hidden) bgVideo.play().catch(() => {});
      status.textContent = `Video: ${media.name}${settings.background.paused ? ' (paused)' : ''}`;
    } else {
      bgImage.style.backgroundImage = `url("${media.url.replace(/"/g, '%22')}")`;
      status.textContent = `Image: ${media.source === 'file' ? media.name : 'from link'}`;
    }
  }

  async function saveBackground(record) {
    try {
      await mediaDB.set('background', record);
      store.remove(...BG_LEGACY, 'backgroundType');
      settings.background.mode = 'media';
      saveSettings();
      await applyBackground();
      toast('Background updated');
    } catch (e) {
      console.error(e);
      toast('Couldn’t save that background in this browser.', 'error');
    }
  }

  function initBackground() {
    $('#bgFile').addEventListener('change', e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const isVideo = file.type.startsWith('video/');
      if (file.type === 'image/gif' && file.size > 4e6) toast('Tip: large GIFs are heavy — an MP4 of the same clip plays much more smoothly.');
      saveBackground({ kind: 'blob', blob: file, name: file.name, type: isVideo ? 'video' : 'image' });
    });
    $('#bgUrlApply').addEventListener('click', () => {
      const url = $('#bgUrl').value.trim();
      if (!/^https?:\/\//i.test(url)) { toast('Paste a full link starting with https://', 'error'); return; }
      saveBackground({ kind: 'url', url });
      $('#bgUrl').value = '';
    });
    $('#bgUseMedia').addEventListener('click', () => { settings.background.mode = 'media'; saveSettings(); applyBackground(); });
    $('#bgUseColor').addEventListener('click', () => { settings.background.mode = 'color'; saveSettings(); applyBackground(); });
    $('#bgUseTransparent').addEventListener('click', () => { settings.background.mode = 'transparent'; saveSettings(); applyBackground(); });

    const pause = $('#bgPauseVideo');
    pause.checked = settings.background.paused;
    pause.addEventListener('change', () => {
      settings.background.paused = pause.checked;
      saveSettings();
      if (!bgVideo.getAttribute('src')) return;
      if (pause.checked) bgVideo.pause(); else bgVideo.play().catch(() => {});
      applyBackground();
    });

    // Don't spend CPU on a video nobody can see.
    document.addEventListener('visibilitychange', () => {
      if (!bgVideo.getAttribute('src')) return;
      if (document.hidden) bgVideo.pause();
      else if (!settings.background.paused) bgVideo.play().catch(() => {});
    });

    applyBackground();
  }

  /* ======================= 6. Sounds ======================== */
  const SOUNDS = {
    timer: { label: 'Timer end sound', legacy: ['timerEndSound'] },
    click: { label: 'Click sound', legacy: ['clickSoundData'] },
    spin: { label: 'Spin sound', legacy: ['spinSoundData'] },
    result: { label: 'Result sound', legacy: ['resultSoundData'] },
  };
  const audio = {};          // name → preloaded HTMLAudioElement
  const soundUI = {};

  async function loadSound(name) {
    const media = await resolveMedia(`sound:${name}`, SOUNDS[name].legacy);
    if (media) {
      const a = new Audio();
      a.preload = 'auto';
      a.src = media.url;
      audio[name] = a;
      soundUI[name].status.textContent = media.source === 'file' ? media.name : 'link';
      soundUI[name].status.title = media.name;
    } else {
      audio[name] = null;
      soundUI[name].status.textContent = 'none';
      soundUI[name].status.title = '';
    }
  }

  function playSound(name) {
    const base = audio[name];
    if (!base) return null;
    const busy = !base.paused && !base.ended;
    const a = busy ? base.cloneNode() : base;
    a.volume = clamp(Number(settings.volumes[name]) || 0, 0, 1);
    try { a.currentTime = 0; } catch { /* not loaded yet */ }
    a.play().catch(err => console.warn(`Couldn’t play ${name} sound`, err));
    return a;
  }

  function soundDuration(name) {
    const a = audio[name];
    if (!a) return Promise.resolve(0);
    if (Number.isFinite(a.duration) && a.duration > 0) return Promise.resolve(a.duration);
    return new Promise(resolve => {
      const done = () => resolve(Number.isFinite(a.duration) ? a.duration : 0);
      a.addEventListener('loadedmetadata', done, { once: true });
      a.addEventListener('error', () => resolve(0), { once: true });
      setTimeout(done, 1500);
    });
  }

  async function setSound(name, record) {
    try {
      await mediaDB.set(`sound:${name}`, record);
      store.remove(...SOUNDS[name].legacy);
      await loadSound(name);
      toast(`${SOUNDS[name].label} saved`);
    } catch (e) {
      console.error(e);
      toast('Couldn’t save that sound.', 'error');
    }
  }

  function buildSoundRow(row) {
    const name = row.dataset.sound;
    const status = el('span', { text: '…' });
    const file = el('input', { type: 'file', accept: 'audio/*' });
    const url = el('input', { type: 'url', placeholder: 'or paste a sound link' });
    const useUrl = el('button', { class: 's-btn', text: 'Use' });
    const vol = el('input', { type: 'range', min: 0, max: 1, step: 0.01 });
    vol.value = settings.volumes[name];
    const test = el('button', { class: 's-btn subtle', text: 'Test' });
    const clear = el('button', { class: 's-btn subtle', text: 'Clear' });

    file.addEventListener('change', () => {
      const f = file.files[0];
      file.value = '';
      if (f) setSound(name, { kind: 'blob', blob: f, name: f.name, type: f.type });
    });
    useUrl.addEventListener('click', () => {
      const u = url.value.trim();
      if (!/^https?:\/\//i.test(u)) { toast('Paste a full link starting with https://', 'error'); return; }
      setSound(name, { kind: 'url', url: u });
      url.value = '';
    });
    vol.addEventListener('input', () => { settings.volumes[name] = Number(vol.value); saveSettings(); });
    test.addEventListener('click', () => { if (!playSound(name)) toast('No sound set yet.'); });
    clear.addEventListener('click', async () => {
      try { await mediaDB.del(`sound:${name}`); } catch { /* ignore */ }
      store.remove(...SOUNDS[name].legacy);
      await loadSound(name);
    });

    row.append(
      el('div', { class: 'sound-head' }, el('strong', { text: SOUNDS[name].label }), status),
      file,
      el('div', { class: 'inline' }, url, useUrl),
      el('label', { class: 'vol' }, 'Volume', vol),
      el('div', { class: 's-row' }, test, clear),
    );
    soundUI[name] = { status };
  }

  function initSounds() {
    $$('.sound-row[data-sound]').forEach(buildSoundRow);
    for (const name of Object.keys(SOUNDS)) loadSound(name);
  }

  /* ======================= 7. Timer ========================= */
  // The timer counts down to a fixed end time instead of subtracting
  // one second per tick, so it stays accurate even if the browser
  // throttles background tabs.
  const timer = { phase: 'work', remaining: 0, endAt: null };
  let tickHandle = 0;
  let lastShown = '';
  const timerEls = {};

  const phaseMs = p => Math.max(0.1, Number(settings.timer.phases[p].minutes) || 1) * 60000;

  function formatTime(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60), s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function renderTimer() {
    const ms = timer.endAt ? timer.endAt - Date.now() : timer.remaining;
    const text = formatTime(ms);
    if (text !== lastShown) { timerEls.display.textContent = text; lastShown = text; }
    timerEls.label.textContent = settings.timer.phases[timer.phase].title;
    timerEls.startPause.textContent = timer.endAt ? 'Pause' : 'Start';
    $$('.mode-btn').forEach(b => {
      b.textContent = settings.timer.phases[b.dataset.phase].button;
      b.classList.toggle('active', b.dataset.phase === timer.phase);
    });
  }

  function persistTimer() { store.set('wdw.timerState', timer); }

  function startTimer() {
    if (timer.endAt) return;
    if (timer.remaining <= 0) timer.remaining = phaseMs(timer.phase);
    timer.endAt = Date.now() + timer.remaining;
    clearInterval(tickHandle);
    tickHandle = setInterval(tick, 250);
    timerEls.display.classList.remove('done');
    persistTimer();
    renderTimer();
  }

  function pauseTimer() {
    if (!timer.endAt) return;
    timer.remaining = Math.max(0, timer.endAt - Date.now());
    timer.endAt = null;
    clearInterval(tickHandle);
    persistTimer();
    renderTimer();
  }

  function setPhase(phase, autostart = false) {
    clearInterval(tickHandle);
    timer.phase = phase;
    timer.endAt = null;
    timer.remaining = phaseMs(phase);
    if (autostart) startTimer();
    else { persistTimer(); renderTimer(); }
  }

  function tick() {
    if (timer.endAt - Date.now() <= 0) finishTimer();
    else renderTimer();
  }

  function finishTimer() {
    clearInterval(tickHandle);
    const finished = timer.phase;
    timer.endAt = null;
    timer.remaining = 0;
    renderTimer();
    playSound('timer');
    timerEls.display.classList.add('done');
    // Regular Sprint → Break (auto-starts if enabled). Anything else → Regular Sprint, waiting for Start.
    if (finished === 'work') setPhase('short', settings.timer.autoStartBreak);
    else setPhase('work', false);
  }

  function initTimer() {
    timerEls.display = $('#timerDisplay');
    timerEls.label = $('#phaseLabel');
    timerEls.startPause = $('#timerStartPause');

    timerEls.startPause.addEventListener('click', () => (timer.endAt ? pauseTimer() : startTimer()));
    $('#timerReset').addEventListener('click', () => setPhase(timer.phase));
    $$('.mode-btn').forEach(b => b.addEventListener('click', () => setPhase(b.dataset.phase)));

    // Settings fields
    $$('[data-phase-field]').forEach(input => {
      const [phase, field] = input.dataset.phaseField.split('.');
      input.value = settings.timer.phases[phase][field];
      input.addEventListener('input', () => {
        const val = field === 'minutes' ? Number(input.value) : input.value;
        if (field === 'minutes' && !(val > 0)) return;
        settings.timer.phases[phase][field] = val;
        saveSettings();
        // A paused, untouched timer picks up the new length right away.
        if (field === 'minutes' && phase === timer.phase && !timer.endAt) timer.remaining = phaseMs(phase);
        persistTimer();
        renderTimer();
        updateAutoStartLabel();
      });
    });
    const auto = $('#autoStartBreak');
    auto.checked = settings.timer.autoStartBreak;
    auto.addEventListener('change', () => { settings.timer.autoStartBreak = auto.checked; saveSettings(); });
    updateAutoStartLabel();

    // Restore after a page reload (e.g. OBS refreshing the source mid-stream).
    const saved = store.get('wdw.timerState', null);
    if (saved && settings.timer.phases[saved.phase]) {
      timer.phase = saved.phase;
      if (saved.endAt && saved.endAt > Date.now()) {
        timer.remaining = saved.endAt - Date.now();
        startTimer();
      } else if (!saved.endAt && saved.remaining > 0) {
        timer.remaining = saved.remaining;
      } else {
        timer.remaining = phaseMs(saved.phase);
      }
    } else {
      timer.remaining = phaseMs('work');
    }
    renderTimer();
  }

  function updateAutoStartLabel() {
    const p = settings.timer.phases;
    $('#autoStartBreakLabel').textContent = `Start “${p.short.button}” automatically when “${p.work.button}” ends`;
  }

  /* ======================= 8. Music ========================= */
  function spotifyEmbed(input) {
    const s = String(input || '').trim();
    if (/open\.spotify\.com\/embed\//.test(s)) return s.split('?')[0];
    const m = s.match(/(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?|spotify:)(playlist|album|track|artist|episode|show)[/:]([A-Za-z0-9]+)/);
    return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
  }

  function renderMusic() {
    const container = $('#spotifyContainer');
    const url = store.raw('spotifyEmbedUrl');
    if (url) {
      container.replaceChildren(el('iframe', {
        class: 'spotify-frame', src: url, title: 'Spotify player', loading: 'lazy',
        allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
      }));
    } else {
      container.replaceChildren(el('div', { class: 'empty' },
        'No playlist yet',
        el('button', { class: 'btn', 'data-open-settings': 'music', text: 'Add a Spotify link' })));
    }
  }

  function initMusic() {
    $('#loadSpotify').addEventListener('click', () => {
      const embed = spotifyEmbed($('#spotifyInput').value);
      if (!embed) { toast('That doesn’t look like a Spotify link.', 'error'); return; }
      try { localStorage.setItem('spotifyEmbedUrl', embed); } catch { /* full */ }
      $('#spotifyInput').value = '';
      renderMusic();
      toast('Player loaded');
    });
    $('#removeSpotify').addEventListener('click', () => { store.remove('spotifyEmbedUrl'); renderMusic(); });
    renderMusic();
  }

  /* ==================== 9. Affirmations ===================== */
  let affirmations = store.get('savedAffirmations', []);
  if (!Array.isArray(affirmations)) affirmations = [];

  function renderAffirmation() {
    const text = $('#affirmationText');
    const i = settings.affirmations.index;
    if (!affirmations.length) text.textContent = 'No affirmations loaded.';
    else text.textContent = i >= 0 && i < affirmations.length ? affirmations[i] : 'Click ‘Next’ to begin';
    $('#affirmationCount').textContent = `${affirmations.length} affirmation${affirmations.length === 1 ? '' : 's'} saved`;
    fitAffirmation();
  }
  function fitAffirmation() {
    const panel = $('.panel[data-panel="affirmations"]');
    fitText($('#affirmationBox'), $('#affirmationText'), Math.min(panel.offsetWidth * 0.1, 64));
  }

  function setAffirmations(list) {
    affirmations = list;
    settings.affirmations.index = list.length ? 0 : -1;
    store.set('savedAffirmations', affirmations);
    saveSettings();
    renderAffirmation();
    toast(`Loaded ${list.length} affirmation${list.length === 1 ? '' : 's'}`);
  }

  function initAffirmations() {
    const shuffle = $('#shuffleAffirmations'), loop = $('#loopAffirmations');
    shuffle.checked = settings.affirmations.shuffle;
    loop.checked = settings.affirmations.loop;
    shuffle.addEventListener('change', () => { settings.affirmations.shuffle = shuffle.checked; saveSettings(); });
    loop.addEventListener('change', () => { settings.affirmations.loop = loop.checked; saveSettings(); });

    $('#nextAffirmation').addEventListener('click', () => {
      if (!affirmations.length) return;
      settings.affirmations.index = nextIndex(settings.affirmations.index, affirmations.length, shuffle.checked, loop.checked);
      saveSettings();
      renderAffirmation();
    });
    $('#loadAffirmations').addEventListener('click', () => {
      const list = lines($('#affirmationInput').value);
      if (!list.length) { toast('Paste some affirmations first.', 'error'); return; }
      setAffirmations(list);
      $('#affirmationInput').value = '';
    });
    $('#affirmationFile').addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (f) setAffirmations(lines(await readText(f)));
    });
    $('#clearAffirmations').addEventListener('click', () => {
      if (!confirm('Clear all saved affirmations?')) return;
      store.remove('savedAffirmations');
      affirmations = [];
      settings.affirmations.index = -1;
      saveSettings();
      renderAffirmation();
    });
    panelHooks.affirmations = fitAffirmation;
    renderAffirmation();
  }

  /* ======================= 10. Quotes ======================= */
  let quotes = store.get('savedQuotes', []);
  if (!Array.isArray(quotes)) quotes = [];

  // Same format as before: quote lines, then "Speaker ~ Category ~".
  function parseQuotes(text) {
    const out = [];
    let buffer = [];
    for (const line of text.split(/\r?\n/)) {
      if ((line.match(/~/g) || []).length === 2) {
        const quoteText = buffer.join('\n').trim();
        const [speaker, category] = line.split('~').map(p => p.trim());
        if (quoteText && speaker && category) out.push({ text: quoteText, speaker, category });
        buffer = [];
      } else {
        buffer.push(line);
      }
    }
    return out;
  }

  const visibleQuotes = () => quotes.filter(q => !settings.quotes.hidden.includes(q.category));

  function renderQuote() {
    const list = visibleQuotes();
    const i = settings.quotes.index;
    const text = $('#quoteText'), speaker = $('#quoteSpeaker');
    if (!list.length) {
      text.textContent = quotes.length ? 'No quotes in the chosen categories.' : 'No quotes loaded.';
      speaker.textContent = '';
    } else if (i < 0 || i >= list.length) {
      text.textContent = 'Click ‘Next’ to begin';
      speaker.textContent = '';
    } else {
      text.textContent = list[i].text;
      speaker.textContent = `— ${list[i].speaker}`;
    }
    $('#quoteCount').textContent = `${list.length} of ${quotes.length} quotes showing`;
    fitQuote();
  }
  function fitQuote() {
    const panel = $('.panel[data-panel="quotes"]');
    fitText($('#quoteBox'), $('#quoteBox .fit-inner'), Math.min(panel.offsetWidth * 0.09, 60));
  }

  function renderQuoteCategories() {
    const cats = [...new Set(quotes.map(q => q.category))];
    settings.quotes.hidden = settings.quotes.hidden.filter(c => cats.includes(c));
    renderChips($('#quoteCategories'), cats, settings.quotes.hidden, () => {
      settings.quotes.index = visibleQuotes().length ? 0 : -1;
      saveSettings();
      renderQuote();
    });
  }

  function setQuotes(list) {
    if (!list.length) { toast('No quotes found — check the “Speaker ~ Category ~” lines.', 'error'); return; }
    quotes = list;
    settings.quotes.index = 0;
    store.set('savedQuotes', quotes);
    saveSettings();
    renderQuoteCategories();
    renderQuote();
    toast(`Loaded ${list.length} quote${list.length === 1 ? '' : 's'}`);
  }

  function initQuotes() {
    const shuffle = $('#shuffleQuotes'), loop = $('#loopQuotes');
    shuffle.checked = settings.quotes.shuffle;
    loop.checked = settings.quotes.loop;
    shuffle.addEventListener('change', () => { settings.quotes.shuffle = shuffle.checked; saveSettings(); });
    loop.addEventListener('change', () => { settings.quotes.loop = loop.checked; saveSettings(); });

    $('#nextQuote').addEventListener('click', () => {
      const list = visibleQuotes();
      if (!list.length) return;
      settings.quotes.index = nextIndex(settings.quotes.index, list.length, shuffle.checked, loop.checked);
      saveSettings();
      renderQuote();
    });
    $('#loadQuotes').addEventListener('click', () => {
      const parsed = parseQuotes($('#quoteInput').value);
      setQuotes(parsed);
      if (parsed.length) $('#quoteInput').value = '';
    });
    $('#quoteFile').addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (f) setQuotes(parseQuotes(await readText(f)));
    });
    $('#clearQuotes').addEventListener('click', () => {
      if (!confirm('Clear all saved quotes?')) return;
      store.remove('savedQuotes');
      quotes = [];
      settings.quotes.index = -1;
      saveSettings();
      renderQuoteCategories();
      renderQuote();
    });
    panelHooks.quotes = fitQuote;
    renderQuoteCategories();
    renderQuote();
  }

  /* ====================== 11. Spinner ======================= */
  let spinnerItems = (store.get('spinnerItems', []) || [])
    .filter(i => i && i.text)
    .map(i => ({ text: String(i.text), category: i.category || 'General' }));
  let wheelAngle = Number(store.get('wdw.wheelAngle', 0)) || 0;
  let spinning = false;
  const canvas = $('#wheelCanvas');
  const ctx = canvas.getContext('2d');

  const saveSpinnerItems = () => store.set('spinnerItems', spinnerItems);
  const catVisible = item => !settings.spinner.hiddenCats.includes(item.category);
  const onWheel = item => settings.spinner.onWheel === null || settings.spinner.onWheel.includes(item.text);
  const wheelItems = () => spinnerItems.filter(i => catVisible(i) && onWheel(i));

  function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [h, s * 100, l * 100];
  }

  function drawWheel() {
    const wrap = $('#wheelWrap');
    if (!wrap || wrap.offsetParent === null) return;
    const size = Math.floor(Math.min(wrap.clientWidth, wrap.clientHeight));
    if (size < 40) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== size * dpr) {
      canvas.width = canvas.height = size * dpr;
      canvas.style.width = canvas.style.height = `${size}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const items = wheelItems();
    const c = size / 2;
    const pointerH = Math.max(12, size * 0.07);
    const radius = c - 4;

    if (!items.length) {
      ctx.beginPath();
      ctx.arc(c, c, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(127,127,127,0.15)';
      ctx.fill();
      ctx.fillStyle = theme.muted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.max(12, size * 0.05)}px ${fontStack(theme.fontBody)}`;
      ctx.fillText('Add items in settings', c, c);
      return;
    }

    const [h, s, l] = rgbToHsl(hexToRgb(theme.wheelColor));
    const step = (Math.PI * 2) / items.length;
    items.forEach((item, i) => {
      const start = wheelAngle + i * step;
      let light = i % 2 === 0 ? l + 7 : l - 7;
      if (items.length % 2 === 1 && i === items.length - 1) light = l; // avoid two same-color neighbors
      light = clamp(light, 12, 88);
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, radius, start, start + step);
      ctx.closePath();
      ctx.fillStyle = `hsl(${h}, ${s}%, ${light}%)`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label — shrinks to fit, then trims with an ellipsis.
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(start + step / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = light > 58 ? '#222' : '#fff';
      const maxW = radius * 0.78;
      const maxH = Math.max(8, Math.sin(Math.min(step, Math.PI / 2)) * radius * 0.55);
      let fs = clamp(Math.min(radius * 0.11, maxH), 9, 30);
      ctx.font = `600 ${fs}px ${fontStack(theme.fontBody)}`;
      let label = item.text;
      while (ctx.measureText(label).width > maxW && fs > 10) {
        fs -= 1;
        ctx.font = `600 ${fs}px ${fontStack(theme.fontBody)}`;
      }
      if (ctx.measureText(label).width > maxW) {
        while (label.length > 1 && ctx.measureText(`${label}…`).width > maxW) label = label.slice(0, -1);
        label = `${label}…`;
      }
      ctx.fillText(label, radius - 12, 0);
      ctx.restore();
    });

    // Hub
    ctx.beginPath();
    ctx.arc(c, c, Math.max(6, radius * 0.06), 0, Math.PI * 2);
    ctx.fillStyle = theme.pointerColor;
    ctx.fill();

    // Pointer at 12 o'clock
    ctx.beginPath();
    ctx.moveTo(c - pointerH * 0.6, 0);
    ctx.lineTo(c + pointerH * 0.6, 0);
    ctx.lineTo(c, pointerH);
    ctx.closePath();
    ctx.fillStyle = theme.pointerColor;
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  async function spinWheel() {
    const items = wheelItems();
    if (spinning || !items.length) return;
    spinning = true;
    $('#spinnerResult').textContent = '';
    playSound('click');

    const seconds = await soundDuration('spin');
    const duration = seconds ? clamp(seconds * 1000, 1500, 20000) : 4000;
    playSound('spin');

    const from = wheelAngle;
    const turn = ((Math.random() * 360 + 720) * 2 * Math.PI) / 180;
    const t0 = performance.now();

    const frame = now => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      wheelAngle = from + turn * eased;
      drawWheel();
      if (t < 1) { requestAnimationFrame(frame); return; }

      wheelAngle %= Math.PI * 2;
      store.set('wdw.wheelAngle', wheelAngle);
      // Which slice sits under the pointer at the top (270°)?
      const TAU = Math.PI * 2;
      const atTop = (((1.5 * Math.PI - wheelAngle) % TAU) + TAU) % TAU;
      const winner = items[Math.floor(atTop / (TAU / items.length)) % items.length];
      setTimeout(() => {
        playSound('result');
        $('#spinnerResult').textContent = winner.text;
        celebrate($('#spinnerResult'));
        spinning = false;
      }, 300);
    };
    requestAnimationFrame(frame);
  }

  let confettiFire = null;
  function celebrate(target) {
    if (typeof window.confetti !== 'function') return;
    if (!confettiFire) confettiFire = window.confetti.create($('#confettiCanvas'), { resize: true, useWorker: true });
    const r = target.getBoundingClientRect();
    confettiFire({
      particleCount: 100,
      spread: 70,
      origin: { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight },
      colors: [theme.btnBg, theme.navBtnBg, theme.accent, theme.wheelColor, theme.pointerColor],
    });
  }

  function renderSpinnerSettings() {
    const cats = [...new Set(spinnerItems.map(i => i.category))];
    settings.spinner.hiddenCats = settings.spinner.hiddenCats.filter(c => cats.includes(c));
    renderChips($('#spinnerCategories'), cats, settings.spinner.hiddenCats, () => {
      saveSettings();
      renderSpinnerSettings();
    });

    const visible = spinnerItems.filter(catVisible).sort((a, b) => a.text.localeCompare(b.text));
    $('#spinnerItemList').replaceChildren(...visible.map(item => {
      const input = el('input', { type: 'checkbox' });
      input.checked = onWheel(item);
      input.addEventListener('change', () => {
        if (settings.spinner.onWheel === null) settings.spinner.onWheel = spinnerItems.map(i => i.text);
        const list = settings.spinner.onWheel;
        const idx = list.indexOf(item.text);
        if (input.checked && idx === -1) list.push(item.text);
        if (!input.checked && idx > -1) list.splice(idx, 1);
        saveSettings();
        drawWheel();
      });
      return el('label', {}, input, el('span', { text: item.text }), el('span', { class: 'cat', text: item.category }));
    }));
    drawWheel();
  }

  function addSpinnerItems(text) {
    const parsed = lines(text).map(l => parseTildeLine(l, 'General')).filter(i => i.text);
    const existing = new Set(spinnerItems.map(i => i.text));
    const fresh = parsed.filter(i => !existing.has(i.text) && existing.add(i.text));
    if (!fresh.length) { toast(parsed.length ? 'Those items are already on the list.' : 'Paste some items first.', 'error'); return; }
    spinnerItems.push(...fresh);
    if (settings.spinner.onWheel) settings.spinner.onWheel.push(...fresh.map(i => i.text));
    saveSpinnerItems();
    saveSettings();
    renderSpinnerSettings();
    toast(`Added ${fresh.length} item${fresh.length === 1 ? '' : 's'}`);
  }

  function initSpinner() {
    $('#spinButton').addEventListener('click', spinWheel);
    $('#loadSpinnerItems').addEventListener('click', () => {
      addSpinnerItems($('#spinnerInput').value);
      $('#spinnerInput').value = '';
    });
    $('#spinnerFile').addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (f) addSpinnerItems(await readText(f));
    });
    $('#wheelAll').addEventListener('click', () => { settings.spinner.onWheel = null; saveSettings(); renderSpinnerSettings(); });
    $('#wheelNone').addEventListener('click', () => { settings.spinner.onWheel = []; saveSettings(); renderSpinnerSettings(); });
    $('#wheelRandom').addEventListener('click', () => {
      const pool = spinnerItems.filter(catVisible).map(i => i.text);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      settings.spinner.onWheel = pool.slice(0, Math.max(2, Number($('#wheelRandomCount').value) || 10));
      saveSettings();
      renderSpinnerSettings();
    });
    $('#removeSpinnerItems').addEventListener('click', () => {
      const doomed = new Set(spinnerItems.filter(i => catVisible(i) && onWheel(i)).map(i => i.text));
      if (!doomed.size) return;
      if (!confirm(`Delete ${doomed.size} checked item${doomed.size === 1 ? '' : 's'}?`)) return;
      spinnerItems = spinnerItems.filter(i => !doomed.has(i.text));
      if (settings.spinner.onWheel) settings.spinner.onWheel = settings.spinner.onWheel.filter(t => !doomed.has(t));
      saveSpinnerItems();
      saveSettings();
      renderSpinnerSettings();
    });
    $('#clearSpinnerItems').addEventListener('click', () => {
      if (!confirm('Delete every spinner item?')) return;
      spinnerItems = [];
      settings.spinner.onWheel = null;
      saveSpinnerItems();
      saveSettings();
      $('#spinnerResult').textContent = '';
      renderSpinnerSettings();
    });
    panelHooks.spinner = drawWheel;
    renderSpinnerSettings();
    // Fonts load after first paint; redraw so wheel labels use them.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawWheel(); refitAll(); });
  }

  /* ======================= 12. To-do ======================== */
  let todos = (store.get('todoTasks', []) || []).filter(t => t && t.text);
  let todoSeq = Date.now();
  todos.forEach(t => { if (!t.id) t.id = `t${todoSeq++}`; t.category = t.category || ''; });
  const saveTodos = () => store.set('todoTasks', todos);
  let draggingId = null;

  function renderTodos() {
    const hidden = settings.todo.hiddenCats;
    const visible = todos.filter(t => !t.category || !hidden.includes(t.category));
    const list = $('#todoList');
    if (!visible.length) {
      list.replaceChildren(el('li', { class: 'empty' },
        todos.length ? 'Nothing in the chosen categories' : 'No tasks yet',
        el('button', { class: 'btn', 'data-open-settings': 'todo', text: 'Add tasks' })));
      return;
    }
    list.replaceChildren(...visible.map(task => {
      const box = el('input', { type: 'checkbox', 'aria-label': task.text });
      box.checked = !!task.completed;
      box.addEventListener('change', () => {
        task.completed = box.checked;
        saveTodos();
        li.classList.toggle('completed', box.checked);
      });
      const text = el('span', { class: 'todo-text', text: task.text });
      text.addEventListener('click', () => box.click());
      const li = el('li', { class: `todo-item${task.completed ? ' completed' : ''}`, draggable: 'true' },
        box, text,
        task.category ? el('span', { class: `todo-cat${task.category.length < 12 ? ' bold' : ''}`, text: task.category }) : null);
      li.dataset.id = task.id;

      li.addEventListener('dragstart', e => {
        draggingId = task.id;
        li.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
      });
      li.addEventListener('dragend', () => {
        draggingId = null;
        $$('.todo-item').forEach(n => n.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom'));
      });
      li.addEventListener('dragover', e => {
        if (!draggingId || draggingId === task.id) return;
        e.preventDefault();
        const below = e.offsetY > li.offsetHeight / 2;
        li.classList.toggle('drag-over-bottom', below);
        li.classList.toggle('drag-over-top', !below);
      });
      li.addEventListener('dragleave', () => li.classList.remove('drag-over-top', 'drag-over-bottom'));
      li.addEventListener('drop', e => {
        e.preventDefault();
        if (!draggingId || draggingId === task.id) return;
        const below = li.classList.contains('drag-over-bottom');
        const from = todos.findIndex(t => t.id === draggingId);
        const [moved] = todos.splice(from, 1);
        let to = todos.findIndex(t => t.id === task.id);
        if (below) to += 1;
        todos.splice(to, 0, moved);
        saveTodos();
        renderTodos();
      });
      return li;
    }));
  }

  function renderTodoCategories() {
    const cats = [...new Set(todos.map(t => t.category).filter(Boolean))];
    settings.todo.hiddenCats = settings.todo.hiddenCats.filter(c => cats.includes(c));
    renderChips($('#todoCategories'), cats, settings.todo.hiddenCats, () => { saveSettings(); renderTodos(); });
  }

  function addTodos(text) {
    const fresh = lines(text).map(l => parseTildeLine(l)).filter(t => t.text)
      .map(t => ({ id: `t${todoSeq++}`, text: t.text, category: t.category, completed: false }));
    if (!fresh.length) { toast('Paste some tasks first.', 'error'); return; }
    todos.push(...fresh);
    saveTodos();
    renderTodoCategories();
    renderTodos();
    toast(`Added ${fresh.length} task${fresh.length === 1 ? '' : 's'}`);
  }

  function renderTodoHeading() {
    $('#todoTitle').textContent = settings.todo.title;
    $('#todoSubtitle').textContent = settings.todo.subtitle;
    $('#todoTitle').hidden = !settings.todo.title;
    $('#todoSubtitle').hidden = !settings.todo.subtitle;
  }

  function initTodos() {
    const title = $('#todoTitleInput'), subtitle = $('#todoSubtitleInput');
    title.value = settings.todo.title;
    subtitle.value = settings.todo.subtitle;
    title.addEventListener('input', () => { settings.todo.title = title.value; saveSettings(); renderTodoHeading(); });
    subtitle.addEventListener('input', () => { settings.todo.subtitle = subtitle.value; saveSettings(); renderTodoHeading(); });

    $('#loadTodoTasks').addEventListener('click', () => { addTodos($('#todoInput').value); $('#todoInput').value = ''; });
    $('#todoFile').addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (f) addTodos(await readText(f));
    });
    $('#removeSelectedTodos').addEventListener('click', () => {
      const done = todos.filter(t => t.completed).length;
      if (!done) { toast('Nothing is checked off yet.'); return; }
      todos = todos.filter(t => !t.completed);
      saveTodos();
      renderTodoCategories();
      renderTodos();
      toast(`Removed ${done} task${done === 1 ? '' : 's'}`);
    });
    $('#clearTodoList').addEventListener('click', () => {
      if (!confirm('Clear the whole to-do list?')) return;
      todos = [];
      store.remove('todoTasks');
      renderTodoCategories();
      renderTodos();
    });
    renderTodoHeading();
    renderTodoCategories();
    renderTodos();
  }

  /* ======================= 13. Backup ======================= */
  const BACKUP_KEYS = ['savedAffirmations', 'savedQuotes', 'spinnerItems', 'todoTasks', 'spotifyEmbedUrl',
    'timerEndSound', 'clickSoundData', 'spinSoundData', 'resultSoundData', 'backgroundType', 'backgroundData'];

  async function exportBackup() {
    const data = { type: 'wdw-backup', version: 2, exported: new Date().toISOString(), storage: {}, media: {} };
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith('wdw.') || BACKUP_KEYS.includes(k)) data.storage[k] = localStorage.getItem(k);
      }
    } catch { /* ignore */ }
    let skippedVideo = false;
    try {
      for (const key of await mediaDB.keys()) {
        const rec = await mediaDB.get(key);
        if (!rec) continue;
        if (rec.kind === 'blob') {
          if (rec.type === 'video') { skippedVideo = true; continue; }
          data.media[key] = { kind: 'data', name: rec.name, type: rec.type, dataUrl: await blobToDataURL(rec.blob) };
        } else {
          data.media[key] = rec;
        }
      }
    } catch (e) { console.warn(e); }
    download(`dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data));
    toast(skippedVideo ? 'Backup saved (background video not included)' : 'Backup saved');
  }

  async function importBackup(file) {
    let data;
    try { data = JSON.parse(await readText(file)); } catch { data = null; }
    if (!data || data.type !== 'wdw-backup') { toast('That file isn’t a dashboard backup.', 'error'); return; }
    if (!confirm('Replace this browser’s dashboard settings with the backup?')) return;
    try {
      for (const [k, v] of Object.entries(data.storage || {})) localStorage.setItem(k, v);
      for (const [key, rec] of Object.entries(data.media || {})) {
        if (rec.kind === 'data') {
          const blob = await (await fetch(rec.dataUrl)).blob();
          await mediaDB.set(key, { kind: 'blob', blob, name: rec.name, type: rec.type });
        } else {
          await mediaDB.set(key, rec);
        }
      }
      location.reload();
    } catch (e) {
      console.error(e);
      toast('Import stopped part-way — this browser’s storage may be full.', 'error');
    }
  }

  function initBackup() {
    $('#exportBackup').addEventListener('click', exportBackup);
    $('#importBackup').addEventListener('change', e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (f) importBackup(f);
    });
  }

  /* ====================== 14. Start-up ====================== */
  // Save anything still waiting in a debounce when the page closes/reloads.
  window.addEventListener('pagehide', () => {
    store.set('wdw.settings', settings);
    store.set('wdw.theme', theme);
    store.set('wdw.layout', layout);
  });
  applyTheme();
  initThemeControls();
  initPanels();
  initDrawerAndStream();
  initBackground();
  initSounds();
  initTimer();
  initMusic();
  initAffirmations();
  initQuotes();
  initSpinner();
  initTodos();
  initBackup();
})();
