const MIN = 0.1, MAX = 100;
const PRESETS = [0.5, 1, 1.5, 2, 3, 4, 8, 16, 50, 100];
const $ = (id) => document.getElementById(id);
const num = $('num'), slider = $('slider'), status = $('status');

const clamp = (n) => Math.min(MAX, Math.max(MIN, Math.round(n * 100) / 100));
// Slider is logarithmic so 1x–16x isn't squashed into a sliver.
const toSlider = (s) => Math.round(1000 * Math.log(s / MIN) / Math.log(MAX / MIN));
const fromSlider = (v) => MIN * Math.pow(MAX / MIN, v / 1000);

PRESETS.forEach((p) => {
  const b = document.createElement('button');
  b.textContent = p + '×';
  b.dataset.v = p;
  b.onclick = () => send({ type: 'setSpeed', speed: p });
  $('presets').appendChild(b);
});

function render(speed, capped) {
  num.value = speed;
  slider.value = toSlider(speed);
  document.querySelectorAll('#presets button').forEach((b) =>
    b.classList.toggle('on', Number(b.dataset.v) === speed));
  status.className = capped ? 'warn' : 'mut';
  status.textContent = capped
    ? `This browser limits playback to ${capped}× on this video.`
    : '';
}

async function send(msg) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  if (msg.type === 'setSpeed') render(clamp(msg.speed));   // update UI right away
  try {
    const res = await chrome.tabs.sendMessage(tab.id, msg);
    if (res) render(res.speed, res.capped);
    else noVideo();
  } catch (e) {
    noVideo(true);
  }
}

function noVideo(unreachable) {
  status.className = 'mut';
  status.textContent = unreachable
    ? 'Can’t reach this page. Try reloading it, or open a normal website.'
    : 'No video found on this page yet. Start playing one, then adjust.';
}

$('plus').onclick = () => send({ type: 'step', dir: 1 });
$('minus').onclick = () => send({ type: 'step', dir: -1 });
slider.oninput = () => send({ type: 'setSpeed', speed: fromSlider(Number(slider.value)) });
num.onchange = () => { const v = parseFloat(num.value); if (!isNaN(v)) send({ type: 'setSpeed', speed: v }); };
num.onkeydown = (e) => { if (e.key === 'Enter') num.blur(); };

chrome.storage.local.get({ keysEnabled: true, showBadge: true }, (r) => {
  $('keys').checked = r.keysEnabled;
  $('badge').checked = r.showBadge;
});
$('keys').onchange = () => chrome.storage.local.set({ keysEnabled: $('keys').checked });
$('badge').onchange = () => chrome.storage.local.set({ showBadge: $('badge').checked });

(async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'getState' });
    if (res) render(res.speed, res.capped); else { render(1); noVideo(); }
  } catch (e) { render(1); noVideo(true); }
})();
