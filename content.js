(() => {
  if (window.__speedAnything) return;
  window.__speedAnything = true;

  const MIN = 0.1;
  const MAX = 100;
  const LADDER = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10,
                  12, 14, 16, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];

  let target = 1;        // speed the user asked for
  let touched = false;   // only enforce speed after the user has changed it
  let keysEnabled = true;
  let applying = false;
  let capped = null;     // set when the browser refuses the requested speed
  let showBadge = true;  // on-video speed indicator
  let flashUntil = 0;    // badge is bright until this timestamp
  let videos = [];       // known media elements (cached)

  const clamp = (n) => Math.min(MAX, Math.max(MIN, Math.round(n * 100) / 100));

  // ---------- finding media (including inside open shadow roots) ----------
  function collect(root, out) {
    root.querySelectorAll('video, audio').forEach((m) => out.push(m));
    root.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) collect(el.shadowRoot, out);
    });
    return out;
  }
  const allMedia = () => collect(document, []);

  // ---------- applying speed ----------
  function applyTo(el) {
    if (!touched) return;
    applying = true;
    try {
      el.playbackRate = target;
    } catch (e) {
      // Browser rejected this rate; fall back to the highest it accepts.
      try { el.playbackRate = 16; } catch (e2) {}
    }
    try { el.defaultPlaybackRate = el.playbackRate; } catch (e) {}
    try { el.preservesPitch = true; } catch (e) {}
    applying = false;
    capped = Math.abs(el.playbackRate - target) > 0.01 ? el.playbackRate : null;
  }
  const applyAll = () => { videos = allMedia(); videos.forEach(applyTo); };

  function setSpeed(value, announce) {
    target = clamp(value);
    touched = true;
    startLoop();
    applyAll();
    if (announce) flash();
  }

  function step(dir) {
    const cur = target;
    let next;
    if (dir > 0) next = LADDER.find((s) => s > cur + 0.001) ?? MAX;
    else next = [...LADDER].reverse().find((s) => s < cur - 0.001) ?? MIN;
    setSpeed(next, true);
  }

  // Sites often reset the rate (new video, own controls). Re-apply ours.
  document.addEventListener('ratechange', (e) => {
    if (applying || !touched) return;
    const el = e.target;
    if (el instanceof HTMLMediaElement && Math.abs(el.playbackRate - target) > 0.01 && capped === null) {
      applyTo(el);
    }
  }, true);
  ['loadedmetadata', 'loadeddata', 'play', 'playing'].forEach((ev) =>
    document.addEventListener(ev, (e) => {
      if (e.target instanceof HTMLMediaElement) {
        if (!videos.includes(e.target)) videos.push(e.target);
        applyTo(e.target);
      }
    }, true)
  );

  // Catch players added later
  let scanTimer = null;
  new MutationObserver(() => {
    if (!touched || scanTimer) return;
    scanTimer = setTimeout(() => { scanTimer = null; applyAll(); }, 400);
  }).observe(document, { childList: true, subtree: true });

  // ---------- on-video speed badge ----------
  // One badge per <video>, pinned to its top-left corner. It shows whenever the
  // speed isn't 1x, stays subtle, and lights up briefly when the speed changes.
  const badges = new Map();
  let rafId = 0;

  function flash() { flashUntil = performance.now() + 1500; }

  function makeBadge() {
    const b = document.createElement('div');
    b.style.cssText =
      'position:fixed;top:0;left:0;z-index:2147483647;pointer-events:none;' +
      'padding:3px 10px;border-radius:6px;background:#15171b;color:#4cc2a4;' +
      'border:1px solid #2c313a;font:600 14px/1.45 system-ui,sans-serif;' +
      'font-variant-numeric:tabular-nums;transition:opacity .3s;display:none;';
    return b;
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    const flashing = performance.now() < flashUntil;
    const fs = document.fullscreenElement;
    const host = fs || document.documentElement;
    const seen = new Set();

    for (const v of videos) {
      if (!v.isConnected || v.tagName !== 'VIDEO') continue;
      seen.add(v);
      let b = badges.get(v);
      if (!b) { b = makeBadge(); badges.set(v, b); }

      const r = v.getBoundingClientRect();
      const rate = Math.round(v.playbackRate * 100) / 100;
      const onScreen = r.width >= 120 && r.height >= 70 && r.bottom > 0 && r.right > 0 &&
                       r.top < innerHeight && r.left < innerWidth && (!fs || fs.contains(v));
      if (!showBadge || !onScreen || (rate === 1 && !flashing)) {
        b.style.display = 'none';
        continue;
      }
      if (b.parentNode !== host) host.appendChild(b);
      const text = rate + '×' + (capped ? ' (max)' : '');
      if (b.textContent !== text) b.textContent = text;
      b.style.transform = 'translate(' + (Math.max(r.left, 0) + 12) + 'px,' + (Math.max(r.top, 0) + 12) + 'px)';
      b.style.opacity = flashing ? '1' : '0.7';
      b.style.display = 'block';
    }

    for (const [v, b] of badges) {
      if (!seen.has(v)) { b.remove(); badges.delete(v); }
    }
  }
  function startLoop() { if (!rafId) rafId = requestAnimationFrame(tick); }

  // ---------- keyboard: + and - ----------
  function isTyping(t) {
    if (!t || !t.tagName) return false;
    const tag = t.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
  }
  window.addEventListener('keydown', (e) => {
    if (!keysEnabled || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
    let dir = 0;
    if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') dir = 1;
    else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') dir = -1;
    if (!dir || !allMedia().length) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    step(dir);
  }, true);

  // ---------- popup messaging ----------
  try {
    chrome.storage.local.get({ keysEnabled: true, showBadge: true }, (r) => {
      keysEnabled = r.keysEnabled;
      showBadge = r.showBadge;
    });
    chrome.storage.onChanged.addListener((c) => {
      if (c.keysEnabled) keysEnabled = c.keysEnabled.newValue;
      if (c.showBadge) showBadge = c.showBadge.newValue;
    });
  } catch (e) {}

  chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
    if (msg.type === 'setSpeed') setSpeed(msg.speed, true);
    if (msg.type === 'step') step(msg.dir);
    if (msg.type === 'getState' || msg.type === 'setSpeed' || msg.type === 'step') {
      // Only frames that actually contain media answer, so the popup hears the right one.
      if (allMedia().length) respond({ speed: target, capped, count: allMedia().length });
    }
  });
})();
