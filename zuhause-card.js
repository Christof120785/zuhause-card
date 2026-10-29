// Zuhause-Karte, Lader. Nicht von Hand bearbeiten: Quelle ist card.js, erzeugt mit build.sh.
(async () => {
  if (customElements.get('zuhause-card')) return;
  const url = 'https://raw.githubusercontent.com/Christof120785/zuhause-card/main/card.js?t=' + Date.now();
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const u = URL.createObjectURL(new Blob([await r.text()], { type: 'text/javascript' }));
    window.__zuhauseSrc = 'github';
    await import(u);
    if (customElements.get('zuhause-card')) return;
  } catch (e) { /* offline: eingebaute Kopie */ }
  window.__zuhauseSrc = 'lokal';
  zuhauseLocal();
})();

function zuhauseLocal() {
// Zuhause-Karte: komplette Startseite als eine Karte für Home Assistant.
// Alle Geräte stehen in der Dashboard-Konfiguration (type: custom:zuhause-card), nicht in dieser Datei.
// Leere Einträge sind vorbereitet und zeigen "noch nicht verbunden".
// Räume, Licht, Jalousien, Heizung und Szenen kommen automatisch aus den Bereichen in Home Assistant.
const VERSION = '2.18.0';

// Die App lässt die Seite im Hintergrund offen. Beim Zurückkehren prüfen, ob es eine neue Version gibt, und dann neu laden.
if (!window.__zuhauseUpd) {
  window.__zuhauseUpd = true;
  let last = Date.now();
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || Date.now() - last < 30000) return;
    last = Date.now();
    try {
      const r = await fetch('https://raw.githubusercontent.com/Christof120785/zuhause-card/main/card.js?t=' + Date.now(), { cache: 'no-store' });
      const m = r.ok && (await r.text()).match(/const VERSION = '([^']+)'/);
      if (m && m[1] !== VERSION) location.reload();
    } catch (e) { /* offline: alte Version bleibt */ }
  });
}

// Kacheln unter der Begrüßung: Name, Breite am großen Bildschirm (von 12), Breite am Tablet (von 2)
const TILES = {
  energy: ['Energie & Wallbox', 8, 1], cams: ['Kameras', 4, 1], home: ['Räume', 8, 2], waste: ['Müllabfuhr', 4, 1],
  wx: ['Wetter', 8, 1], hist: ['Energiebilanz', 12, 2], sec: ['Sicherheit', 4, 1]
};

// Lampen für das Karussell unter dem Energie-Haus: Name im Dashboard, Suchmuster für den Namen in Home Assistant
const FAV = [['Wohnzimmer klein', /^wohnzimmer klein$/i], ['Wohnzimmer groß', /^wohnzimmer( gro(ß|ss))?$/i], ['Küche', /k(ü|ue|u)che/i],
  ['Flur', /flur/i], ['Esszimmer', /esszimmer/i], ['Carport', /carportlicht( 1)?$/i]];

// Haus-Bild für die Energie-Kachel (liegt im Repo)
const HAUS = 'https://raw.githubusercontent.com/Christof120785/zuhause-card/main/img/haus-energie2.webp';

// Farben für Lampen: Name, Farbton
const LCOL = [['Rot', 0], ['Orange', 28], ['Gelb', 55], ['Grün', 110], ['Türkis', 180], ['Blau', 235], ['Lila', 290]];

const DEFAULTS = {
  name: '',
  images: '/local/dashboard/',
  weather: '', waste: '', pv: '', grid_in: '', grid_out: '',
  wallbox: '', wallbox_release: '', car_soc: '', car_power: '',
  batteries: [], contacts: [], rooms: [], switches: [], scene_rooms: [], cameras: [],
};

const IC = {
  sofa: '<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M3 11h18v6H3zM5 17v2M19 17v2"/>',
  bed: '<path d="M3 18V7M3 13h18v5M21 18v-5a3 3 0 0 0-3-3h-7v3"/>',
  desk: '<path d="M3 8h18M5 8v12M19 8v12M14 8v6h5"/>',
  bath: '<path d="M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM6 12V5a2 2 0 0 1 4 0"/>',
  kid: '<circle cx="12" cy="7" r="3"/><path d="M6 21v-4a6 6 0 0 1 12 0v4"/>',
  lamp: '<path d="M8 3h8l3 8H5zM12 11v10M8 21h8"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  cam: '<path d="M3 7h12v10H3zM15 10l6-3v10l-6-3z"/>',
  blind: '<path d="M4 4h16M5 4v12h14V4M5 8h14M5 12h14M12 16v4"/>',
  heat: '<path d="M12 3v11M9 6h6M9 9h6"/><circle cx="12" cy="17" r="3"/>',
  plug: '<path d="M9 3v5M15 3v5M7 8h10v4a5 5 0 0 1-10 0zM12 17v4"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M4 21h16"/><circle cx="14.5" cy="12" r="1"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
};
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[k] || ''}</svg>`;
const de = (v, d = 1) => Number(v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const WX = { 'clear-night': 'Klar', cloudy: 'Bewölkt', fog: 'Nebel', hail: 'Hagel', lightning: 'Gewitter', 'lightning-rainy': 'Gewitter', partlycloudy: 'Teils bewölkt', pouring: 'Starkregen', rainy: 'Regen', snowy: 'Schnee', 'snowy-rainy': 'Schneeregen', sunny: 'Sonnig', windy: 'Windig', 'windy-variant': 'Windig', exceptional: 'Unwetter' };
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const WXS = { 'clear-night': 'Klar', cloudy: 'Wolken', fog: 'Nebel', hail: 'Hagel', lightning: 'Gewitter', 'lightning-rainy': 'Gewitter', partlycloudy: 'Heiter', pouring: 'Starkregen', rainy: 'Regen', snowy: 'Schnee', 'snowy-rainy': 'Schneeregen', sunny: 'Sonne', windy: 'Wind', 'windy-variant': 'Wind', exceptional: 'Unwetter' };
const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function wxIcon(c) {
  c = c || '';
  const sun = '<circle cx="16" cy="16" r="6" fill="var(--sun)"/><g stroke="var(--sun)" stroke-width="2" stroke-linecap="round"><path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2 2M22.5 22.5l2 2M7.5 24.5l2-2M22.5 9.5l2-2"/></g>';
  const cl = '<path d="M9 25h14a5 5 0 0 0 0-10 7 7 0 0 0-13.5 2A4 4 0 0 0 9 25z" fill="var(--faint)"/>';
  const dk = '<path d="M9 25h14a5 5 0 0 0 0-10 7 7 0 0 0-13.5 2A4 4 0 0 0 9 25z" fill="var(--muted)"/>';
  const rn = '<g stroke="#3f78c4" stroke-width="2" stroke-linecap="round"><path d="M12 28l-1 3M17 28l-1 3M22 28l-1 3"/></g>';
  const rn2 = '<g stroke="#3f78c4" stroke-width="2" stroke-linecap="round"><path d="M10 28l-1.5 4M14 28l-1.5 4M18 28l-1.5 4M22 28l-1.5 4"/></g>';
  const sn = '<g fill="#7fb2e6"><circle cx="11" cy="29.5" r="1.8"/><circle cx="16.5" cy="31" r="1.8"/><circle cx="22" cy="29.5" r="1.8"/></g>';
  const bolt = '<path d="M17 24l-4 6h3l-2 4 6-7h-3l2-3z" fill="var(--sun)"/>';
  const hl = '<g fill="#9fb3c8"><circle cx="11" cy="30" r="2"/><circle cx="17" cy="31" r="2"/><circle cx="23" cy="30" r="2"/></g>';
  const fg = '<g stroke="var(--faint)" stroke-width="2.2" stroke-linecap="round"><path d="M6 14h20M4 19h24M7 24h18M10 29h12"/></g>';
  const wd = '<g fill="none" stroke="var(--faint)" stroke-width="2.2" stroke-linecap="round"><path d="M4 13h16a3.5 3.5 0 1 0-3.5-3.5M4 19h21a3.5 3.5 0 1 1-3.5 3.5M4 25h11"/></g>';
  const moon = '<path d="M20 7a9 9 0 1 0 6 13 7 7 0 0 1-6-13z" fill="var(--grid)"/>';
  const g = c === 'sunny' ? sun : c === 'clear-night' ? moon
    : c === 'partlycloudy' ? '<circle cx="12" cy="12" r="5" fill="var(--sun)"/>' + cl
    : c === 'pouring' ? dk + rn2 : c === 'rainy' ? cl + rn
    : c === 'snowy' ? cl + sn : c === 'snowy-rainy' ? cl + '<g stroke="#3f78c4" stroke-width="2" stroke-linecap="round"><path d="M12 28l-1 3M22 28l-1 3"/></g><circle cx="17" cy="30" r="1.8" fill="#7fb2e6"/>'
    : c === 'lightning' ? dk + bolt : c === 'lightning-rainy' ? dk + bolt + '<g stroke="#3f78c4" stroke-width="2" stroke-linecap="round"><path d="M10 28l-1 3M24 28l-1 3"/></g>'
    : c === 'hail' ? cl + hl : c === 'fog' ? fg : /windy/.test(c) ? wd : c === 'exceptional' ? dk + bolt : c === 'cloudy' ? '<path d="M14 15a6 6 0 0 1 11 2" fill="none" stroke="var(--faint)" stroke-width="2"/>' + cl : cl;
  return `<svg viewBox="0 0 32 34" aria-hidden="true">${g}</svg>`;
}

const CSS = `
:host{
  --bg:#e9edf3; --card:#ffffff; --tile:#f3f5f8; --line:#e3e7ee;
  --fg:#1b2430; --muted:#6b7684; --faint:#9aa3ae;
  --hero:#1e2b3a; --hero-fg:#f2f5f8; --hero-mut:#a9b6c3;
  --sun:#d99a1c; --sun-soft:#fbf3dc; --batt:#3c9a64; --batt-soft:#e3f2e8;
  --grid:#6c63c9; --grid-soft:#ebe9f8; --house:#3f5163; --house-soft:#eaeef3;
  --ok:#3c9a64; --warn:#c8641f; --warn-soft:#fbe9dc; --pic:#f4f5f7;
  --display:"Sora",system-ui,sans-serif; --body:"DM Sans",system-ui,sans-serif;
  display:block;
}
:host(.dark){
  --bg:#10161d; --card:#1a222c; --tile:#222c37; --line:#2b3642;
  --fg:#e9eef3; --muted:#9eabb8; --faint:#6f7c89;
  --hero:#0b1118; --hero-mut:#93a1ae;
  --sun:#efb544; --sun-soft:#3a2f17; --batt:#62c48b; --batt-soft:#173327;
  --grid:#9d95ef; --grid-soft:#26244a; --house:#b9c6d2; --house-soft:#26313d;
  --ok:#62c48b; --warn:#ef8a4a; --warn-soft:#3a2416; --pic:#e9ebee;
}
*{box-sizing:border-box}
.wrap{background:var(--bg);color:var(--fg);font-family:var(--body);font-size:14px;line-height:1.35;padding:12px;min-height:100vh}
.grid{display:grid;gap:12px;grid-template-columns:1fr}
@media(min-width:700px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero,.wide{grid-column:1/-1}}
@media(min-width:1100px){.grid{grid-template-columns:repeat(12,minmax(0,1fr))}
  .hero{grid-column:span 12}.grid>section[data-sec]{grid-column:span var(--sp,12)}}
@media(min-width:700px) and (max-width:1099px){.grid>section[data-sec]{grid-column:span var(--sp2,1)}}
.card.shid{opacity:.45}
.tbar{display:flex;align-items:center;gap:6px;margin:-4px 0 10px;padding:6px 8px;border:1px dashed var(--line);border-radius:12px;font-size:12px;font-weight:600}
.tbar span{flex:1}
.tbar[hidden],.card[hidden]{display:none}
.tbar button{all:unset;cursor:pointer;min-width:28px;height:28px;padding:0 8px;border-radius:8px;background:var(--line);display:flex;gap:4px;align-items:center;justify-content:center}
.card .tbar svg{width:15px;height:15px}
.card{background:var(--card);border-radius:20px;padding:14px 16px;min-width:0;box-shadow:0 1px 2px rgba(20,30,50,.05)}
.eyebrow{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);font-weight:600;display:flex;justify-content:space-between;gap:8px}
.eyebrow span:last-child{letter-spacing:.02em;text-transform:none;color:var(--muted)}
h2{font-family:var(--display);font-size:16px;font-weight:600;margin:4px 0 2px}
.sub{font-size:12px;color:var(--muted);margin:0 0 10px}
.num{font-variant-numeric:tabular-nums}
.pill{font-size:11px;font-weight:600;padding:3px 9px;border-radius:99px;background:var(--sun-soft);color:var(--sun);white-space:nowrap}
.pill.off{background:var(--tile);color:var(--muted)}
.pill.warn{background:var(--warn-soft);color:var(--warn)}
.pill.info{background:var(--grid-soft);color:var(--grid)}
/* hero */
.hero{position:relative;background:var(--hero);color:var(--hero-fg);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end}
.ver{position:absolute;top:6px;right:12px;font-size:9px;color:var(--hero-mut);opacity:.6;letter-spacing:.04em}
.hero h1{font-family:var(--display);font-size:26px;line-height:1.1;margin:0;font-weight:700;letter-spacing:-.02em}
.hero h1 em{font-style:normal;color:#b9e3c8}
.hero p{color:var(--hero-mut);font-size:12.5px;margin:4px 0 10px}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{border:1px solid rgba(255,255,255,.18);border-radius:99px;padding:4px 11px;font-size:12px}
.wxn{text-align:right}
.wxn .t{font-family:var(--display);font-size:30px;font-weight:600}
.wxn .t small{font-size:14px;color:var(--hero-mut)}
.wxn div{font-size:12px;color:var(--hero-mut)}
/* Alarm im Kopf */
.hr{display:flex;gap:14px;align-items:stretch;flex-wrap:wrap;justify-content:flex-end}
.hr .wxn{align-self:flex-end}
.hero .alarm{margin:0;background:rgba(98,196,139,.16);color:var(--hero-fg);grid-template-columns:1fr;min-width:230px}
.hero .alarm.on{background:rgba(239,138,74,.22)}
.hero .alarm span{color:var(--hero-mut)}
.hero .alarm .st svg{color:#7fd6a2}.hero .alarm.on .st svg{color:#ffb07a}
.hero .cf button{background:rgba(255,255,255,.16);color:var(--hero-fg)}.hero .cf .y{background:#c83a3a}
@media(max-width:520px){.hr{width:100%;justify-content:space-between}.hero .alarm{flex:1;min-width:0}}
/* energy */
.stage{position:relative;border-radius:18px;overflow:hidden;background:linear-gradient(#9faabb,#adb2be);padding:74px 0 86px;margin-bottom:2px}
.hbox{position:relative;max-width:620px;margin:0 auto}.hbox img{display:block;width:100%;height:auto;-webkit-mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent),linear-gradient(transparent,#000 9%,#000 94%,transparent);-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent),linear-gradient(transparent,#000 9%,#000 94%,transparent);mask-composite:intersect}
.lab{position:absolute;color:#fff;text-shadow:0 1px 3px rgba(30,40,60,.35);white-space:nowrap}
.lab.up{bottom:calc(100% + 6px)}.lab.dn{top:calc(100% + 6px)}.lab[data-more]{cursor:pointer}
.lab .t{font-size:13px;opacity:.92}.lab .v{font-family:var(--display);font-size:22px;font-weight:700;line-height:1.15}
.lab .v small{font-size:13px;font-weight:600;margin-left:3px}.lab .s{font-size:12.5px;opacity:.95}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:1px;transition:opacity .3s}
.dot.idle{opacity:.35}
/* Pfeile (Chevrons), die nacheinander aufleuchten: Richtung = wohin der Strom fließt */
.flow{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.flow g{transition:opacity .3s}.flow g.idle{opacity:0}
.flow g path{opacity:.18;animation:chv 1.2s linear infinite;filter:drop-shadow(0 0 3px rgba(255,255,255,.55))}
@keyframes chv{0%{opacity:.18}25%{opacity:1}55%,100%{opacity:.18}}
@media(prefers-reduced-motion:reduce){.flow g path{animation:none;opacity:.8}}
@media(max-width:520px){.lab .v{font-size:18px}.lab .v small{font-size:12px}}
.fav{position:relative;height:146px;margin:12px 0 0;border-radius:18px;background:linear-gradient(160deg,#2b3b4f,var(--hero));box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);perspective:720px;overflow:hidden;touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:grab}
.fav::before{content:"";position:absolute;left:50%;bottom:8px;width:62%;height:26px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.07),transparent)}
.fi{position:absolute;left:50%;top:16px;width:140px;margin-left:-70px;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11.5px;color:var(--hero-mut);text-align:center;will-change:transform,opacity}
.fav:not(.drag) .fi{transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .45s}
.fi i{width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.1);color:#d6dee6;display:grid;place-items:center;margin:4px 0 7px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 8px 16px rgba(0,0,0,.25);transition:background .25s,color .25s,box-shadow .25s}
.fi i svg{width:24px;height:24px}
.fi b{font-weight:700;font-size:13px;color:var(--hero-fg);line-height:1.2;white-space:nowrap;opacity:var(--lo,1)}
.fi span{font-size:11.5px;opacity:var(--lo,1)}
.fi.on i{background:var(--sun);color:#fff;box-shadow:0 0 0 6px rgba(239,181,68,.22),0 0 26px rgba(239,181,68,.45)}
.fi.na{filter:grayscale(1)}
.carrow{display:flex;align-items:center;gap:10px;margin-top:12px;font-size:13.5px;color:var(--muted);cursor:pointer}.carrow b{color:var(--fg)}
.cbar{flex:1;height:7px;border-radius:9px;background:var(--tile);overflow:hidden;min-width:40px}.cbar i{display:block;height:100%;width:0;background:var(--grid);border-radius:9px}
.tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
@media(max-width:420px){.tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
.tile{border-radius:14px;padding:10px;background:var(--tile);min-width:0}
.tile .l{font-size:11px;color:var(--muted)}
.tile .v{font-family:var(--display);font-size:19px;font-weight:600;margin-top:2px;white-space:nowrap}
.tile .v small{font-size:11px;color:var(--muted);font-weight:500;margin-left:2px}
.tile .s{font-size:11px;color:var(--muted)}
.t-sun{background:var(--sun-soft)}.t-house{background:var(--house-soft)}.t-grid{background:var(--grid-soft)}.t-batt{background:var(--batt-soft)}
.foot{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-top:10px;gap:8px;flex-wrap:wrap}
/* pictures */
.pic{background:var(--pic);border-radius:14px;display:grid;place-items:center;overflow:hidden}
.pic img{display:block;max-width:100%;height:auto;mix-blend-mode:multiply}
.batpic{margin-bottom:8px;min-height:60px}.batpic img{width:60%}
.ph{color:#8a96a2;font-size:12px;padding:16px;text-align:center}
.bat{padding:8px 0;border-top:1px solid var(--line)}
.bl{display:flex;justify-content:space-between;align-items:center;gap:8px}
.bs{font-size:12px;color:var(--muted)}
.prog{height:8px;background:var(--tile);border-radius:99px;overflow:hidden;margin:5px 0}
.prog i{display:block;height:100%;border-radius:99px;background:var(--batt)}
/* wallbox */
.wbpics{display:grid;grid-template-columns:3fr 1fr;gap:8px;margin:4px 0 8px}
.carpic img{width:86%}.wbpic img{width:80%}
.mini{all:unset;cursor:pointer;margin-left:8px;font-size:12px;color:var(--grid);padding:4px 8px;border-radius:8px;background:var(--tile)}
.htip{font-size:12.5px;margin:4px 0 2px;min-height:18px;color:var(--fg)}
.segs{display:flex;gap:8px;margin-top:10px}
.seg{all:unset;cursor:pointer;flex:1;text-align:center;padding:10px 8px;border-radius:12px;background:var(--tile);font-size:13.5px;font-weight:600;color:var(--fg)}
.seg.on{background:var(--sun);color:#fff}
.seg[disabled]{opacity:.45;cursor:default}
.wbt{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
/* security */
.shield{width:64px;height:64px;border-radius:50%;background:var(--batt-soft);color:var(--ok);display:grid;place-items:center;margin:4px auto}
.shield svg{width:30px;height:30px}
.shield.alert{background:var(--warn-soft);color:var(--warn)}
.center{text-align:center}
.stats{display:grid;grid-template-columns:repeat(3,1fr);margin:8px 0;text-align:center}
.stats div+div{border-left:1px solid var(--line)}
.stats b{font-family:var(--display);font-size:20px;display:block}
.stats span{font-size:11px;color:var(--muted)}
.row{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--line);font-size:13px}
.row:first-of-type{border-top:0}
.row .txt{flex:1;min-width:0}
.row .txt b{font-weight:600;display:block}
.row .txt span{font-size:11.5px;color:var(--muted)}
/* rooms */
.rooms{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
@media(max-width:420px){.rooms{grid-template-columns:repeat(2,minmax(0,1fr))}}
.room{background:var(--tile);border-radius:14px;padding:10px;cursor:pointer}
.room .l{font-size:11.5px;color:var(--muted);margin-top:6px}
.room .v{font-family:var(--display);font-size:20px;font-weight:600}
.room .v small{font-size:11px;color:var(--muted)}
.room .h{font-size:11px;color:var(--faint)}
.ico{width:26px;height:26px;border-radius:8px;background:var(--card);display:grid;place-items:center;color:var(--muted);flex:none}
.ico svg{width:15px;height:15px}
/* switches */
.tg{all:unset;cursor:pointer;width:40px;height:23px;border-radius:99px;background:var(--line);position:relative;flex:none;transition:background .2s}
.tg::after{content:"";position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .2s}
.tg[aria-checked="true"]{background:var(--sun)}
.tg[aria-checked="true"]::after{transform:translateX(17px)}
.tg:focus-visible,.btn:focus-visible{outline:2px solid var(--grid);outline-offset:2px}
.stats.two{grid-template-columns:repeat(2,1fr)}
.dim{display:block;width:100%;margin:4px 0 0;accent-color:var(--sun)}
.dim[hidden]{display:none}
.cols{display:flex;gap:9px;align-items:center;flex-wrap:wrap;width:100%;margin:8px 0 2px}
.cdot{all:unset;cursor:pointer;width:24px;height:24px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.cdot.on{outline:2px solid var(--fg);outline-offset:2px}
.cdot.cw{background:linear-gradient(135deg,#fff,#ffe3b8)}
.cmore{all:unset;cursor:pointer;margin-left:auto;font-size:12px;padding:5px 11px;border-radius:99px;background:var(--tile);color:var(--fg)}
.row .txt[data-more]{cursor:pointer}
.scn{border-top:1px solid var(--line);margin-top:6px;padding-top:8px}
.scl{font-size:11px;color:var(--muted);margin-bottom:6px}
.scw{display:flex;flex-wrap:wrap;gap:6px}
.row+.scw,.row+input+.scw{margin:2px 0 10px 34px}
.scb{all:unset;cursor:pointer;font-size:12px;font-weight:600;padding:6px 11px;border-radius:99px;background:var(--sun-soft);color:var(--sun)}
.scb:focus-visible{outline:2px solid var(--grid);outline-offset:2px}
.swg{display:grid;grid-template-columns:1fr 1fr;column-gap:14px}
.swg .row:nth-child(2){border-top:0}
/* Räume */
.hhead{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap}
.arr{all:unset;cursor:pointer;border:1px solid var(--line);border-radius:10px;padding:6px 10px;font-size:12px;font-weight:600}
.arr[aria-pressed="true"]{background:var(--hero);color:var(--hero-fg);border-color:var(--hero)}
.quick{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}
.qb{all:unset;cursor:pointer;display:flex;gap:6px;align-items:center;background:var(--tile);border-radius:10px;padding:7px 10px;font-size:12px;font-weight:600}
.qb svg{width:15px;height:15px}
.qb.on{background:var(--warn);color:#fff}
.rg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;grid-auto-flow:row dense}
@media(min-width:560px){.rg{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(min-width:1400px){.rg{grid-template-columns:repeat(4,minmax(0,1fr))}}
.rt{box-sizing:border-box;cursor:pointer;background:var(--tile);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:4px;position:relative;min-width:0}
.rt[aria-expanded="true"]{outline:2px solid var(--hero)}
.rt.hid{opacity:.4}
.rt b{font-weight:600;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rt .v{font-family:var(--display);font-size:19px;font-weight:600}
.rt .v small{font-size:11px;color:var(--muted)}
.rt .m{display:flex;gap:4px;flex-wrap:wrap}
.rt .pill{font-size:10.5px;padding:2px 7px}
.rt .pill.off{background:var(--card)}
.mv{display:flex;gap:4px;margin-top:4px}
.mv button{all:unset;cursor:pointer;width:28px;height:28px;border-radius:8px;background:var(--card);display:grid;place-items:center;font-weight:700}
.mv svg{width:15px;height:15px}
.rp{grid-column:1/-1;border:1px solid var(--line);border-radius:14px;padding:8px 12px 12px}
.sect{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);font-weight:600;margin:10px 0 0}
.pos{display:block;width:100%;margin:4px 0 0;accent-color:#3d7fb8}
.cb{display:flex;gap:4px;flex:none}
.cb button,.bst{all:unset;cursor:pointer;border:1px solid var(--line);border-radius:9px;padding:5px 9px;font-size:12px;font-weight:600}
.bst.on{background:var(--warn);color:#fff;border-color:var(--warn)}
.hint{font-size:12px;background:var(--grid-soft);color:var(--grid);border-radius:10px;padding:8px 10px;margin:0 0 10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.hint select,.mg{font:inherit;font-size:11.5px;padding:3px 4px;border-radius:6px;border:1px solid var(--line);background:var(--card);color:var(--fg);max-width:100%}
.rn{font:inherit;font-weight:600;font-size:13px;width:100%;padding:3px 6px;border-radius:7px;border:1px solid var(--line);background:var(--card);color:var(--fg)}
.hint input{width:56px;font:inherit;padding:3px 6px;border-radius:6px;border:1px solid var(--line);background:var(--card);color:var(--fg)}
/* Alarmanlage */
.alarm{border-radius:14px;padding:10px 12px;background:var(--batt-soft);margin:2px 0 10px;display:grid;gap:8px;align-items:center}
@media(min-width:700px){.alarm{grid-template-columns:1fr minmax(260px,auto)}.alarm .cf{grid-column:1/-1}}
.alarm.on{background:var(--warn-soft)}
.alarm .st{display:flex;gap:10px;align-items:center}
.alarm .st svg{width:22px;height:22px;color:var(--ok)}
.alarm.on .st svg{color:var(--warn)}
.alarm b{font-family:var(--display);font-size:14.5px;display:block}
.alarm span{font-size:11.5px;color:var(--muted)}
.ab{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ab button{all:unset;cursor:pointer;text-align:center;border-radius:10px;padding:8px;font-weight:700;font-size:12.5px;color:#fff;background:#c83a3a}
.ab button.off{background:var(--ok)}
.ab button[disabled]{opacity:.4;cursor:default}
.ab.one{grid-template-columns:1fr}.alarm .ab.one{grid-column:1/-1}
.ab button.door{background:rgba(255,255,255,.14);display:flex;gap:6px;justify-content:center;align-items:center}
.ab button.door svg{width:15px;height:15px}
.cf{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12.5px;font-weight:600}
.cf button{all:unset;cursor:pointer;border-radius:9px;padding:6px 11px;font-weight:700;background:var(--card)}
.cf .y{background:#c83a3a;color:#fff}
/* cameras */
.bins .row{gap:12px;padding:8px 0}.bins svg.bin{width:26px;height:32px;flex:none}
.camg{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}
.cam{border-radius:14px;overflow:hidden;background:var(--tile);cursor:pointer}
.cam .view{aspect-ratio:16/9;max-width:100%;position:relative;display:grid;place-items:center;background:var(--house-soft);color:var(--muted)}
.cam .view img{width:100%;height:100%;object-fit:cover;display:block}
.cam .view svg{width:28px;height:28px;opacity:.6}
.cam .live{position:absolute;top:6px;left:6px;background:rgba(200,30,30,.9);color:#fff;font-size:10px;font-weight:600;padding:2px 6px;border-radius:5px}
.cam .meta{padding:6px 9px;display:flex;justify-content:space-between;gap:6px;align-items:center;font-size:12.5px}
.cam .meta span{font-size:11px;color:var(--muted)}
/* weather */
.fc{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;text-align:center}
.fc div{background:var(--tile);border-radius:12px;padding:6px 2px;font-size:11.5px}
.fc b{display:block;font-size:12.5px}
.fc svg{width:26px;height:26px;display:block;margin:3px auto}
.fc .wl{display:block;font-size:10.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px}
.fc .pp svg.dr{display:inline-block;width:8px;height:10px;margin:0 3px 0 0;vertical-align:-1px}
.fc .pp{display:block;margin-top:3px;font-size:11px;color:#3f78c4;font-weight:600}
/* Stundenwetter */
.hrs{overflow-x:auto;margin:0 -4px 10px;padding:0 4px;scrollbar-width:thin}
.rainw{display:flex;align-items:center;gap:8px;margin:2px 0 10px;padding:8px 12px;border-radius:12px;background:rgba(63,120,196,.14);color:var(--fg);font-size:14px}
.rainw[hidden]{display:none}
.rainw svg{width:26px;height:26px;flex:none}
.hrs>svg{display:block;height:150px}
.hrs text{font-family:var(--body);font-size:11.5px;fill:var(--muted)}
.hrs .tt{font-size:13px;font-weight:600;fill:var(--fg)}
.hrs .rp{font-size:10.5px;fill:var(--grid)}
/* Energie-Reiter */
.tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0 10px}
.tabs button{all:unset;cursor:pointer;text-align:center;border:1px solid var(--line);border-radius:10px;padding:7px 4px;font-size:12.5px;font-weight:600;color:var(--muted)}
.tabs button[aria-selected="true"]{background:var(--grid-soft);border-color:var(--grid);color:var(--grid)}
.etot{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-top:10px}
.etot div{background:var(--tile);border-radius:12px;padding:8px 10px;font-size:11.5px;color:var(--muted)}
.etot b{display:block;font-family:var(--display);font-size:17px;color:var(--fg);font-weight:600}
/* history */
.chart svg{width:100%;height:auto;display:block}
.chart text{font-size:10px;fill:var(--faint);font-family:var(--body)}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-top:4px}
.legend span.dsh::before{height:0;border-top:2px dashed var(--c);background:none;border-radius:0}
.legend span::before{content:"";display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;background:var(--c);vertical-align:-1px}
.btn{all:unset;cursor:pointer;display:flex;justify-content:space-between;background:var(--batt-soft);color:var(--ok);border-radius:12px;padding:9px 12px;font-size:12.5px;font-weight:600}
`;

class ZuhauseCard extends HTMLElement {
  setConfig(config) {
    this._cfg = Object.assign({}, DEFAULTS, config || {});
    // Kameras ohne Bild in Home Assistant (app: true) werden nicht angezeigt
    this._cfg.cameras = (this._cfg.cameras || []).filter(m => !m.app);
    this._built = false;
  }
  getCardSize() { return 20; }
  getGridOptions() { return { columns: 'full' }; }

  set hass(hass) {
    this._hass = hass;
    if (!this._lay) this._loadLayout();
    this._cams = this._camList();
    const sig = this._cams.map(m => m.id + '|' + m.name).join(',');
    if (sig !== this._camSig) { this._camSig = sig; this._built = false; }
    if (!this._built) this._build();
    this.classList.toggle('dark', !!(hass.themes && hass.themes.darkMode));
    this._update();
    if (!this._fcSub && hass.connection && this._cfg.weather && hass.states[this._cfg.weather]) this._subForecast();
    if (!this._wasteT || Date.now() - this._wasteT > 30 * 60 * 1000) { this._wasteT = Date.now(); this._loadWaste(); }
    if (!this._histT || Date.now() - this._histT > 15 * 60 * 1000) { this._histT = Date.now(); this._loadHistory(); }
    if (!this._ccuT || Date.now() - this._ccuT > 60 * 1000) this._refreshCcu();
    if (!this._visL) { this._visL = true; document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this._refreshCcu(); }); }
  }

  // Systemvariablen (z. B. Alarmstatus "Anwesenheit") frisch von der CCU holen: beim Öffnen und danach jede Minute.
  // So stimmt der Status auch, wenn er über CloudMatic, eine Fernbedienung oder ein anderes Handy geändert wurde.
  async _refreshCcu() {
    const h = this._hass; if (!h || document.visibilityState === 'hidden') return;
    this._ccuT = Date.now();
    const svc = h.services && h.services.homematicip_local;
    if (!svc || !svc.fetch_system_variables) return;
    if (!this._hmEntry) {
      try { const es = await h.callWS({ type: 'config_entries/get', domain: 'homematicip_local' }); this._hmEntry = es && es[0] && es[0].entry_id; } catch (e) { /* kein Zugriff */ }
    }
    if (this._hmEntry) h.callService('homematicip_local', 'fetch_system_variables', { entry_id: this._hmEntry }).catch(() => {});
  }

  _s(id) { return id && this._hass.states[id]; }
  _n(id) { const s = this._s(id); if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  // Leistung immer in kW, egal ob der Sensor W oder kW liefert
  // Speicher ohne eingetragene Sensoren: Anker Solarbank (Integration "Anker SOLIX Official") selbst finden
  _ankerEnt(re, ex) {
    return Object.values(this._hass.states).find(x => x.entity_id.startsWith('sensor.') && /solarbank|anker solix/i.test(x.attributes.friendly_name || '')
      && re.test(x.attributes.friendly_name || '') && !(ex && ex.test(x.attributes.friendly_name || '')));
  }
  // Marstek B2500 (App "hm2mqtt" über MQTT) selbst finden: je Gerät Ladestand, Solar-Eingang (die Module) und Ausgang
  _marstek() {
    const g = {}, key = { 'battery percentage': 'soc', 'total input power': 'in', 'total output power': 'out', 'input 1 power': 'i1', 'input 2 power': 'i2' };
    Object.values(this._hass.states).forEach(x => {
      const n = (x.attributes.friendly_name || '').trim();
      if (!x.entity_id.startsWith('sensor.') || !(/hame|b2500|marstek/i.test(n) || (this._hass.entities && (this._hass.entities[x.entity_id] || {}).platform === 'mqtt'))) return;
      const m = n.match(/^(.*?)\s*(battery percentage|total input power|total output power|input [12] power)$/i);
      if (m) (g[m[1]] = g[m[1]] || {})[key[m[2].toLowerCase()]] = x.entity_id;
    });
    return Object.values(g).filter(d => d.soc || d.in);
  }
  _isM(b) { return !b.soc && !b.power && /marstek|b2500/i.test(b.name || ''); }
  _mIn() { return this._marstek().reduce((a, d) => a + (this._kw(d.in) || 0), 0); }
  _batSoc(b) {
    if (this._isM(b)) { const v = this._marstek().map(d => this._n(d.soc)).filter(x => x !== null); return v.length ? v.reduce((a, x) => a + x, 0) / v.length : null; }
    if (b.soc || !/anker|solix/i.test(b.name || '')) return this._n(b.soc);
    const x = Object.values(this._hass.states).find(x => x.entity_id.startsWith('sensor.') && x.attributes.device_class === 'battery' && /solarbank|anker solix/i.test(x.attributes.friendly_name || ''));
    return x ? this._n(x.entity_id) : null;
  }
  _batP(b) {
    if (this._isM(b)) { const d = this._marstek().filter(d => d.in || d.out); return d.length ? d.reduce((a, x) => a + (this._kw(x.in) || 0) - (this._kw(x.out) || 0), 0) : null; }
    if (b.power || !/anker|solix/i.test(b.name || '')) return this._kw(b.power);
    const ch = this._ankerEnt(/ladeleistung|charging power|charge power/i, /entlade|discharg/i), dis = this._ankerEnt(/entladeleistung|discharg\w* power/i);
    if (!ch && !dis) return null;
    return (ch ? this._kw(ch.entity_id) || 0 : 0) - (dis ? this._kw(dis.entity_id) || 0 : 0);
  }
  _kw(id) {
    const s = this._s(id); const v = this._n(id); if (v === null) return null;
    const u = (s.attributes.unit_of_measurement || 'W').toLowerCase();
    return u === 'kw' ? v : u === 'mw' ? v * 1000 : v / 1000;
  }

  _build() {
    if (!document.getElementById('zuhause-fonts')) {
      const l = document.createElement('link');
      l.id = 'zuhause-fonts'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=DM+Sans:wght@400;500;600&display=swap';
      document.head.appendChild(l);
    }
    const c = this._cfg;
    const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
    const bats = c.batteries.map((b, i) => `
      <div class="bat"><div class="bl"><b>${b.name}</b><span data-k="bsoc${i}" class="num"></span></div>
      <div class="prog"><i data-k="bbar${i}" style="width:0"></i></div><div class="bs" data-k="bsub${i}"></div></div>`).join('');
    const firstPic = c.batteries.find(b => b.img);
    const cams = this._cams.map((m, i) => `<div class="cam" data-cam="${i}"><div class="view" data-k="cv${i}">${svg('cam')}</div>
      <div class="meta"><b>${m.name}</b><span data-k="cs${i}">${m.brand}</span></div></div>`).join('');
    const contacts = c.contacts.map((k, i) => `<div class="row" data-k="crow${i}"><div class="txt" data-more="${k.entity}"><b>${k.name}</b></div><span class="pill" data-k="ct${i}"></span><button class="mini" data-chide="${k.entity}" data-k="chb${i}" hidden></button></div>`).join('');

    // Pfeilkette von a nach b (senkrecht), die Pfeile leuchten nacheinander in Flussrichtung auf
    const chev = (k, x, a, b, col) => {
      const L = Math.abs(b - a), n = Math.max(2, Math.min(4, Math.round(L / 44))), sc = Math.min(1.5, L / n / 24);
      return `<g data-k="${k}" class="idle" fill="${col}">` + Array.from({ length: n }, (_, i) => `<path d="M-16 -13L0 1L16 -13L16 -3L0 11L-16 -3Z" transform="translate(${x} ${a + (i + 0.5) * (b - a) / n}) rotate(${b > a ? 0 : 180}) scale(${sc.toFixed(2)})" style="animation-delay:${(i * 0.22).toFixed(2)}s"/>`).join('') + '</g>';
    };
    root.innerHTML = `<style>${CSS}</style><div class="wrap"><div class="grid">
      <section class="card hero"><span class="ver">v${VERSION}${window.__zuhauseSrc === 'lokal' ? ' · lokal' : ''}</span>
        <div><h1><span data-k="greet">Hallo</span>,<br><em><span data-k="uname">${c.name}</span>.</em></h1>
          <p>Dein Zuhause. Ein Blick. Alles Wichtige.</p>
          <div class="chips"><span class="chip" data-k="chOpen"></span></div></div>
        <div class="hr"><div class="wxn"><div class="t num"><span data-k="wt">–</span><small>°C</small></div><div data-k="wc"></div><div class="num" data-k="wd"></div></div>
          <div data-k="alarm"></div></div>
      </section>

      <section class="card energy" data-sec="energy">
        <div class="eyebrow"><span>Energie &amp; Wallbox</span><span>● Live</span></div>
        <h2 data-k="eh">Dein Energiefluss</h2><p class="sub"><span data-k="esub"></span> · Autarkie heute <b class="num" data-k="aut">–</b></p>
        <div class="stage"><div class="hbox">
          <img src="${HAUS}" alt="Haus mit Solaranlage, Speicher und Wallbox">
          <svg class="flow" viewBox="0 0 1200 777" aria-hidden="true">
            ${chev('fpv', 256, 6, 136, 'var(--sun)')}${chev('fbk', 44, 420, 772, 'var(--sun)')}
            ${chev('fbatI', 562, 800, 742, 'var(--batt)')}${chev('fbatO', 562, 742, 800, 'var(--batt)')}
            ${chev('fgridI', 793, 806, 712, 'var(--grid)')}${chev('fgridO', 793, 712, 806, 'var(--grid)')}
          </svg>
          <div class="lab up" style="left:21%" data-more="${c.pv}"><div class="t"><span class="dot" data-k="dpv" style="background:var(--sun)"></span>Solar</div><div class="v num"><span data-k="vpv">–</span><small data-k="upv">kW</small></div><div class="s">heute <span class="num" data-k="today">–</span></div></div>
          <div class="lab up" style="left:64%"><div class="t"><span class="dot" style="background:#fff"></span>Haus</div><div class="v num"><span data-k="vhouse">–</span><small data-k="uhouse">kW</small></div><div class="s" data-k="shouse"></div></div>
          <div class="lab dn" style="left:3%"><div class="t"><span class="dot" data-k="dbk" style="background:var(--sun)"></span>Marstek</div><div class="v num"><span data-k="vbk">–</span><small data-k="ubk">W</small></div><div class="s" data-k="sbk"></div><div class="s" data-k="sbk2"></div></div>
          <div class="lab dn" style="left:47%;transform:translateX(-50%)"><div class="t"><span class="dot" data-k="dbat" style="background:var(--batt)"></span>Speicher</div><div class="v num"><span data-k="vbat">–</span></div><div class="s" data-k="sbat"></div></div>
          <div class="lab dn" style="left:66%" data-more="${c.grid_in}"><div class="t"><span class="dot" data-k="dgrid" style="background:var(--grid)"></span>Netz</div><div class="v num"><span data-k="vgrid">–</span><small data-k="ugrid">kW</small></div><div class="s" data-k="sgrid"></div></div>
        </div></div>
        <div class="fav" data-k="fav"></div>
        <div class="carrow" data-more="${c.wallbox}"><span>Auto <b class="num" data-k="csoc">–</b></span><div class="cbar"><i data-k="cbar"></i></div><span class="num">⚡ <span data-k="wbp">–</span> kW · <b data-k="wbtoday">–</b> <b>kWh</b></span></div>
        <div data-k="wbmode"></div>
      </section>

      <section class="card sec" data-sec="sec">
        <div class="eyebrow"><span>Sicherheit</span><span>Homematic</span></div>
        <div class="center"><div class="shield" data-k="shield">${svg('shield')}</div>
          <h2 data-k="sech">Alles im Blick</h2><p class="sub" data-k="secs"></p></div>
        <div class="stats two"><div><b class="num" data-k="nopen">–</b><span>offen</span></div><div><b class="num" data-k="nclosed">–</b><span>geschlossen</span></div></div>
        ${contacts}
        <div data-k="hints"></div>
        <div data-k="notif"></div>
      </section>

      <section class="card home" data-sec="home">
        <div class="hhead"><div><div class="eyebrow"><span>Räume</span></div>
          <h2>Im Haus</h2><p class="sub">Antippen klappt Licht, Szenen, Jalousien und Heizung auf</p></div>
          <button class="arr" data-arrange aria-pressed="false">↕ Anordnen</button></div>
        <div class="quick" data-k="quick"></div>
        <div data-k="ahint"></div>
        <div class="rg" data-k="rooms"></div>
      </section>

      <section class="card cams" data-sec="cams">
        <div class="eyebrow"><span>Kameras</span><span>${[...new Set(this._cams.map(m => m.brand).filter(Boolean))].join(' · ')}</span></div>
        <h2>Rund ums Haus</h2><p class="sub">Antippen öffnet das Livebild</p>
        <div class="camg">${cams}</div>
      </section>

      <section class="card wx" data-sec="wx">
        <div class="eyebrow"><span>Wetter</span><span>Vorhersage</span></div>
        <h2>Heute und die nächsten Tage</h2><p class="sub" data-k="wxs"></p><div class="rainw" data-k="rainw" hidden></div>
        <div class="hrs" data-k="fch"></div>
        <div class="fc" data-k="fc"></div>
      </section>

      <section class="card waste bins" data-sec="waste">
        <div class="eyebrow"><span>Müllabfuhr</span><span>nächste Termine</span></div>
        <h2 data-k="wah">Müllabfuhr</h2><p class="sub" data-k="was"></p>
        <div data-k="wal"></div>
      </section>


      <section class="card hist chart" data-sec="hist">
        <div class="eyebrow"><span>Energie</span><span>Bilanz und Prognose</span></div>
        <h2>Erzeugung und Verbrauch</h2>
        <div class="tabs" role="tablist">${['Gestern', 'Heute', 'Morgen', 'Woche'].map((t, i) => `<button role="tab" data-etab="${i}" aria-selected="${i === 1}">${t}</button>`).join('')}</div>
        <div data-k="hist"></div><div class="htip" data-k="htip"></div>
        <div class="legend" data-k="hleg"></div>
        <div class="etot" data-k="etot"></div>
      </section>
    </div></div>`;

    this._k = {};
    root.querySelectorAll('[data-k]').forEach(e => { this._k[e.dataset.k] = e; });
    // Leiste zum Verschieben und Ausblenden der Kacheln (nur bei Anordnen sichtbar)
    root.querySelectorAll('section[data-sec]').forEach(e => { const b = document.createElement('div'); b.className = 'tbar'; b.hidden = true; e.prepend(b); });
    this._tileSig = null;
    // Während ein Slider bewegt wird, nicht neu zeichnen
    root.addEventListener('pointerdown', e => { if (e.target.matches('input[type=range]')) this._busy = Date.now() + 60000; });
    root.addEventListener('focusin', e => { if (e.target.matches('input.rn,select')) this._busy = Date.now() + 120000; });
    root.addEventListener('focusout', e => { if (e.target.matches('input.rn,select')) this._busy = 0; });
    root.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.dim || t.dataset.pos) {
        this._busy = Date.now() + 60000;
        const s = t.closest('.row') && t.closest('.row').querySelector('.txt span');
        if (s) s.textContent = t.dataset.dim ? `An · ${t.value} %` : this._posTxt(+t.value);
      }
    });
    root.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.dim) this._hass.callService('light', 'turn_on', { entity_id: t.dataset.dim, brightness_pct: +t.value });
      if (t.dataset.pos) this._hass.callService('cover', 'set_cover_position', { entity_id: t.dataset.pos, position: +t.value });
      if (this._lay && (t.dataset.rname || t.dataset.dname || t.dataset.droom)) {
        const L = this._lay; L.names = L.names || {}; L.dev = L.dev || {};
        const v = t.value.trim();
        if (t.dataset.rname) { if (v) L.names[t.dataset.rname] = v; else delete L.names[t.dataset.rname]; }
        if (t.dataset.dname) { const e = L.dev[t.dataset.dname] = L.dev[t.dataset.dname] || {}; if (v) e.n = v; else delete e.n; }
        if (t.dataset.droom) { (L.dev[t.dataset.droom] = L.dev[t.dataset.droom] || {}).r = v; }
        this._save(); this._roomSig = null; this._busy = 0; this._renderRooms();
      }
      if (t.dataset.merge && this._lay) { this._lay.merge[t.dataset.merge] = t.value; this._save(); this._roomSig = null; this._renderRooms(); }
      if (t.dataset.akey && this._lay) { const L = this._lay; L.alarm_key = L.alarm_key || {}; const v = parseInt(t.value, 10); if (v >= 1 && v <= 50) L.alarm_key[t.dataset.akey] = v; else delete L.alarm_key[t.dataset.akey]; this._save(); this._renderAlarm(); }
      if (t.dataset.boostmin) { const v = Math.max(1, Math.min(240, +t.value || 30)); this._lay.boost_min = v; this._save(); }
      if (t.dataset.dim || t.dataset.pos) this._busy = Date.now() + 1500;
    });
    root.addEventListener('click', e => {
      if (e.target.closest('input,select')) return;
      if (this._roomClick(e)) return;
      const ch = e.target.closest('[data-chide]');
      if (ch && this._lay) { const id = ch.dataset.chide, l = this._lay.hc = this._lay.hc || []; const i = l.indexOf(id); if (i < 0) l.push(id); else l.splice(i, 1); this._save(); this._update(); return; }
      const wm = e.target.closest('[data-wbmode]');
      if (wm && !wm.disabled) { const [eid, opt] = wm.dataset.wbmode.split('|'); this._setWbMode(eid, opt); return; }
      const nt = e.target.closest('[data-notiftg]');
      if (nt) { this._hass.callService('automation', nt.getAttribute('aria-checked') === 'true' ? 'turn_off' : 'turn_on', { entity_id: nt.dataset.notiftg }); return; }
      const nb = e.target.closest('[data-notif]');
      if (nb) { this._notifAction(nb.dataset.notif); return; }
      const hs = e.target.closest('[data-k="hist"]');
      if (hs && this._eGeo && this._eGeo.tab !== 3) {
        const r = hs.getBoundingClientRect(), G = this._eGeo, xv = (e.clientX - r.left) / r.width * G.W;
        const i = Math.max(0, Math.min(G.n - 1, Math.round((xv - G.l) / (G.W - G.l - 6) * G.n)));
        this._esel = { tab: G.tab, i }; this._drawEnergy(); return;
      }
      const et = e.target.closest('[data-etab]');
      if (et) { this._etab = +et.dataset.etab; this._drawEnergy(); return; }
      const t = e.target.closest('[data-toggle]');
      if (t) {
        const ids = (t.dataset.toggle || '').split(',').filter(x => this._s(x));
        // mehrere Kanäle: an = einer an, aus = alle aus
        if (ids.length > 1) {
          const on = ids.some(x => this._s(x).state === 'on');
          // einschalten über den zuletzt benutzten Kanal (z. B. Kanal 5 wie in der CCU)
          const last = ids.slice().sort((x, y) => Date.parse(this._s(y).last_changed || 0) - Date.parse(this._s(x).last_changed || 0))[0];
          this._hass.callService('homeassistant', on ? 'turn_off' : 'turn_on', { entity_id: on ? ids : last });
        } else if (ids.length) this._hass.callService('homeassistant', 'toggle', { entity_id: ids[0] });
        return;
      }
      const lc = e.target.closest('[data-lcol]');
      if (lc) { const [eid, v] = lc.dataset.lcol.split('|'); this._setColor(eid, v); return; }
      const sc = e.target.closest('[data-scene]');
      if (sc) { this._hass.callService('scene', 'turn_on', { entity_id: sc.dataset.scene }); return; }
      const cam = e.target.closest('[data-cam]');
      if (cam) {
        const id = this._cams[+cam.dataset.cam].id;
        if (!id) return;
        this._more(id);
        return;
      }
      const m = e.target.closest('[data-more]');
      if (m && m.dataset.more) this._more(m.dataset.more);
    });
    root.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-room]')) { e.preventDefault(); e.target.click(); }
    });
    this._roomSig = null;
    this._built = true;
    if (this._waste) this._renderWaste();
  }

  // Kameras: feste ID oder Suche per Stichwort (find/Name). Angezeigt werden nur Kameras mit Livebild.
  _camList() {
    const st = this._hass.states;
    const all = Object.keys(st).filter(id => id.startsWith('camera.')).sort();
    return this._cfg.cameras.map(m => {
      let id = m.entity && st[m.entity] ? m.entity : null;
      if (!id) {
        const f = this._key(m);
        const ids = f ? all.filter(x => x.includes(f)) : [];
        id = ids.find(x => !/clear|klar|snapshot/.test(x)) || ids[0] || null;
      }
      return Object.assign({}, m, { id });
    }).filter(m => m.id && this._stream(m.id));
  }

  // ---------- Anordnung (gespeichert in Home Assistant, pro Benutzer) ----------
  async _loadLayout() {
    this._lay = { order: [], hidden: [], merge: {}, names: {}, dev: {}, boost: {}, boost_min: 30 };
    try {
      const r = await this._hass.callWS({ type: 'frontend/get_user_data', key: 'zuhause-card' });
      if (r && r.value) Object.assign(this._lay, r.value);
    } catch (e) { /* ältere Versionen: Standard */ }
    // ausgeblendete Kontakte (Sicherheit); "Fenster Bad unten" ist vorerst abgeschaltet und startet ausgeblendet
    if (!this._lay.hcInit) {
      this._lay.hcInit = true;
      this._lay.hc = (this._lay.hc || []).concat((this._cfg.contacts || []).filter(x => /fenster bad unten/i.test(x.name)).map(x => x.entity));
      this._save();
    }
    // ab v2.18.0 steht "Sicherheit" ganz unten, auch in schon gespeicherten Anordnungen
    if (!this._lay.secEnd) {
      this._lay.secEnd = true;
      const o = this._lay.tiles && this._lay.tiles.order;
      if (o && o.includes('sec')) { o.splice(o.indexOf('sec'), 1); o.push('sec'); }
      this._save();
    }
    this._roomSig = null;
    if (this._built) this._update();
  }
  _save() {
    this._hass.callWS({ type: 'frontend/set_user_data', key: 'zuhause-card', value: this._lay }).catch(() => {});
  }

  // ---------- Räume aus den Bereichen ----------
  // false = nicht anzeigen, null = kein Bereich zugeordnet
  _areaOf(id) {
    const h = this._hass, e = h.entities && h.entities[id];
    if (!e || e.hidden || e.entity_category) return false;
    if (e.area_id) return e.area_id;
    const d = e.device_id && h.devices && h.devices[e.device_id];
    return (d && d.area_id) || null;
  }
  _rooms() {
    const h = this._hass, st = h.states, areas = h.areas || {};
    const by = {};
    const add = (a, kind, s) => { if (!a || !areas[a]) return; (by[a] = by[a] || { id: a, name: areas[a].name, light: [], cover: [], climate: [], sw: [], scene: [], fn: [] })[kind].push(s); };
    const all = Object.values(st);
    // Lichter, die schon in einer Hue-Gruppe stecken, nicht einzeln zeigen
    const inGroup = new Set();
    all.forEach(s => { if (s.entity_id.startsWith('light.') && s.attributes.is_hue_group) (s.attributes.entity_id || []).forEach(x => inGroup.add(x)); });
    const nrm = x => (x || '').toLowerCase().replace(/ß/g, 'ss').replace(/[^a-zäöü0-9]/g, '');
    const FUNC = /^(alarm(anlage)?|licht|beleuchtung|heizung|jalousien?|rollladen|temperatur|zentrale|haussteuerung|sicherheit|klima|technik|system)$/;
    const areaList = Object.values(areas).filter(x => nrm(x.name).length >= 4 && !FUNC.test(nrm(x.name))).sort((x, y) => nrm(y.name).length - nrm(x.name).length);
    // Schalter nur von Geräte-Integrationen (keine Auto-, Wallbox- oder Kamera-Einstellungen)
    const swOk = s => {
      const pf = (h.entities[s.entity_id] || {}).platform || '';
      return /homematic|hue|shelly|tasmota|esphome|zha|zwave|mqtt|tplink|tuya|deconz|tradfri|template|group/.test(pf)
        && !/sirene|alarm/i.test(s.attributes.friendly_name || s.entity_id);
    };
    const hmSw = {};
    all.forEach(s => {
      const id = s.entity_id, dom = id.split('.')[0];
      if (!['light', 'cover', 'climate', 'switch'].includes(dom)) return;
      let a = this._areaOf(id); if (a === false) return;
      // Gewerke wie "Alarmanlage" oder "Licht" sind keine Räume
      if (a && areas[a] && FUNC.test(nrm(areas[a].name))) a = null;
      // ohne Bereich: über den Namen zuordnen ("Wandthermostat Wohnzimmer 1" -> Wohnzimmer)
      if (!a) { const n = nrm(s.attributes.friendly_name); const m = areaList.find(x => n.includes(nrm(x.name))); if (!m) return; a = m.area_id; }
      if (dom === 'light') { if (!inGroup.has(id)) add(a, 'light', s); }
      else if (dom === 'switch') {
        if (!swOk(s)) return;
        // Homematic-Schaltaktor: mehrere Kanäle (4, 5, 6) für dieselbe Lampe zu einer Zeile zusammenfassen
        const e = h.entities[id] || {}, dv = /homematic/.test(e.platform || '') && e.device_id;
        if (dv) { (hmSw[dv] = hmSw[dv] || { a, list: [] }).list.push(s); return; }
        add(a, 'sw', s);
      }
      else add(a, dom, s);
    });
    Object.values(hmSw).forEach(({ a, list }) => {
      if (list.length === 1) { add(a, 'sw', list[0]); return; }
      list.sort((x, y) => x.entity_id.localeCompare(y.entity_id));
      const on = list.some(x => x.state === 'on'), av = list.some(x => x.state === 'on' || x.state === 'off');
      const nm = (list[0].attributes.friendly_name || list[0].entity_id).replace(/\s+\d+$/, '');
      add(a, 'sw', { entity_id: list[0].entity_id, state: on ? 'on' : av ? 'off' : 'unavailable', attributes: Object.assign({}, list[0].attributes, { friendly_name: nm }), _grp: list.map(x => x.entity_id) });
    });
    // Funktionen aus der CCU: virtuelle Tasten (z. B. "Carportlicht dauerhaft ein")
    // und Sperr-Variablen (z. B. "Carportlicht gesperrt"), dem Raum über den Namen zugeordnet
    const OUTF = /au(ss|ß)en|terr?asse|garten(?!haus)|carport|einfahrt|hof|balkon/i;
    const fnRoom = n => {
      if (OUTF.test(n)) return (by.__aussen = by.__aussen || { id: '__aussen', name: 'Außen', light: [], cover: [], climate: [], sw: [], scene: [], fn: [] }) && '__aussen';
      const m = areaList.find(x => nrm(n).includes(nrm(x.name)) && !FUNC.test(nrm(x.name))); return m ? m.area_id : null;
    };
    const addFn = (n, f) => { const a = fnRoom(n); if (a === '__aussen') by.__aussen.fn.push(f); else if (a) add(a, 'fn', f); };
    const devName = e => { const d = e && e.device_id && h.devices && h.devices[e.device_id]; return d ? (d.name_by_user || d.name || '') : ''; };
    all.forEach(s => {
      const id = s.entity_id, e = h.entities[id]; if (!e || !/homematic/.test(e.platform || '')) return;
      const d = e.device_id && h.devices && h.devices[e.device_id];
      const n = (s.attributes.friendly_name || '').replace(devName(e), '').trim().replace(/^SV\s+/, '');
      if (id.startsWith('event.') && d && /RCV-50/i.test(d.model || '')) {
        if (!n || /^v?ch\d+$|sch(ä|ae)rfen|scharf/i.test(n)) return;
        const ca = String(s.attributes.channel_address || s.attributes.address || '');
        const ch = +(ca.split(':')[1] || (id.match(/_ch(\d+)/) || [])[1] || 0);
        if (ch) addFn(n, { kind: 'key', entity_id: id, name: n, attributes: { friendly_name: n }, addr: ca.split(':')[0] || (d.name || '').split(' ').pop(), ch, state: s.state });
      } else if (/^(binary_sensor|switch|sensor)\./.test(id) && /gesperrt|sperre/i.test(n)) {
        addFn(n, { kind: 'var', entity_id: id, name: n, attributes: { friendly_name: n }, on: /^(on|true|wahr|ja)$/i.test(s.state), state: s.state });
      }
    });
    // Bereiche zusammenlegen: selbst gewählt (Anordnen) oder automatisch,
    // wenn ein Name den anderen enthält ("Wohnzimmer klein" -> "Wohnzimmer")
    const merge = (this._lay && this._lay.merge) || {};
    const norm = x => x.toLowerCase().replace(/[^a-zäöüß]/g, '');
    const OUT = /au(ss|ß)en|terr?asse|garten(?!haus)|carport|einfahrt|vordemhaus|weihnacht|lichterkette|hof|balkon|stern/;
    const syn = { arbeitszimmer: 'büro', office: 'büro', wc: 'gästewc' };
    if (Object.keys(by).some(a => OUT.test(norm(by[a].name)) && merge[a] === undefined))
      by.__aussen = by.__aussen || { id: '__aussen', name: 'Außen', light: [], cover: [], climate: [], sw: [], scene: [], fn: [] };
    const auto = a => {
      const n = norm(by[a].name);
      if (a === '__aussen') return '';
      if (OUT.test(n) && by.__aussen) return '__aussen';
      const sy = syn[n] && Object.values(by).find(b => norm(b.name) === syn[n]);
      if (sy) return sy.id;
      const c = Object.values(by).filter(b => b.id !== a && b.id !== '__aussen' && norm(b.name).length >= 4 && n.includes(norm(b.name))
        && (n !== norm(b.name) || by[a].name.length > b.name.length));
      c.sort((x, y) => norm(y.name).length - norm(x.name).length);
      return c.length ? c[0].id : '';
    };
    const target = {};
    Object.keys(by).forEach(a => { const m = merge[a]; target[a] = m === undefined ? auto(a) : (m === '-' ? '' : m); });
    Object.keys(target).forEach(a => { if (target[a] && (!by[target[a]] || target[target[a]])) target[a] = ''; });
    this._merged = [];
    Object.keys(target).forEach(a => {
      const t = target[a]; if (!t) return;
      ['light', 'cover', 'climate', 'sw', 'fn'].forEach(k => by[t][k].push(...by[a][k]));
      (by[t].also = by[t].also || []).push(by[a].name);
      this._merged.push({ id: a, name: by[a].name, into: t });
      delete by[a];
    });
    // Hue-Szenen: Gruppenname passt zum Bereich oder zu einer Hue-Gruppe im Bereich
    const scenes = all.filter(s => s.entity_id.startsWith('scene.') && s.attributes.group_name);
    Object.values(by).forEach(r => {
      const names = new Set([r.name.toLowerCase(), ...(r.also || []).map(x => x.toLowerCase()), ...r.light.filter(l => l.attributes.is_hue_group).map(l => (l.attributes.friendly_name || '').trim().toLowerCase())]);
      r.scene = scenes.filter(s => names.has(s.attributes.group_name.trim().toLowerCase()))
        .sort((x, y) => (x.attributes.name || x.entity_id).localeCompare(y.attributes.name || y.entity_id));
      const byName = (x, y) => (x.attributes.friendly_name || '').localeCompare(y.attributes.friendly_name || '');
      r.light.sort((x, y) => (y.attributes.is_hue_group ? 1 : 0) - (x.attributes.is_hue_group ? 1 : 0) || byName(x, y));
      r.cover.sort(byName); r.sw.sort(byName);
    });
    // Hat ein Raum eine Hue-Gruppe, die einzelnen Hue-Lampen weglassen.
    // Sammelgruppen ("Beide Wohnzimmer"), die nur andere Gruppen doppeln, ebenfalls.
    Object.values(by).forEach(r => {
      const gs = r.light.filter(l => l.attributes.is_hue_group && (l.attributes.entity_id || []).length);
      r.light = r.light.filter(l => {
        const m = l.attributes.entity_id || [];
        if (l.attributes.is_hue_group && /^(beide|alle)\b/i.test(l.attributes.friendly_name || '')) { r.allGrp = l; return false; }
        if (!l.attributes.is_hue_group || !m.length) return true;
        const sub = gs.filter(o => o !== l && (o.attributes.entity_id || []).every(x => m.includes(x)));
        if (sub.length >= 2) { r.allGrp = l; return false; }
        return true;
      });
      if (r.light.some(l => l.attributes.is_hue_group)) r.light = r.light.filter(l => l.attributes.is_hue_group || (h.entities[l.entity_id] || {}).platform !== 'hue');
    });
    Object.values(by).forEach(r => {
      if (r.light.some(l => l.attributes.is_hue_group)) r.light = r.light.filter(l => l.attributes.is_hue_group || (h.entities[l.entity_id] || {}).platform !== 'hue');
    });
    // eigene Raumnamen und verschobene Geräte (Anordnen)
    const L = this._lay || {}, names = L.names || {}, dev = L.dev || {};
    Object.values(by).forEach(r => { if (names[r.id]) r.name = names[r.id]; });
    Object.values(by).forEach(r => ['light', 'cover', 'climate', 'sw', 'fn'].forEach(k => {
      r[k] = r[k].filter(x => {
        const to = dev[x.entity_id] && dev[x.entity_id].r;
        if (to === '__hide') return false;
        if (!to || to === r.id || !by[to]) return true;
        by[to][k].push(x); return false;
      });
    }));
    // leere Bereiche (nichts zu schalten) weglassen
    const list = Object.values(by).filter(r => r.light.length || r.cover.length || r.climate.length || r.sw.length || r.fn.length);
    const order = (this._lay && this._lay.order) || [];
    const RANK = [/wohnzimmer|wohnen/, /ess/, /küche|kueche/, /flur|diele|eingang/, /büro|buero|arbeit/, /schlaf/, /kind/, /bad|dusche/, /gäste|gaeste|wc/, /keller|technik/, /gartenhaus|hütte|huette/, /pool/, /außen|aussen/];
    const rank = r => { const n = r.name.toLowerCase(); const i = RANK.findIndex(re => re.test(n)); return i < 0 ? 50 : i; };
    list.sort((x, y) => {
      const i = order.indexOf(x.id), j = order.indexOf(y.id);
      if (i < 0 && j < 0) return rank(x) - rank(y) || x.name.localeCompare(y.name);
      return (i < 0 ? 1e3 : i) - (j < 0 ? 1e3 : j);
    });
    return list;
  }

  _nm(s, r) {
    const own = this._lay && this._lay.dev && this._lay.dev[s.entity_id];
    if (own && own.n) return own.n;
    let n = (s.attributes.friendly_name || s.entity_id).trim().replace(/\s+/g, ' ');
    const t = n.replace(/^(jalou?i?sie|wandthermostat|thermostat|stellantrieb)\s+/i, '');
    if (t) n = t;
    // Homematic doppelt "Gerät Kanal": "WohnzimmerGroß Wohnzimmer groß" -> "Wohnzimmer groß"
    const w = n.split(' '), flat = x => x.join('').toLowerCase().replace(/[^a-zäöüß0-9]/g, '');
    for (let i = 1; i < w.length; i++) {
      const a = flat(w.slice(0, i)), b = flat(w.slice(i));
      if (b.length > 3 && (a === b || a.endsWith(b) || lev(a, b) <= 2)) { n = w.slice(i).join(' '); break; }
      if (a.length > 3 && b.endsWith(a)) { n = w.slice(0, i).join(' '); break; }
    }
    // Raumname vorne weglassen, wenn danach noch etwas übrig bleibt
    if (r && n.toLowerCase().startsWith(r.name.toLowerCase() + ' ') && /[a-zäöü]{3}/i.test(n.slice(r.name.length + 1))) n = n.slice(r.name.length + 1);
    return n;
  }
  _posTxt(v) { return v <= 0 ? 'Zu' : v >= 100 ? 'Auf' : `${v} %`; }
  // Farbauswahl für farbige Lampen: feste Farben, Weiß und "Mehr" (Farbrad von Home Assistant)
  _colors(s, name) {
    const m = s.attributes.supported_color_modes || [];
    if (!m.some(x => /^(hs|xy|rgb|rgbw|rgbww)$/.test(x))) return '';
    const hs = s.attributes.hs_color, col = /^(hs|xy|rgb|rgbw|rgbww)$/.test(s.attributes.color_mode || '') && hs && hs[1] > 40;
    const cur = col ? LCOL.reduce((b, c, i) => { const d = Math.min(Math.abs(hs[0] - c[1]), 360 - Math.abs(hs[0] - c[1])); return d < b[0] ? [d, i] : b; }, [999, -1])[1] : -1;
    const white = !col;
    return `<div class="cols">${LCOL.map((c, i) => `<button class="cdot${i === cur ? ' on' : ''}" style="background:hsl(${c[1]},95%,52%)" data-lcol="${s.entity_id}|${i}" aria-label="${name} ${c[0]}"></button>`).join('')}`
      + `<button class="cdot cw${white ? ' on' : ''}" data-lcol="${s.entity_id}|w" aria-label="${name} Weiß"></button><button class="cmore" data-more="${s.entity_id}">Mehr</button></div>`;
  }
  _setColor(eid, v) {
    const s = this._s(eid); if (!s) return;
    const m = s.attributes.supported_color_modes || [], d = { entity_id: eid };
    if (v !== 'w') d.hs_color = [LCOL[+v][1], 100];
    else if (m.includes('color_temp')) d.color_temp_kelvin = 2700;
    else if (m.includes('white')) d.white = s.attributes.brightness || 255;
    else d.hs_color = [30, 15];
    this._hass.callService('light', 'turn_on', d);
  }
  _pct(s) { return s.attributes.brightness != null ? Math.round(s.attributes.brightness / 2.55) : null; }
  _boosting(s) { return s.attributes.preset_mode === 'boost'; }
  _canBoost(s) { return (s.attributes.preset_modes || []).includes('boost'); }

  // Boost-Restzeit: Start merkt sich die Karte, Dauer stellst du bei "Anordnen" ein
  _boostInfo(list) {
    const run = list.filter(x => this._boosting(x));
    if (!run.length) return null;
    const lay = this._lay || { boost: {}, boost_min: 30 };
    let changed = false;
    run.forEach(x => { if (!lay.boost[x.entity_id]) { lay.boost[x.entity_id] = Date.now(); changed = true; } });
    if (changed && this._lay) this._save();
    const start = Math.max(...run.map(x => lay.boost[x.entity_id]));
    const left = Math.ceil((start + lay.boost_min * 60000 - Date.now()) / 60000);
    return left > 0 ? `noch ${left} min` : 'läuft';
  }
  _cleanBoost() {
    if (!this._lay) return;
    let ch = false;
    Object.keys(this._lay.boost).forEach(id => { const s = this._s(id); if (!s || !this._boosting(s)) { delete this._lay.boost[id]; ch = true; } });
    if (ch) this._save();
  }
  _startBoost(ids) {
    ids.forEach(id => { this._lay.boost[id] = Date.now(); });
    this._save();
    this._hass.callService('climate', 'set_preset_mode', { entity_id: ids, preset_mode: 'boost' });
  }

  // ---------- Lampen-Karussell ----------
  _favs() {
    const nm = x => (x.attributes.friendly_name || '').trim();
    const st = Object.values(this._hass.states).filter(x => /^(light|switch)\./.test(x.entity_id) && !/jalou|gesperrt|sperr|dauer|thermostat|klima|pumpe|sirene/i.test(nm(x)));
    if (this._cfg.favorites) return this._cfg.favorites.map(f => ({ name: f.name, s: this._s(f.entity) }));
    return FAV.map(([name, re]) => {
      const m = st.filter(x => re.test(nm(x))).sort((a, b) => (a.state === 'unavailable') - (b.state === 'unavailable')
        || (b.attributes.is_hue_group ? 1 : 0) - (a.attributes.is_hue_group ? 1 : 0) || nm(a).length - nm(b).length);
      return { name, s: m[0] };
    });
  }
  _renderFav() {
    const el = this._k.fav; if (!el) return;
    const f = this._favs(), ids = f.map(x => x.s ? x.s.entity_id : '').join();
    if (ids !== this._favSig) {
      this._favSig = ids;
      // bei wenigen Lampen zweimal auf den Ring, damit er voll aussieht
      const one = f.map((x, i) => `<div class="fi" data-fi="${i}"><i>${svg('bulb')}</i><b>${x.name}</b><span></span></div>`).join('');
      el.innerHTML = f.length < 8 ? one + one : one;
      if (this._favPos == null) this._favPos = 0;
      if (!this._favOn) { this._favOn = true; this._favDrag(el); }
    }
    if (!el.classList.contains('drag')) this._favLay();
    el.querySelectorAll('.fi').forEach(b => {
      const s = f[+b.dataset.fi % f.length].s, on = !!s && s.state === 'on', na = !s || s.state === 'unavailable';
      b.classList.toggle('on', on); b.classList.toggle('na', na);
      b.querySelector('span').textContent = !s ? 'nicht gefunden' : na ? 'nicht erreichbar' : on ? 'an' : 'aus';
    });
  }
  // Lampen stehen auf einem Ring; vorne groß, nach hinten kleiner und blasser
  _favLay() {
    const el = this._k.fav, it = [...el.children], n = it.length; if (!n) return;
    const R = this._favR(), st = 2 * Math.PI / n;
    it.forEach((b, i) => {
      let a = (i - this._favPos) * st; a = Math.atan2(Math.sin(a), Math.cos(a));
      const z = Math.cos(a);
      b.style.transform = `translateX(${Math.sin(a) * R}px) translateY(${(z - 1) * 10}px) translateZ(${(z - 1) * R * 0.8 + 24}px) rotateY(${a * 180 / Math.PI * 0.45}deg) scale(${(0.72 + 0.5 * Math.pow(z, 6)).toFixed(3)})`;
      b.style.opacity = z < 0.2 ? 0 : 0.25 + 0.75 * z * z;
      b.style.setProperty('--lo', Math.max(0, 1 - Math.abs(a) / (st * 0.6)).toFixed(2)); // Name nur bei der vorderen Lampe
      b.style.zIndex = Math.round(z * 100) + 100;
      b.style.pointerEvents = z < 0 ? 'none' : '';
    });
  }
  _favR() { return Math.min(300, Math.max(140, this._k.fav.clientWidth * 0.46)); }
  _favDrag(el) {
    let x0 = null, p0 = 0, moved = false, lx = 0, lt = 0, v = 0;
    const per = () => this._favR() * Math.sin(2 * Math.PI / el.children.length);
    el.addEventListener('pointerdown', e => { x0 = lx = e.clientX; lt = e.timeStamp; p0 = this._favPos; moved = false; v = 0; });
    el.addEventListener('pointermove', e => {
      if (x0 === null) return;
      if (!moved && Math.abs(e.clientX - x0) > 6) { moved = true; el.classList.add('drag'); try { el.setPointerCapture(e.pointerId); } catch (_) {} }
      if (!moved) return;
      const dt = Math.max(1, e.timeStamp - lt); v = (e.clientX - lx) / dt; lx = e.clientX; lt = e.timeStamp;
      this._favPos = p0 - (e.clientX - x0) / per(); this._favLay();
    });
    const end = e => {
      if (x0 === null) return;
      el.classList.remove('drag');
      if (moved) {
        this._favPos = Math.round(this._favPos - Math.max(-2, Math.min(2, v * 0.35)));
      } else {
        const b = e.target.closest && e.target.closest('.fi');
        if (b) {
          const i = [...el.children].indexOf(b), n = el.children.length, d = ((i - this._favPos) % n + n + n / 2) % n - n / 2;
          if (Math.abs(d) < 0.5) { const fs = this._favs(), s = fs[i % fs.length].s; if (s && s.state !== 'unavailable') this._hass.callService(s.entity_id.split('.')[0], 'toggle', { entity_id: s.entity_id }); }
          else this._favPos = Math.round(this._favPos + d);
        }
      }
      x0 = null; this._favLay();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', e => { x0 = null; el.classList.remove('drag'); this._favPos = Math.round(this._favPos); this._favLay(); });
  }

  // ---------- Kacheln: Reihenfolge und Ausblenden pro Benutzer ----------
  _tiles() {
    const L = this._lay || {}, t = L.tiles || {};
    const order = (t.order || []).filter(x => TILES[x]);
    Object.keys(TILES).forEach(x => { if (!order.includes(x)) order.push(x); });
    return { order, hidden: (t.hidden || []).filter(x => x !== 'home') };
  }
  _applyTiles() {
    const arr = !!this._arrange, { order, hidden } = this._tiles();
    const sig = arr + '|' + order.join() + '|' + hidden.join();
    if (sig === this._tileSig) return;
    this._tileSig = sig;
    const vis = order.filter(x => arr || !hidden.includes(x));
    // Breiten so verteilen, dass keine Lücke bleibt, wenn eine Kachel fehlt
    const pack = (cols, w) => {
      const out = {}; let row = [], sum = 0;
      const close = () => { if (row.length) out[row[row.length - 1]] += cols - sum; row = []; sum = 0; };
      vis.forEach(x => { const n = Math.min(cols, w(x)); if (sum + n > cols) close(); out[x] = n; row.push(x); sum += n; });
      close(); return out;
    };
    const wide = pack(12, x => TILES[x][1]), mid = pack(2, x => TILES[x][2]);
    order.forEach((x, i) => {
      const e = this.shadowRoot.querySelector(`section[data-sec="${x}"]`); if (!e) return;
      const hid = hidden.includes(x), b = e.querySelector('.tbar');
      e.style.order = i + 1;
      e.hidden = hid && !arr;
      e.classList.toggle('shid', hid && arr);
      if (wide[x]) { e.style.setProperty('--sp', wide[x]); e.style.setProperty('--sp2', mid[x]); }
      b.hidden = !arr;
      b.innerHTML = arr ? `<span>${TILES[x][0]}</span><button data-tmv="${x}|-1" aria-label="${TILES[x][0]} nach oben">↑</button><button data-tmv="${x}|1" aria-label="${TILES[x][0]} nach unten">↓</button>`
        + (x === 'home' ? '' : `<button data-thide="${x}">${svg('eye')} ${hid ? 'Einblenden' : 'Ausblenden'}</button>`) : '';
    });
  }

  // ---------- Müllabfuhr aus einem Kalender (z. B. Waste Collection Schedule) ----------
  _wasteCals() {
    const w = this._cfg.waste;
    if (w) return [].concat(w);
    return Object.keys(this._hass.states).filter(id => id.startsWith('calendar.')
      && /müll|muell|abfall|waste|tonne|entsorg/i.test(id + ' ' + (this._hass.states[id].attributes.friendly_name || '')));
  }
  _binColor(n) {
    n = n.toLowerCase();
    return /gelb|wertstoff|verpack/.test(n) ? '#e0b000' : /bio|grün|gruen|organ|kompost/.test(n) ? '#4a9a5f' : /baum|strauch|grünschnitt/.test(n) ? '#8a6a3f'
      : /papier|blau/.test(n) ? '#3f78c4' : /rest|grau|schwarz/.test(n) ? '#5b6470' : '#8a93a0';
  }
  async _loadWaste() {
    const cals = this._wasteCals(), a = new Date(), b = new Date(a.getTime() + 45 * 864e5);
    a.setHours(0, 0, 0, 0);
    try {
      const res = await Promise.all(cals.map(id => this._hass.callApi('GET', `calendars/${id}?start=${a.toISOString()}&end=${b.toISOString()}`)));
      const ev = res.flat().map(e => ({ n: e.summary, d: new Date((e.start.date || e.start.dateTime || '').slice(0, 10) + 'T00:00:00') }))
        .filter(e => !isNaN(e.d)).sort((x, y) => x.d - y.d);
      this._waste = ev;
    } catch (e) { this._waste = this._waste || []; }
    this._renderWaste();
  }
  _renderWaste() {
    const k = this._k; if (!k.wal) return;
    const ev = this._waste || [], today = new Date(); today.setHours(0, 0, 0, 0);
    // pro Sorte nur der nächste Termin
    const seen = new Set(), next = ev.filter(e => !seen.has(e.n) && seen.add(e.n)).slice(0, 5);
    if (!this._wasteCals().length) { this._set('wah', 'Noch kein Abfallkalender'); this._set('was', 'Wird angezeigt, sobald der Kalender in Home Assistant ist'); k.wal.innerHTML = ''; return; }
    const days = e => Math.round((e.d - today) / 864e5);
    const lab = e => { const n = days(e); return n === 0 ? 'heute' : n === 1 ? 'morgen' : null; };
    const f = next[0];
    this._set('wah', f ? (days(f) <= 1 ? `${lab(f) === 'heute' ? 'Heute' : 'Morgen'}: ${f.n}` : 'Nächste Abfuhr') : 'Keine Termine');
    this._set('was', f ? (days(f) === 1 ? 'Heute Abend rausstellen' : days(f) === 0 ? 'Heute wird abgeholt' : `${f.n} am ${f.d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}`) : '');
    const bin = c => `<svg class="bin" viewBox="0 0 34 40"><rect x="4" y="6" width="26" height="4" rx="2" fill="${c}"/><rect x="12" y="2" width="10" height="4" rx="2" fill="${c}"/><path d="M7 12h20l-2 26H9z" fill="${c}"/><path d="M13 17v16M17 17v16M21 17v16" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
    const h = next.map(e => `<div class="row">${bin(this._binColor(e.n))}<div class="txt"><b>${e.n}</b><div class="s" style="color:var(--muted);font-size:12px">${e.d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</div></div>${lab(e) ? `<span class="pill warn">${lab(e)}</span>` : ''}</div>`).join('');
    if (k.wal.dataset.v !== h) { k.wal.dataset.v = h; k.wal.innerHTML = h; }
  }

  _renderRooms() {
    const k = this._k;
    if (!k.rooms) return;
    this._applyTiles();
    const rooms = this._rooms(), lay = this._lay || { hidden: [] }, arr = !!this._arrange;
    this._roomList = rooms;
    this._cleanBoost();
    const allClim = rooms.flatMap(r => r.climate).filter(x => this._canBoost(x));
    const allBoost = this._boostInfo(allClim);
    const quick = `<button class="qb" data-q="close">${svg('blind')} Alle Jalousien zu</button><button class="qb" data-q="open">${svg('blind')} Alle auf</button>`
      + `<button class="qb" data-q="off">${svg('bulb')} Alle Lichter aus</button>`
      + (allClim.length ? `<button class="qb ${allBoost ? 'on' : ''}" data-q="boost">${svg('heat')} ${allBoost ? 'Boost ' + allBoost + ' · verlängern' : 'Boost für alle'}</button>` : '');
    const hint = arr ? `<div class="hint">Namen antippen zum Umbenennen. Pfeile verschieben, das Auge blendet aus, die Auswahl legt einen Raum in einen anderen. Raum antippen zeigt seine Geräte zum Umbenennen und Verschieben.<span style="flex:1"></span>Boost-Dauer <input type="number" min="1" max="240" data-boostmin value="${lay.boost_min}" aria-label="Boost-Dauer in Minuten"> min</div>
      <div class="hint">Alarmanlage über die virtuelle Fernbedienung der Zentrale: Tastennummer für Scharf <input type="number" min="1" max="50" data-akey="on" value="${(lay.alarm_key || {}).on || ''}" aria-label="Taste scharf"> und Unscharf <input type="number" min="1" max="50" data-akey="off" value="${(lay.alarm_key || {}).off || ''}" aria-label="Taste unscharf"></div>` : '';
    let html = '';
    const vis = rooms.filter(r => arr || !lay.hidden.includes(r.id));
    vis.forEach(r => {
      const temps = r.climate.map(x => x.attributes.current_temperature).filter(v => v != null);
      const t = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
      const lo = r.light.filter(x => x.state === 'on').length + r.sw.filter(x => x.state === 'on').length;
      const pos = x => x.attributes.current_position != null ? x.attributes.current_position : x.state === 'closed' ? 0 : 100;
      const cz = r.cover.filter(x => pos(x) <= 0).length, ca = r.cover.filter(x => pos(x) >= 100).length;
      const bi = this._boostInfo(r.climate);
      const pills = [];
      if (r.light.length || r.sw.length) pills.push(`<span class="pill ${lo ? '' : 'off'}">${lo ? lo + ' an' : 'Licht aus'}</span>`);
      if (r.cover.length) pills.push(`<span class="pill off">${ca === r.cover.length ? 'Jalousie auf' : cz === r.cover.length ? 'Jalousie zu' : 'Jalousie teils'}</span>`);
      if (bi) pills.push(`<span class="pill warn">Boost ${bi}</span>`);
      const hid = lay.hidden.includes(r.id);
      html += `<div class="rt ${hid ? 'hid' : ''}" role="button" tabindex="0" data-room="${r.id}" aria-expanded="${this._open === r.id}">${arr ? `<input class="rn" data-rname="${r.id}" value="${r.name.replace(/"/g, '&quot;')}" aria-label="Raumname">` : `<b>${r.name}</b>`}`
        + (t != null ? `<span class="v num">${de(t, 1)}<small> °C</small></span>` : '')
        + `<span class="m">${pills.join('')}</span>`
        + (arr ? `<span class="mv"><button data-mv="${r.id}|-1" aria-label="${r.name} nach vorne">‹</button><button data-mv="${r.id}|1" aria-label="${r.name} nach hinten">›</button><button data-hide="${r.id}" aria-label="${r.name} aus- oder einblenden">${svg('eye')}</button></span>${this._mergeSel(r.id, '', rooms)}` : '')
        + `</div>`;
      if (this._open === r.id) html += `<div class="rp">${arr ? this._editPanel(r, rooms) : this._roomPanel(r)}</div>`;
    });
    if (arr && this._merged.length) html += this._merged.map(m => `<div class="rt hid"><b>${m.name}</b><span class="m"><span class="pill off">liegt in ${(rooms.find(r => r.id === m.into) || {}).name}</span></span>${this._mergeSel(m.id, m.into, rooms)}</div>`).join('');
    if (!rooms.length) html = '<p class="sub">Noch keine Bereiche mit Geräten gefunden. Ordne Lichter, Jalousien und Thermostate in Home Assistant einem Bereich zu.</p>';
    const sig = quick + hint + html;
    if (sig === this._roomSig || (this._busy && Date.now() < this._busy)) return;
    this._roomSig = sig;
    k.quick.innerHTML = quick; k.ahint.innerHTML = hint; k.rooms.innerHTML = html;
    const ab = this.shadowRoot.querySelector('[data-arrange]');
    ab.setAttribute('aria-pressed', arr); ab.textContent = arr ? '✓ Fertig' : '↕ Anordnen';
  }

  // Anordnen: Geräte eines Raums umbenennen oder in einen anderen Raum legen
  _editPanel(r, rooms) {
    const all = [...r.light, ...r.sw, ...r.fn, ...r.cover, ...r.climate];
    const hid = Object.entries((this._lay && this._lay.dev) || {}).filter(([, v]) => v.r === '__hide').map(([k]) => k);
    return `<div class="sect">Geräte in ${r.name}</div>` + all.map(s => {
      const ic = s.entity_id.startsWith('cover.') ? 'blind' : s.entity_id.startsWith('climate.') ? 'heat' : s.entity_id.startsWith('switch.') ? 'plug' : 'bulb';
      return `<div class="row" style="flex-wrap:wrap"><div class="ico">${svg(ic)}</div><div class="txt"><input class="rn" data-dname="${s.entity_id}" value="${this._nm(s, r).replace(/"/g, '&quot;')}" aria-label="Gerätename"><span>${s.attributes.friendly_name || s.entity_id}</span></div>
        <select class="mg" data-droom="${s.entity_id}" aria-label="Raum">${rooms.map(o => `<option value="${o.id}" ${o.id === r.id ? 'selected' : ''}>${o.name}</option>`).join('')}<option value="__hide">ausblenden</option></select></div>`;
    }).join('') + '<p class="sub" style="margin:8px 0 0">Name ändern und Enter drücken. Leeres Feld stellt den Originalnamen wieder her. „ausblenden“ nimmt ein Gerät vom Dashboard.</p>'
      + (hid.length ? `<div class="sect">Ausgeblendet</div>` + hid.map(id => `<div class="row"><div class="txt"><b>${(this._s(id) && this._s(id).attributes.friendly_name) || id}</b></div><select class="mg" data-droom="${id}" aria-label="Raum"><option value="__hide" selected>ausgeblendet</option>${rooms.map(o => `<option value="${o.id}">wieder in ${o.name}</option>`).join('')}</select></div>`).join('') : '');
  }

  _mergeSel(id, cur, rooms) {
    return `<select class="mg" data-merge="${id}" aria-label="Zusammenlegen"><option value="-">eigener Raum</option>${rooms.filter(r => r.id !== id).map(r => `<option value="${r.id}" ${r.id === cur ? 'selected' : ''}>in ${r.name}</option>`).join('')}</select>`;
  }

  _roomPanel(r) {
    let h = '';
    const row = (ico, id, name, sub, ctl, extra = '') => `<div class="row" style="flex-wrap:wrap"><div class="ico">${svg(ico)}</div><div class="txt" data-more="${id}"><b>${name}</b><span>${sub}</span></div>${ctl}${extra}</div>`;
    const tg = s => `<button class="tg" role="switch" aria-label="${s.attributes.friendly_name}" aria-checked="${s.state === 'on'}" data-toggle="${(s._grp || [s.entity_id]).join(',')}"></button>`;
    // Szenen je Hue-Gruppe: unter der passenden Lampe, Sammelgruppen-Szenen unter "Alle Lichter"
    const gkey = x => (x || '').trim().toLowerCase();
    const chips = list => list.length ? `<div class="scw">${list.map(s => `<button class="scb" type="button" data-scene="${s.entity_id}">${s.attributes.name || s.attributes.friendly_name}</button>`).join('')}</div>` : '';
    const used = new Set();
    const scOf = name => { const l = r.scene.filter(s => !used.has(s.entity_id) && gkey(s.attributes.group_name) === gkey(name)); l.forEach(s => used.add(s.entity_id)); return l; };
    if (r.light.length || r.sw.length) {
      h += '<div class="sect">Licht</div>';
      const nl = r.light.length + r.sw.length;
      if (nl > 1 || r.allGrp) {
        const any = [...r.light, ...r.sw].some(x => x.state === 'on');
        h += `<div class="row"><div class="ico">${svg('bulb')}</div><div class="txt"><b>Alle Lichter</b><span>${any ? 'mindestens eins an' : 'alle aus'}</span></div><button class="tg" role="switch" aria-label="Alle Lichter ${r.name}" aria-checked="${any}" data-allroom="${r.id}"></button></div>`;
        if (r.allGrp) h += chips(scOf(r.allGrp.attributes.friendly_name));
      }
      r.light.forEach(s => {
        const p = this._pct(s), dimm = (s.attributes.supported_color_modes || []).some(m => m !== 'onoff');
        const sub = s.state === 'on' ? (p != null ? `An · ${p} %` : 'An') : s.state === 'off' ? 'Aus' : 'nicht erreichbar';
        h += row('bulb', s.entity_id, this._nm(s, r), sub, tg(s),
          (dimm && s.state === 'on' ? `<input type="range" class="dim" min="1" max="100" value="${p || 100}" data-dim="${s.entity_id}" aria-label="${this._nm(s, r)} dimmen">` : '')
          + (s.state === 'on' ? this._colors(s, this._nm(s, r)) : ''));
        if (s.attributes.is_hue_group) h += chips(scOf(s.attributes.friendly_name));
      });
      r.sw.forEach(s => { h += row('plug', s.entity_id, this._nm(s, r), s.state === 'on' ? 'An' : s.state === 'off' ? 'Aus' : 'nicht erreichbar', tg(s)); });
    }
    if (r.fn.length) {
      h += '<div class="sect">Funktionen</div>';
      r.fn.forEach(f => {
        const fnm = this._nm(f, r);
        if (f.kind === 'var') h += row('lock', f.entity_id, fnm, f.on ? 'An' : 'Aus', `<button class="tg" role="switch" aria-label="${f.name}" aria-checked="${f.on}" data-hmvar="${f.entity_id}"></button>`);
        else {
          const t = Date.parse(f.state), when = isNaN(t) ? '' : ' · zuletzt ' + new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
          h += row('plug', f.entity_id, fnm, 'Taste der Zentrale' + when, `<button class="bst" data-vkey="${f.addr}|${f.ch}">Drücken</button>`);
        }
      });
    }
    const rest = r.scene.filter(s => !used.has(s.entity_id));
    if (rest.length) h += `<div class="sect">Szenen</div>` + chips(rest);
    if (r.cover.length) {
      h += '<div class="sect">Jalousien</div>';
      r.cover.forEach(s => {
        const pos = s.attributes.current_position, setp = (s.attributes.supported_features || 0) & 4;
        const sub = s.state === 'opening' ? 'fährt hoch' : s.state === 'closing' ? 'fährt runter' : pos != null ? this._posTxt(pos) : s.state === 'closed' ? 'Zu' : s.state === 'open' ? 'Auf' : 'nicht erreichbar';
        h += row('blind', s.entity_id, this._nm(s, r), sub,
          `<span class="cb"><button data-cv="close|${s.entity_id}">Zu</button><button data-cv="stop|${s.entity_id}">Stop</button><button data-cv="open|${s.entity_id}">Auf</button></span>`,
          setp && pos != null ? `<input type="range" class="pos" min="0" max="100" step="5" value="${pos}" data-pos="${s.entity_id}" aria-label="${this._nm(s, r)} Position">` : '');
      });
    }
    if (r.climate.length) {
      h += '<div class="sect">Heizung</div>';
      const bc = r.climate.filter(x => this._canBoost(x)), bi = this._boostInfo(r.climate);
      r.climate.forEach(s => {
        const a = s.attributes;
        const sub = [a.temperature != null ? `Soll ${de(a.temperature, 1)} °C` : '', a.current_humidity != null ? `${Math.round(a.current_humidity)} % Feuchte` : ''].filter(Boolean).join(' · ');
        h += row('heat', s.entity_id, this._nm(s, r), sub, `<span class="num" style="font-family:var(--display);font-weight:600">${a.current_temperature != null ? de(a.current_temperature, 1) + ' °C' : '–'}</span>`);
      });
      if (bc.length) h += `<div class="row"><div class="txt"><b>Boost</b><span>${bi ? 'läuft, ' + bi : 'aus'}</span></div><button class="bst ${bi ? 'on' : ''}" data-boost="${r.id}">${bi ? 'Verlängern' : 'Boost starten'}</button>${bi ? `<button class="bst" data-boostoff="${r.id}">Beenden</button>` : ''}</div>`;
    }
    return h || '<p class="sub">Keine steuerbaren Geräte in diesem Bereich.</p>';
  }

  _roomClick(e) {
    const t = e.target.closest('button,[data-room]'); if (!t) return false;
    const d = t.dataset, h = this._hass, rooms = this._roomList || [];
    const room = id => rooms.find(r => r.id === id);
    const done = () => { this._roomSig = null; this._busy = 0; this._renderRooms(); return true; };
    if (!this._lay && (d.mv || d.hide || d.boost || d.q || d.tmv || d.thide)) return true;
    if (t.hasAttribute('data-arrange')) { this._arrange = !this._arrange; this._renderNotif(); this._update(); return done(); }
    if (d.tmv || d.thide) {
      const T = this._tiles();
      if (d.tmv) {
        const [id, st] = d.tmv.split('|'), i = T.order.indexOf(id), j = i + +st;
        if (j >= 0 && j < T.order.length) { T.order.splice(i, 1); T.order.splice(j, 0, id); }
      } else T.hidden = T.hidden.includes(d.thide) ? T.hidden.filter(x => x !== d.thide) : [...T.hidden, d.thide];
      this._lay.tiles = T; this._save(); return done();
    }
    if (d.mv) {
      const [id, st] = d.mv.split('|');
      const ids = rooms.map(r => r.id), i = ids.indexOf(id), j = i + +st;
      if (j >= 0 && j < ids.length) { ids.splice(i, 1); ids.splice(j, 0, id); }
      this._lay.order = ids; this._save(); return done();
    }
    if (d.hide) {
      const hd = this._lay.hidden;
      this._lay.hidden = hd.includes(d.hide) ? hd.filter(x => x !== d.hide) : [...hd, d.hide];
      this._save(); return done();
    }
    if (d.room) { this._open = this._open === d.room ? null : d.room; return done(); }
    if (d.cv) { const [a, id] = d.cv.split('|'); h.callService('cover', a + '_cover', { entity_id: id }); return true; }
    if (d.boost) { const r = room(d.boost); if (r) this._startBoost(r.climate.filter(x => this._canBoost(x)).map(x => x.entity_id)); return done(); }
    if (d.boostoff) {
      const ids = (room(d.boostoff) || { climate: [] }).climate.filter(x => this._boosting(x)).map(x => x.entity_id);
      if (ids.length) h.callService('climate', 'set_preset_mode', { entity_id: ids, preset_mode: 'none' });
      return true;
    }
    if (d.q) {
      const all = k => rooms.filter(r => !this._lay.hidden.includes(r.id)).flatMap(r => r[k]).map(x => x.entity_id);
      if (d.q === 'close' || d.q === 'open') { const ids = all('cover'); if (ids.length) h.callService('cover', d.q + '_cover', { entity_id: ids }); }
      if (d.q === 'off') { const ids = all('light'); if (ids.length) h.callService('light', 'turn_off', { entity_id: ids }); }
      if (d.q === 'boost') { const ids = rooms.flatMap(r => r.climate).filter(x => this._canBoost(x)).map(x => x.entity_id); if (ids.length) this._startBoost(ids); return done(); }
      return true;
    }
    if (d.vkey) { const [addr, ch] = d.vkey.split('|'); h.callService('homematicip_local', 'set_device_value', { device_address: addr, channel: +ch, parameter: 'PRESS_SHORT', value: 'true', value_type: 'boolean' }); t.textContent = 'Gedrückt'; return true; }
    if (d.hmvar) { this._toggleVar(d.hmvar); return true; }
    if (d.allroom) {
      const r = room(d.allroom); if (!r) return true;
      const ids = [...r.light.map(x => x.entity_id), ...r.sw.flatMap(x => x._grp || [x.entity_id])];
      const any = [...r.light, ...r.sw].some(x => x.state === 'on');
      if (any) h.callService('homeassistant', 'turn_off', { entity_id: ids });
      else if (r.allGrp) { h.callService('light', 'turn_on', { entity_id: r.allGrp.entity_id }); const o = r.sw.flatMap(x => x._grp ? [x._grp[0]] : [x.entity_id]); if (o.length) h.callService('homeassistant', 'turn_on', { entity_id: o }); }
      else h.callService('homeassistant', 'turn_on', { entity_id: [...r.light.map(x => x.entity_id), ...r.sw.map(x => (x._grp || [x.entity_id])[0])] });
      return true;
    }
    if (d.arm) { this._armAsk = d.arm; this._renderAlarm(); return true; }
    if (d.door !== undefined) { if (this._armed(this._alarmEnt()) !== true) this._doorAsk = true; this._renderAlarm(); return true; }
    if (d.doorNo !== undefined) { this._doorAsk = false; this._renderAlarm(); return true; }
    if (d.doorYes !== undefined) {
      const key = this._doorKey(), id = this._doorEnt();
      if (this._armed(this._alarmEnt()) !== true) {
        if (key) h.callService('homematicip_local', 'set_device_value', { device_address: key.addr, channel: key.ch, parameter: 'PRESS_SHORT', value: 'true', value_type: 'boolean' });
        else if (id) h.callService('button', 'press', { entity_id: id });
      }
      this._doorAsk = false; this._doorSent = Date.now(); this._renderAlarm();
      setTimeout(() => this._renderAlarm(), 6500);
      return true;
    }
    if (d.armNo !== undefined) { this._armAsk = null; this._renderAlarm(); return true; }
    if (d.armYes !== undefined) { this._doArm(this._armAsk === 'on'); this._armAsk = null; this._renderAlarm(); return true; }
    return false;
  }

  // ---------- Haustür öffnen (Programm "HT" der Zentrale) ----------
  // Virtuelle Taste "HT 1" der Fernbedienung (wie bei der Alarmanlage), sonst das Programm "HT" als Schaltfläche
  _doorKey() {
    const h = this._hass, svc = h.services && h.services.homematicip_local;
    if (!svc || !svc.set_device_value) return null;
    for (const s of Object.values(h.states)) {
      if (!s.entity_id.startsWith('event.')) continue;
      const e = h.entities && h.entities[s.entity_id], d = e && e.device_id && h.devices && h.devices[e.device_id];
      if (!d || !/RCV-50/i.test(d.model || '')) continue;
      const n = (s.attributes.friendly_name || '').replace(d.name_by_user || d.name || '', '').trim();
      if (!/^ht( \d+)?$/i.test(n)) continue;
      const a = s.attributes, ca = String(a.channel_address || a.address || '');
      const ch = +(ca.split(':')[1] || (s.entity_id.match(/_ch(\d+)/) || [])[1] || (n.match(/(\d+)$/) || [])[1] || 0) || null;
      if (ch) return { addr: ca.split(':')[0] || (d.name || '').split(' ').pop(), ch };
    }
    return null;
  }
  _doorEnt() {
    const c = this._cfg, st = this._hass.states;
    if (c.door) return st[c.door] ? c.door : null;
    const ids = Object.keys(st).filter(x => x.startsWith('button.'));
    return ids.find(x => /_p_ht$/.test(x))
      || ids.find(x => /^(p )?ht( (ö|oe)ffnen)?$|haust(ü|ue)r (auf|(ö|oe)ffnen)/i.test((st[x].attributes.friendly_name || '').trim())) || null;
  }
  _doorHtml(armed) {
    if (!this._doorKey() && !this._doorEnt()) return '';
    // bei scharfer Alarmanlage nicht öffnen
    if (armed) return `<div class="ab one"><button class="door" disabled>${svg('door')} Haustür öffnen · Alarm ist scharf</button></div>`;
    if (this._doorSent && Date.now() - this._doorSent < 6000) return `<div class="cf">Haustür wird geöffnet …</div>`;
    if (this._doorAsk) return `<div class="cf">Haustür wirklich öffnen?<button class="y" data-door-yes>Ja, öffnen</button><button data-door-no>Abbrechen</button></div>`;
    return `<div class="ab one"><button class="door" data-door>${svg('door')} Haustür öffnen</button></div>`;
  }

  // ---------- Alarmanlage ----------
  _alarmEnt() {
    const c = this._cfg, st = this._hass.states, all = Object.values(st);
    const nm = s => (s.attributes.friendly_name || '').trim();
    const find = (doms, re) => { const s = all.find(x => doms.includes(x.entity_id.split('.')[0]) && re.test(nm(x))); return s ? s.entity_id : null; };
    return {
      on: c.alarm_on || find(['button', 'script'], /^(?!.*entsch).*(sch(ä|ae)rfen|scharf schalten)/i),
      off: c.alarm_off || find(['button', 'script'], /entsch(ä|ae)rfen|unscharf/i),
      key: this._alarmKey(),
      pres: c.alarm_presence || this._presence(),
      state: c.alarm_state || find(['switch', 'input_boolean', 'binary_sensor', 'select', 'sensor', 'alarm_control_panel'], /^alarm(anlage)?( scharf| status| zustand)?$/i),
    };
  }
  // Systemvariable der CCU umschalten (z. B. "Carportlicht gesperrt")
  async _toggleVar(id) {
    const h = this._hass, s = this._s(id); if (!s) return;
    const on = /^(on|true|wahr|ja)$/i.test(s.state);
    if (id.startsWith('switch.')) { h.callService('switch', on ? 'turn_off' : 'turn_on', { entity_id: id }); return; }
    if (!this._hmEntry) {
      try { const es = await h.callWS({ type: 'config_entries/get', domain: 'homematicip_local' }); this._hmEntry = es && es[0] && es[0].entry_id; } catch (e) { /* kein Zugriff */ }
    }
    if (!this._hmEntry) return;
    const e = h.entities[id], d = e && e.device_id && h.devices && h.devices[e.device_id];
    const name = (s.attributes.friendly_name || '').replace(d ? (d.name_by_user || d.name || '') : '', '').trim().replace(/^SV\s+/, '');
    h.callService('homematicip_local', 'set_variable_value', { entry_id: this._hmEntry, name, value: !on });
  }

  // Virtuelle Fernbedienung der CCU (HmIP-RCV-50) direkt über homematicip_local drücken
  _alarmKey() {
    const c = this._cfg, k = (this._lay && this._lay.alarm_key) || {};
    const svc = this._hass.services && this._hass.services.homematicip_local;
    if (!svc || !svc.set_device_value) return null;
    // Kanäle "Schärfen"/"Entschärfen" der virtuellen Fernbedienung suchen (Event-Entitäten)
    const h = this._hass, found = {};
    for (const s of Object.values(h.states)) {
      if (!s.entity_id.startsWith('event.')) continue;
      const e = h.entities && h.entities[s.entity_id], d = e && e.device_id && h.devices && h.devices[e.device_id];
      if (!d || !/RCV-50/i.test(d.model || '')) continue;
      const n = (s.attributes.friendly_name || '').replace(d.name_by_user || d.name || '', '').trim();
      const kind = /entsch(ä|ae)rfen|unscharf/i.test(n) ? 'off' : /sch(ä|ae)rfen|scharf/i.test(n) ? 'on' : null;
      if (!kind || found[kind]) continue;
      const a = s.attributes, ca = String(a.channel_address || a.address || '');
      const ch = +(ca.split(':')[1] || (s.entity_id.match(/_ch(\d+)/) || [])[1] || 0) || null;
      found[kind] = { eid: s.entity_id, addr: ca.split(':')[0] || (d.name || '').split(' ').pop(), ch };
    }
    const f = found.on || found.off;
    const on = c.alarm_key_on || k.on || (found.on && found.on.ch), off = c.alarm_key_off || k.off || (found.off && found.off.ch);
    if (!(on || off)) return null;
    return { addr: c.alarm_key_address || (f && f.addr) || 'HmIP-RCV-1', on, off, onEv: found.on && found.on.eid, offEv: found.off && found.off.eid };
  }
  // Systemvariable "Anwesenheit" der CCU: nicht anwesend = scharf
  _presence() {
    const h = this._hass;
    const s = Object.values(h.states).find(x => {
      const e = h.entities && h.entities[x.entity_id];
      return e && e.platform === 'homematicip_local' && /(^|\s)anwesenheit$/i.test((x.attributes.friendly_name || '').trim());
    }) || Object.values(h.states).find(x => /^(sensor|binary_sensor|select|switch|input_select|input_boolean)\./.test(x.entity_id)
      && (/(^|_)anwesenheit$/i.test(x.entity_id) || /(^|\s)anwesenheit$/i.test((x.attributes.friendly_name || '').trim())));
    return s ? s.entity_id : null;
  }
  _armed(a) {
    const p = this._s(a.pres);
    if (p && !a.state) {
      const v = String(p.state).toLowerCase().trim();
      if (/^(on|true|anwesend|ja|wahr|1)$/.test(v)) return false;
      if (/^(off|false|nicht anwesend|abwesend|nein|falsch|0)$/.test(v)) return true;
    }
    const s = this._s(a.state);
    if (!s) {
      // ohne Status: zuletzt gedrückter Knopf (Button-Zustand = Zeitpunkt)
      const t = id => { const x = this._s(id); const v = x && Date.parse(x.state); return isNaN(v) ? 0 : v || 0; };
      const on = t(a.on), off = t(a.off);
      if (on || off) return on > off;
      // Event-Entitäten der Tasten: Zustand = Zeitpunkt des letzten Drucks (auch aus CCU-Programmen)
      if (a.key) { const e1 = t(a.key.onEv), e0 = t(a.key.offEv); if (e1 || e0) return e1 > e0; }
      const l = this._lay && this._lay.alarm_last;
      return l ? !!l.on : null;
    }
    const v = String(s.state).toLowerCase();
    if (v === 'unavailable' || v === 'unknown') return null;
    return /^(on|true|scharf|armed|armed_.*|ein|an)$/.test(v);
  }
  _doArm(on) {
    const a = this._alarmEnt(), h = this._hass, id = on ? a.on : a.off;
    if (this._lay) { this._lay.alarm_last = { on, t: Date.now() }; this._save(); }
    const ch = !id && a.key && (on ? a.key.on : a.key.off);
    if (ch) { h.callService('homematicip_local', 'set_device_value', { device_address: a.key.addr, channel: ch, parameter: 'PRESS_SHORT', value: 'true', value_type: 'boolean' }); return; }
    if (id) { const dom = id.split('.')[0]; h.callService(dom, dom === 'button' ? 'press' : 'turn_on', { entity_id: id }); return; }
    if (a.state && /^(switch|input_boolean)\./.test(a.state)) h.callService('homeassistant', on ? 'turn_on' : 'turn_off', { entity_id: a.state });
    if (a.state && a.state.startsWith('alarm_control_panel.')) h.callService('alarm_control_panel', on ? 'alarm_arm_away' : 'alarm_disarm', { entity_id: a.state });
  }
  _alarmSub(a, armed) {
    const l = this._lay && this._lay.alarm_last;
    const t = id => { const x = this._s(id); const v = x && Date.parse(x.state); return isNaN(v) ? 0 : v || 0; };
    const ev = a.key ? Math.max(t(a.key.onEv), t(a.key.offEv)) : 0;
    const p = !a.state && this._s(a.pres);
    if (p && this._armed(a) !== null) {
      const d = new Date(p.last_changed), now = new Date();
      const when = (d.toDateString() === now.toDateString() ? '' : d.toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' }) + ' ') + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      return `seit ${when} Uhr`;
    }
    if (!a.state && ev) {
      const d = new Date(ev), now = new Date();
      const when = (d.toDateString() === now.toDateString() ? '' : d.toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' }) + ' ') + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      return `seit ${when} Uhr`;
    }
    if (!a.state && l && l.t) {
      const d = new Date(l.t), now = new Date();
      const when = (d.toDateString() === now.toDateString() ? '' : d.toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' }) + ' ') + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      return `zuletzt hier ${l.on ? 'scharf' : 'unscharf'} geschaltet, ${when} Uhr`;
    }
    return armed ? 'Sirene löst bei Öffnen aus' : 'Antippen zum Schalten';
  }
  _renderAlarm() {
    const el = this._k.alarm; if (!el) return;
    const a = this._alarmEnt(), armed = this._armed(a);
    const can = a.on || a.off || a.key || (a.state && /^(switch|input_boolean|alarm_control_panel)\./.test(a.state));
    let html;
    if (!can && armed === null) {
      html = `<div class="alarm"><div class="st">${svg('shield')}<div><b>Alarmanlage</b><span>noch nicht mit Home Assistant verbunden</span></div></div>
        <div class="ab"><button disabled>Scharf schalten</button><button class="off" disabled>Unscharf</button></div>${this._doorHtml(armed)}</div>`;
    } else {
      const ask = this._armAsk ? `<div class="cf">${this._armAsk === 'on' ? 'Wirklich scharf schalten?' : 'Wirklich unscharf schalten?'}<button class="y" data-arm-yes>Ja</button><button data-arm-no>Abbrechen</button></div>` : '';
      html = `<div class="alarm ${armed ? 'on' : ''}"><div class="st">${svg(armed ? 'lock' : 'shield')}<div><b>Alarmanlage ${armed === null ? '' : armed ? 'scharf' : 'unscharf'}</b><span>${this._alarmSub(a, armed)}</span></div></div>
        <div class="ab"><button data-arm="on" ${armed ? 'disabled' : ''}>Scharf schalten</button><button class="off" data-arm="off" ${armed === false ? 'disabled' : ''}>Unscharf</button></div>${ask}${this._doorHtml(armed)}</div>`;
    }
    if (el.dataset.v !== html) { el.dataset.v = html; el.innerHTML = html; }
  }

  // Suchwort: find oder aus dem Namen (Haustür -> haustuer)
  _key(m) {
    const t = (m.find || m.name || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
    return t.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  // Klingel gedrückt? binary_sensor mit Stichwort und Besucher/Visitor
  _ringing(m) {
    const f = this._key(m);
    if (!f) return false;
    return Object.values(this._hass.states).some(s => s.entity_id.startsWith('binary_sensor.') && s.entity_id.includes(f)
      && /besucher|visitor/.test(s.entity_id) && s.state === 'on');
  }

  _stream(id) { const s = this._s(id); return !!(s && (s.attributes.supported_features & 2)); }

  _more(entityId) {
    const ev = new Event('hass-more-info', { bubbles: true, composed: true });
    ev.detail = { entityId };
    this.dispatchEvent(ev);
  }
  _set(k, v) { const e = this._k[k]; if (e && e.textContent !== String(v)) e.textContent = v; }

  // ---------- Handy-Meldungen (ersetzen die Pushover-Programme der CCU) ----------
  // Sucht die passenden Geräte und legt dafür Automationen in Home Assistant an, die über die App aufs Handy melden.
  _notifPlan() {
    const h = this._hass, st = Object.values(h.states);
    const ent = x => h.entities && h.entities[x.entity_id];
    const hm = x => { const e = ent(x); return e && e.platform === 'homematicip_local'; };
    const nm = x => (x.attributes.friendly_name || '').trim();
    const dom = x => x.entity_id.split('.')[0];
    const pick = (doms, re, not) => st.find(x => hm(x) && doms.includes(dom(x)) && re.test(nm(x)) && !(not && not.test(nm(x))));
    const phones = Object.keys((h.services && h.services.notify) || {}).filter(x => x.startsWith('mobile_app_'));
    const ae = this._alarmEnt(), pres = (ae && ae.pres) || this._presence();
    const alarm = pick(['binary_sensor', 'sensor', 'switch', 'select'], /(^|\s)(SV\s+)?alarm(meldung|zustand|status)?$/i, /anlage/i);
    const door = pick(['switch'], /haust(ü|ue)r( 1)?$/i, /optisch|sperr/i);
    const carport = pick(['switch', 'light'], /carportlicht( 1)?$/i, /gesperrt|sperr|dauerhaft/i);
    const water = st.filter(x => hm(x) && dom(x) === 'binary_sensor' && /wasser/i.test(nm(x)));
    // wie in der CCU: Raumtemperatur der Thermostate, nicht Heizungs- oder Vorlauffühler
    const temps = st.filter(x => hm(x) && dom(x) === 'climate' && x.attributes.current_temperature != null && !/au(ß|ss)en|garten|carport|terrasse/i.test(nm(x)));
    return { phones, items: [
      { id: 'zuhause_alarm_status', name: 'Alarmanlage scharf / unscharf', ids: pres ? [pres] : [] },
      { id: 'zuhause_alarm_ausgeloest', name: 'Alarm ausgelöst', ids: alarm ? [alarm.entity_id] : [], loud: true },
      { id: 'zuhause_haustuer', name: 'Haustür geöffnet (Türöffner)', ids: door ? [door.entity_id] : [] },
      { id: 'zuhause_carportlicht', name: 'Carportlicht an', ids: carport ? [carport.entity_id] : [] },
      { id: 'zuhause_wasser', name: 'Wasser im Keller', ids: water.map(x => x.entity_id), loud: true },
      { id: 'zuhause_zu_heiss', name: 'Zu heiß (über 35 °C)', ids: temps.map(x => x.entity_id), loud: true },
    ] };
  }
  _notifCfg(it, phones) {
    const loud = it.loud ? { priority: 'high', ttl: 0, channel: 'alarm_stream', push: { 'interruption-level': 'time-sensitive', sound: 'default' } } : { push: { sound: 'default' } };
    const send = (title, message) => phones.map(p => ({ action: 'notify.' + p, data: { title, message, data: loud } }));
    const base = { id: it.id, alias: 'Zuhause: ' + it.name, description: 'Angelegt vom Zuhause-Dashboard', mode: 'queued' };
    const nb = { not_from: ['unavailable', 'unknown'], not_to: ['unavailable', 'unknown'] };
    if (it.id === 'zuhause_alarm_status') return { ...base, triggers: [{ trigger: 'state', entity_id: it.ids, ...nb }],
      actions: [{ choose: [{ conditions: [{ condition: 'template', value_template: "{{ trigger.to_state.state | lower in ['off', 'false', 'nicht anwesend', 'abwesend'] }}" }], sequence: send('Alarmanlage', 'Alarmanlage ist scharf') }],
        default: send('Alarmanlage', 'Alarmanlage ist unscharf') }] };
    if (it.id === 'zuhause_zu_heiss') return { ...base, mode: 'single', triggers: [{ trigger: 'numeric_state', entity_id: it.ids, attribute: 'current_temperature', above: 35 }],
      actions: [...send('Zu heiß!', "{{ state_attr(trigger.entity_id, 'friendly_name') }}: {{ state_attr(trigger.entity_id, 'current_temperature') }} °C"), { delay: '00:30:00' }] };
    const txt = { zuhause_alarm_ausgeloest: ['Alarm!', 'Alarm ausgelöst!'], zuhause_haustuer: ['Haustür', 'Haustür auf'], zuhause_carportlicht: ['Carportlicht', 'Carportlicht an'], zuhause_wasser: ['Wasser im Keller', 'Wasser im Keller!'] }[it.id];
    return { ...base, triggers: [{ trigger: 'state', entity_id: it.ids, to: ['on', 'true', 'ausgelöst'], not_from: ['unavailable', 'unknown'] }], actions: send(...txt) };
  }
  async _notifAction(what) {
    const h = this._hass, plan = this._notifPlan();
    if (!plan.phones.length) { this._notifMsg = 'Kein Handy mit der Home-Assistant-App gefunden.'; this._notifSig = null; this._renderNotif(); return; }
    if (what === 'test') {
      const res = await Promise.all(plan.phones.map(p => h.callService('notify', p, { title: 'Zuhause', message: 'Testmeldung vom Dashboard an ' + p.replace('mobile_app_', '') })
        .then(() => `${p.replace('mobile_app_', '')}: gesendet`, e => `${p.replace('mobile_app_', '')}: Fehler (${(e && (e.message || e.code)) || 'unbekannt'})`)));
      this._notifMsg = res.join(' · ');
    } else {
      let ok = 0, fail = 0;
      for (const it of plan.items) {
        if (!it.ids.length) continue;
        try { await h.callApi('POST', 'config/automation/config/' + it.id, this._notifCfg(it, plan.phones)); ok++; } catch (e) { fail++; }
      }
      this._notifMsg = fail ? `${ok} eingerichtet, ${fail} fehlgeschlagen.` : `✓ ${ok} Meldungen eingerichtet.`;
    }
    this._notifSig = null; this._renderNotif();
  }
  // Einmalig: Christof will nur Alarm ausgelöst, zu heiß, Haustür und Carportlicht als Meldung (29.10.2026)
  _notifDefaults() {
    const h = this._hass, L = this._lay;
    if (!L || L.nOff1 || !(h.user && h.user.is_admin)) return;
    const off = Object.values(h.states).filter(x => x.entity_id.startsWith('automation.') && ['zuhause_alarm_status', 'zuhause_wasser'].includes(x.attributes.id));
    if (!off.length) return;
    L.nOff1 = 1; this._save();
    h.callService('automation', 'turn_off', { entity_id: off.map(x => x.entity_id) });
  }
  _renderNotif() {
    this._notifDefaults();
    const k = this._k.notif; if (!k) return;
    const admin = this._hass.user && this._hass.user.is_admin;
    if (!this._arrange || !admin) { if (k.innerHTML) { k.innerHTML = ''; this._notifSig = null; } return; }
    const plan = this._notifPlan();
    const autos = Object.values(this._hass.states).filter(x => x.entity_id.startsWith('automation.') && x.attributes.id);
    const autoIds = autos.reduce((m, x) => (m[x.attributes.id] = x.state, m), {}), autoEnt = autos.reduce((m, x) => (m[x.attributes.id] = x.entity_id, m), {});
    const sig = JSON.stringify([plan, autoIds, this._notifMsg]);
    if (sig === this._notifSig) return; this._notifSig = sig;
    const ph = plan.phones.map(p => p.replace('mobile_app_', '').replace(/_/g, ' ')).join(', ') || 'keins gefunden';
    k.innerHTML = `<div class="sect">Handy-Meldungen</div><p class="sub" style="margin:0 0 6px">Kommen über die Home-Assistant-App an: ${ph}</p>`
      + plan.items.map(it => `<div class="row"><div class="txt"><b>${it.name}</b><div class="s" style="color:var(--muted);font-size:12px">${!it.ids.length ? 'Gerät nicht gefunden' : autoIds[it.id] === 'on' ? '✓ aktiv' : autoIds[it.id] ? 'ausgeschaltet' : 'noch nicht eingerichtet'}</div></div>${autoEnt[it.id] ? `<button class="tg" role="switch" aria-label="${it.name}" aria-checked="${autoIds[it.id] === 'on'}" data-notiftg="${autoEnt[it.id]}"></button>` : ''}</div>`).join('')
      + `<div style="display:flex;gap:8px;margin-top:8px"><button class="btn" data-notif="setup">Einrichten</button><button class="btn" data-notif="test">Testmeldung</button></div>`
      + (this._notifMsg ? `<p class="sub" style="margin-top:6px">${this._notifMsg}</p>` : '');
  }

  // ---------- Wallbox: Betriebsart PV / Schnell per Knopf (SMA EV Charger) ----------
  _wbEnt(doms, re) {
    const h = this._hass;
    const x = Object.values(h.states).find(s => doms.includes(s.entity_id.split('.')[0]) && (s.entity_id.includes('smaev') || /wallbox|ladestation|ev charger/i.test(s.attributes.friendly_name || '')) && re.test(s.attributes.friendly_name || ''));
    return x || null;
  }
  _wbSess() {
    const s = this._wbEnt(['sensor'], /energie ladevorgang|charging session energy/i);
    if (!s) return false;
    let v = parseFloat(s.state); if (isNaN(v)) return false;
    if ((s.attributes.unit_of_measurement || '').toLowerCase() === 'wh') v /= 1000;
    this._set('wbtoday', de(v, 1));
    return true;
  }
  // Nach dem Abstecken automatisch zurück auf PV-Laden (Automation in Home Assistant, einmalig angelegt)
  _wbAuto(sel, pv) {
    const h = this._hass;
    if (this._wbAutoT || !pv || !(h.user && h.user.is_admin)) return;
    const st = this._wbEnt(['sensor'], /status ladevorgang|charging session status/i);
    if (!st) return;
    this._wbAutoT = true;
    const id = 'zuhause_wallbox_pv_nach_abstecken';
    if (Object.values(h.states).some(x => x.entity_id.startsWith('automation.') && x.attributes.id === id)) return;
    h.callApi('POST', 'config/automation/config/' + id, {
      id, alias: 'Zuhause: Wallbox nach dem Abstecken auf PV-Laden', description: 'Angelegt vom Zuhause-Dashboard', mode: 'single',
      triggers: [{ trigger: 'state', entity_id: st.entity_id, not_from: ['unavailable', 'unknown'] }],
      conditions: [{ condition: 'template', value_template: "{% set s = trigger.to_state.state | lower %}{{ ('nicht' in s and 'verbunden' in s) or 'not connected' in s or 'getrennt' in s }}" },
        { condition: 'template', value_template: `{{ states('${sel.entity_id}') != '${pv}' }}` }],
      actions: [{ action: 'select.select_option', target: { entity_id: sel.entity_id }, data: { option: pv } }],
    }).catch(() => { this._wbAutoT = false; });
  }

  async _setWbMode(eid, opt) {
    const h = this._hass;
    if (/vorgabe|setpoint/i.test(opt)) {
      const en = this._wbEnt(['number'], /energiemenge/i), du = this._wbEnt(['number'], /dauer des ladevorg/i);
      if (en && du) {
        const kwh = Math.min(+en.attributes.max || 100, 100);
        // 11 kW sind das Maximum der Wallbox: Ziel so wählen, dass sie die ganze Zeit voll laden muss
        const min = Math.max(+du.attributes.min || 1, Math.min(+du.attributes.max || 1e9, Math.floor(kwh / 11 * 60)));
        await h.callService('number', 'set_value', { entity_id: en.entity_id, value: kwh }).catch(() => {});
        await h.callService('number', 'set_value', { entity_id: du.entity_id, value: min }).catch(() => {});
      }
    }
    h.callService('select', 'select_option', { entity_id: eid, option: opt });
  }

  _renderWbMode() {
    const k = this._k.wbmode; if (!k) return;
    this._wbSess();
    const sel = this._wbEnt(['select'], /betriebsart des ladevorgangs|charging mode|operating mode of charge/i);
    if (!sel) { if (k.innerHTML) k.innerHTML = ''; return; }
    const opts = sel.attributes.options || [], cur = sel.state;
    const pv = opts.find(o => /optimiert|optimized/i.test(o));
    // ohne eigene Option "Schnellladen": "Laden mit Vorgabe" mit so viel Energie in so kurzer Zeit, dass die Wallbox voll lädt
    const fast = opts.find(o => /schnell|fast/i.test(o)) || opts.find(o => /vorgabe|setpoint/i.test(o));
    this._wbAuto(sel, pv);
    const sw = this._wbEnt(['sensor'], /drehschalter|rotary switch/i);
    const locked = sw && /schnell|fast/i.test(sw.state);
    const btn = (o, label) => o ? `<button class="seg${cur === o ? ' on' : ''}" data-wbmode="${sel.entity_id}|${o}" ${locked ? 'disabled' : ''}>${label}</button>` : '';
    const html = `<div class="segs">${btn(pv, '☀ PV-Laden')}${btn(fast, '⚡ Schnell')}</div>`
      + (locked ? `<p class="sub" style="margin:6px 0 0;color:var(--warn,#c77d18)">Der Drehschalter an der Wallbox steht auf Schnellladen. Stell ihn einmal auf die zweite Stellung, dann kannst du hier umschalten.</p>` : '');
    if (k.dataset.v !== html) { k.dataset.v = html; k.innerHTML = html; }
  }

  _update() {
    const c = this._cfg, k = this._k;
    const h = new Date().getHours();
    this._set('greet', h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend');
    this._renderNotif();
    // Begrüßung mit dem Namen des angemeldeten Benutzers
    this._set('uname', (this._hass.user && this._hass.user.name) || c.name);

    // Wetter jetzt
    const w = this._s(c.weather);
    if (w) {
      this._set('wt', de(w.attributes.temperature, 1));
      this._set('wc', WX[w.state] || w.state);
      const parts = [];
      if (w.attributes.humidity != null) parts.push(`${Math.round(w.attributes.humidity)} % Feuchte`);
      if (w.attributes.wind_speed != null) parts.push(`${Math.round(w.attributes.wind_speed)} ${w.attributes.wind_speed_unit || 'km/h'} Wind`);
      this._set('wd', parts.join(' · '));
    }

    // Energie
    const mIn = c.batteries.some(b => this._isM(b)) ? this._mIn() : 0; // Module an den Marstek-Speichern
    const pv0 = this._kw(c.pv), pv = pv0 === null && !mIn ? null : (pv0 || 0) + mIn, gin = this._kw(c.grid_in) || 0, gout = this._kw(c.grid_out) || 0, wb = this._kw(c.wallbox) || 0;
    const grid = gin - gout;
    const batP = c.batteries.reduce((a, b) => a + (this._batP(b) || 0), 0); // positiv = lädt
    const house = Math.max(0, (pv || 0) + grid - wb - batP);
    // Unter 1 kW in Watt, sonst kW mit einer Stelle
    const pw = (key, v) => { if (v === null) { this._set('v' + key, '–'); return; } const w = Math.abs(v) < 1; this._set('v' + key, w ? Math.round(v * 1000) : de(v, 1)); this._set('u' + key, w ? 'W' : 'kW'); };
    pw('pv', pv0);
    // Balkon: Module an den Marstek-Speichern
    const mb = c.batteries.find(b => this._isM(b)), mSoc = mb ? this._batSoc(mb) : null, mP = mb ? this._batP(mb) : null;
    pw('bk', mb && (mSoc !== null || mIn) ? mIn : null);
    this._set('sbk', mSoc === null ? (mb ? 'noch nicht verbunden' : '') : `Akku ${Math.round(mSoc)} %` + (mP > 0.02 ? ' · lädt' : mP < -0.02 ? ' · gibt ab' : ''));
    // die einzelnen Module (je Marstek zwei Eingänge)
    const mods = mb ? this._marstek().flatMap(d => [d.i1, d.i2]).filter(Boolean).map(id => this._n(id)).filter(v => v !== null) : [];
    this._set('sbk2', mods.length ? mods.map(v => Math.round(v)).join(' · ') + ' W' : '');
    k.dbk.classList.toggle('idle', !(mIn > 0.005));
    k.fbk.classList.toggle('idle', !(mIn > 0.005));
    this._renderFav();
    pw('house', house + wb);
    this._set('shouse', wb > 0.05 ? 'inkl. Wallbox' : 'Verbrauch');
    pw('grid', Math.abs(grid));
    this._set('sgrid', grid < -0.01 ? 'Einspeisung' : grid > 0.01 ? 'Bezug' : 'ausgeglichen');
    // Woher der Strom gerade kommt
    const src = [grid > 0.05 && 'Netz', batP < -0.02 && 'Speicher', (pv || 0) > 0.05 && 'Sonnen'].filter(Boolean);
    const srcTxt = src.length ? 'Mit ' + (src.length > 1 ? src.slice(0, -1).map(x => x + '-').join(', ') + ' und ' + src[src.length - 1] : src[0]) + 'strom' : '';
    this._set('eh', wb > 0.05 ? 'Auto lädt' : 'Dein Energiefluss');
    this._set('esub', wb > 0.05 ? (srcTxt || 'Wallbox aktiv')
      : (pv || 0) > 0.05 ? (grid < 0 ? 'Die Sonne liefert mehr, als du brauchst' : 'Die Sonne liefert gerade Energie')
      : 'Gerade kein Sonnenstrom');
    k.dgrid.classList.toggle('idle', Math.abs(grid) < 0.02);
    // Speicher in der Grafik = Hausspeicher (Anker), Marstek steht beim Balkon
    const aP = c.batteries.filter(b => !this._isM(b)).reduce((a, b) => a + (this._batP(b) || 0), 0);
    k.fpv.classList.toggle('idle', !((pv0 || 0) > 0.05));
    k.dpv.classList.toggle('idle', !((pv0 || 0) > 0.05));
    k.dbat.classList.toggle('idle', Math.abs(aP) < 0.02);
    k.fbatI.classList.toggle('idle', !(aP < -0.02)); // entlädt: vom Speicher ins Haus
    k.fbatO.classList.toggle('idle', !(aP > 0.02)); // lädt: vom Haus in den Speicher
    k.fgridI.classList.toggle('idle', !(grid > 0.02)); // Bezug
    k.fgridO.classList.toggle('idle', !(grid < -0.02)); // Einspeisung: vom Haus ins Netz

    // Batterien
    const socs = [];
    c.batteries.forEach((b, i) => {
      const soc = this._batSoc(b), p = this._batP(b);
      if (soc === null) {
        if (k['bsoc' + i]) { k['bsoc' + i].className = 'pill off'; this._set('bsoc' + i, 'noch nicht verbunden'); k['bbar' + i].style.width = '0'; this._set('bsub' + i, 'wird angezeigt, sobald das Gerät in Home Assistant ist'); }
      } else {
        if (!this._isM(b)) socs.push(soc);
        if (k['bsoc' + i]) { k['bsoc' + i].className = 'num'; this._set('bsoc' + i, `${Math.round(soc)} %`); k['bbar' + i].style.width = `${Math.max(0, Math.min(100, soc))}%`; }
        this._set('bsub' + i, (p === null ? '' : p > 0.02 ? `lädt ${de(p, 1)} kW` : p < -0.02 ? `entlädt ${de(-p, 1)} kW` : 'Ruhe')
          + (this._isM(b) && mIn > 0.005 ? ` · Module ${Math.round(mIn * 1000)} W` : ''));
      }
    });
    this._set('vbat', socs.length ? Math.round(socs.reduce((a, b) => a + b, 0) / socs.length) + ' %' : '–');
    const ap = Math.abs(aP) < 1 ? Math.round(Math.abs(aP) * 1000) + ' W' : de(Math.abs(aP), 1) + ' kW';
    this._set('sbat', !socs.length ? 'noch nicht verbunden' : aP > 0.02 ? `↓ lädt ${ap}` : aP < -0.02 ? `↑ entlädt ${ap}` : 'Ruhe');
    this._set('bsub', socs.length ? 'Ladestand deiner Speicher' : 'Vorbereitet, Anbindung folgt');

    // Wallbox und Auto
    const soc = this._n(c.car_soc);
    this._set('csoc', soc === null ? '–' : `${Math.round(soc)} %`);
    k.cbar.style.width = soc === null ? '0' : `${soc}%`;
    this._set('wbp', de(wb, 1));
    this._renderWbMode();

    // Sicherheit (ohne ausgeblendete Kontakte)
    const hc = (this._lay && this._lay.hc) || [], arr = !!this._arrange;
    c.contacts.forEach((x, i) => {
      const hid = hc.includes(x.entity), row = k['crow' + i], b = k['chb' + i];
      if (row) row.hidden = hid && !arr;
      if (b) { b.hidden = !arr; b.textContent = hid ? 'einblenden' : 'ausblenden'; }
    });
    const cs = c.contacts.filter(x => !hc.includes(x.entity));
    const open = cs.filter(x => { const s = this._s(x.entity); return s && s.state === 'on'; });
    c.contacts.forEach((x, i) => {
      const s = this._s(x.entity), e = k['ct' + i];
      if (!s) { e.className = 'pill off'; this._set('ct' + i, 'nicht gefunden'); }
      else if (s.state === 'unavailable' || s.state === 'unknown') { e.className = 'pill warn'; this._set('ct' + i, 'nicht erreichbar'); }
      else if (s.state === 'on') { e.className = 'pill warn'; this._set('ct' + i, 'offen'); }
      else { e.className = 'pill off'; this._set('ct' + i, 'zu'); }
    });
    const lost = cs.filter(x => { const s = this._s(x.entity); return s && (s.state === 'unavailable' || s.state === 'unknown'); });
    const known = cs.filter(x => this._s(x.entity)).length - lost.length;
    this._set('nopen', open.length);
    this._set('nclosed', known - open.length);
    k.shield.classList.toggle('alert', open.length > 0 || lost.length > 0);
    this._set('sech', open.length ? `${open.length} offen` : lost.length ? `${lost.length} ohne Verbindung` : 'Alles im Blick');
    this._set('secs', open.length ? 'Bitte prüfen, ob das so gewollt ist.' : lost.length ? (lost.length > 1 ? 'Kontakte melden sich nicht' : 'Ein Kontakt meldet sich nicht') + ', vielleicht ist die Batterie leer.' : 'Alle Türen und Fenster sind zu.');

    // Kopfzeile
    this._set('chOpen', open.length === 1 ? '1 Tür/Fenster offen' : `${open.length} Türen/Fenster offen`);

    // Räume und Alarmanlage
    this._renderRooms();
    this._renderAlarm();

    // Kameras
    this._cams.forEach((m, i) => {
      const s = this._s(m.id), v = k['cv' + i];
      if (s && s.attributes.entity_picture) {
        const src = s.attributes.entity_picture;
        if (v.dataset.src !== src) { v.dataset.src = src; v.innerHTML = `<img src="${src}" alt="${m.name}"><span class="live">LIVE</span>`; }
        this._set('cs' + i, m.brand);
      } else {
        if (v.dataset.src !== '') { v.dataset.src = ''; v.innerHTML = svg('cam'); }
        this._set('cs' + i, m.app ? `${m.brand} · nur App` : `${m.brand} · folgt`);
      }
    });

    // Hinweise
    const hints = [];
    this._cams.forEach(m => { if (this._ringing(m)) hints.push([`Es klingelt: ${m.name}`, 'jetzt', 'warn']); });
    Object.values(this._hass.states).forEach(s => {
      if (s.attributes.device_class === 'battery' && s.entity_id.startsWith('sensor.')) {
        const v = parseFloat(s.state);
        if (!isNaN(v) && v < 20) hints.push([`Batterie ${s.attributes.friendly_name.replace(/ ?Batterie| ?Battery level/i, '')}`, `${Math.round(v)} %`, 'warn']);
      }
    });
    if (wb > 0.05 && soc !== null) hints.push(['Auto lädt', `${Math.round(soc)} %`, 'info']);
    const hk = JSON.stringify(hints);
    if (k.hints.dataset.v !== hk) {
      k.hints.dataset.v = hk;
      k.hints.innerHTML = hints.length
        ? '<div class="eyebrow" style="margin:12px 0 2px"><span>Hinweise</span></div>' + hints.slice(0, 6).map(([a, b, cl]) => `<div class="row"><div class="txt"><b>${a}</b></div><span class="pill ${cl}">${b}</span></div>`).join('')
        : '';
    }
  }

  _subForecast() {
    this._fcSub = true;
    this._hass.connection.subscribeMessage(msg => {
      const fc = (msg.forecast || []).slice(0, 5);
      const k = this._k.fc; if (!k) return;
      k.innerHTML = fc.map(d => {
        const dt = new Date(d.datetime);
        const pp = d.precipitation_probability;
        return `<div title="${WX[d.condition] || ''}">${DAYS[dt.getDay()]}${wxIcon(d.condition)}<span class="wl">${WXS[d.condition] || ''}</span><b class="num">${Math.round(d.temperature)}°</b><span class="num" style="color:var(--muted)">${d.templow != null ? Math.round(d.templow) + '°' : ''}</span><span class="pp num"><svg class="dr" viewBox="0 0 10 12"><path d="M5 0C3 3.5 1 5.6 1 7.8a4 4 0 0 0 8 0C9 5.6 7 3.5 5 0z" fill="currentColor"/></svg>${pp != null ? Math.round(pp) + ' %' : de(d.precipitation || 0, 1) + ' mm'}</span></div>`;
      }).join('');
      if (fc[1]) this._set('wxs', `Morgen ${WX[fc[1].condition] || ''}, bis ${Math.round(fc[1].temperature)} °C`);
    }, { type: 'weather/subscribe_forecast', forecast_type: 'daily', entity_id: this._cfg.weather }).catch(() => { this._fcSub = false; });
    this._hass.connection.subscribeMessage(msg => { this._hourly = (msg.forecast || []).slice(0, 24); this._drawHourly(); },
      { type: 'weather/subscribe_forecast', forecast_type: 'hourly', entity_id: this._cfg.weather }).catch(() => {});
  }

  // Stundenvorhersage: Temperaturlinie mit Symbol, Uhrzeit und Regenwahrscheinlichkeit
  _drawHourly() {
    const k = this._k.fch, fc = this._hourly || []; if (!k || !fc.length) return;
    const cw = 52, W = cw * fc.length, ts = fc.map(f => f.temperature);
    const lo = Math.min(...ts), hi = Math.max(...ts), y = v => 58 - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * 34;
    let g = `<polyline fill="none" stroke="var(--sun)" stroke-width="2" points="${fc.map((f, i) => `${i * cw + cw / 2},${y(f.temperature)}`).join(' ')}"/>`;
    fc.forEach((f, i) => {
      const x = i * cw + cw / 2, d = new Date(f.datetime), p = f.precipitation_probability;
      g += `<text class="tt" x="${x}" y="${y(f.temperature) - 8}" text-anchor="middle">${Math.round(f.temperature)}°</text>`
        + `<circle cx="${x}" cy="${y(f.temperature)}" r="2.5" fill="var(--sun)"/>`
        + wxIcon(f.condition).replace('<svg ', `<svg x="${x - 14}" y="70" width="28" height="30" `)
        + (p ? `<text class="rp" x="${x}" y="114" text-anchor="middle">${Math.round(p)} %</text>` : (f.precipitation ? `<text class="rp" x="${x}" y="114" text-anchor="middle">${de(f.precipitation, 1)} mm</text>` : ''))
        + `<text x="${x}" y="134" text-anchor="middle">${i === 0 ? 'Jetzt' : d.getHours() === 0 ? DAYS[d.getDay()] : String(d.getHours()).padStart(2, '0') + ':00'}</text>`;
    });
    this._rainWarn(fc);
    const html = `<svg viewBox="0 0 ${W} 142" width="${W}" role="img" aria-label="Wetter der nächsten 24 Stunden">${g}</svg>`;
    if (k.dataset.v !== html) { k.dataset.v = html; k.innerHTML = html; }
  }

  // Hinweis, wenn in den nächsten Stunden Regen aufzieht
  _rainWarn(fc) {
    const k = this._k.rainw; if (!k) return;
    const wet = f => /rain|pouring|lightning|hail|snow/.test(f.condition || '') || (f.precipitation_probability || 0) >= 50 || (f.precipitation || 0) >= 0.3;
    const i = fc.slice(0, 12).findIndex(wet);
    if (i < 0) { k.hidden = true; return; }
    let j = i; while (j + 1 < fc.length && wet(fc[j + 1])) j++;
    const hh = f => { const d = new Date(f.datetime); return (d.toDateString() !== new Date().toDateString() && d.getHours() >= 5 ? 'morgen ' : '') + d.getHours() + ' Uhr'; }, snow = /snow/.test(fc[i].condition || '');
    const what = snow ? 'Schnee' : /lightning/.test(fc[i].condition || '') ? 'Gewitter' : 'Regen';
    const from = i === 0 ? `${what} jetzt` : `${what} ab ${hh(fc[i])}`;
    const to = j + 1 < fc.length ? `, bis etwa ${hh(fc[j + 1])}` : '';
    const p = Math.max(...fc.slice(i, j + 1).map(f => f.precipitation_probability || 0));
    k.innerHTML = `${wxIcon(fc[i].condition)}<span><b>${from}</b>${to}${p ? ` · ${Math.round(p)} %` : ''}</span>`;
    k.hidden = false;
  }

  async _loadHistory() {
    try {
      const prefs = await this._hass.callWS({ type: 'energy/get_prefs' });
      const pvIds = [], inIds = [], outIds = [], fcEntries = [];
      let wbId = null;
      (prefs.energy_sources || []).forEach(s => {
        if (s.type === 'solar') { if (s.stat_energy_from) pvIds.push(s.stat_energy_from); (s.config_entry_solar_forecast || []).forEach(x => fcEntries.push(x)); }
        if (s.type === 'grid') {
          (s.flow_from || []).forEach(f => inIds.push(f.stat_energy_from));
          (s.flow_to || []).forEach(f => outIds.push(f.stat_energy_to));
          if (s.stat_energy_from) inIds.push(s.stat_energy_from);
          if (s.stat_energy_to) outIds.push(s.stat_energy_to);
        }
      });
      (prefs.device_consumption || []).forEach(d => { if (/ladestation|smaev|wallbox/i.test(d.stat_consumption)) wbId = d.stat_consumption; });
      // jeden Zähler nur einmal zählen (neue und alte Form der Energie-Einstellungen können denselben Zähler doppelt nennen)
      [pvIds, inIds, outIds].forEach(l => l.splice(0, l.length, ...new Set(l.filter(Boolean))));
      const ids = [...pvIds, ...inIds, ...outIds, wbId].filter(Boolean);
      if (!ids.length) { this._k.hist.innerHTML = '<p class="sub">Keine Energie-Konfiguration gefunden.</p>'; return; }
      const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6);
      const y0 = new Date(); y0.setHours(0, 0, 0, 0); y0.setDate(y0.getDate() - 1);
      const c = this._cfg, pw = [c.pv, c.grid_in, c.grid_out].filter(Boolean);
      const [stats, st5, fc, pm, sth] = await Promise.all([
        this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: start.toISOString(), period: 'day', statistic_ids: ids, types: ['change'], units: { energy: 'kWh' } }),
        this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: y0.toISOString(), period: '5minute', statistic_ids: ids, types: ['change'], units: { energy: 'kWh' } }).catch(() => ({})),
        this._hass.callWS({ type: 'energy/solar_forecast' }).catch(() => null),
        pw.length ? this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: y0.toISOString(), period: '5minute', statistic_ids: pw, types: ['mean'], units: { power: 'kW' } }).catch(() => ({})) : {},
        this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: y0.toISOString(), period: 'hour', statistic_ids: ids, types: ['change'], units: { energy: 'kWh' } }).catch(() => ({})),
      ]);
      // Woche: kWh pro Tag
      const days = [];
      for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
      const series = id => days.map(d => {
        const row = (stats[id] || []).find(r => new Date(r.start).toDateString() === d.toDateString());
        return row && row.change ? Math.max(0, row.change) : 0;
      });
      const zero = () => days.map(() => 0);
      const sum = arr => arr.reduce((a, b) => a.map((x, i) => x + b[i]), zero());
      const pv = sum(pvIds.map(series)), gin = sum(inIds.map(series)), gout = sum(outIds.map(series));
      const wb = wbId ? series(wbId) : zero();
      const t = 6;
      // SMA hat Vorrang: Tagesertrag direkt vom Wechselrichter
      const sma = Object.values(this._hass.states).find(x => /^sensor\.sn_\d+_daily_yield$/.test(x.entity_id) || /tagesertrag|daily yield/i.test(x.attributes.friendly_name || ''));
      const smaKwh = sma && !isNaN(parseFloat(sma.state)) ? parseFloat(sma.state) / ((sma.attributes.unit_of_measurement || '').toLowerCase() === 'wh' ? 1000 : 1) : null;
      if (smaKwh !== null) pv[t] = smaKwh;
      this._set('today', `${de(pv[t], 1)} kWh`);
      const use = pv[t] + gin[t] - gout[t];
      this._set('aut', use > 0 ? `${Math.round(Math.max(0, Math.min(1, 1 - gin[t] / use)) * 100)} %` : '–');
      this._wbDay = wb[t]; if (!this._wbSess()) this._set('wbtoday', de(wb[t], 1));
      // Gestern/Heute: Leistung je Viertelstunde in kW (aus 5-Minuten-Statistik)
      const q = new Map();
      const addQ = (id, key) => (st5[id] || []).forEach(r => {
        const d = new Date(r.start); d.setMinutes(Math.floor(d.getMinutes() / 15) * 15, 0, 0);
        const e = q.get(+d) || { pv: 0, gin: 0, gout: 0 }; e[key] += Math.max(0, r.change || 0); q.set(+d, e);
      });
      // bevorzugt: Leistung direkt (SMA-Wechselrichter und Netzzähler), Mittelwert je Viertelstunde
      if (c.pv && (pm[c.pv] || []).length) {
        [[c.pv, 'pv'], [c.grid_in, 'gin'], [c.grid_out, 'gout']].forEach(([id, key]) => id && (pm[id] || []).forEach(r => {
          const d = new Date(r.start); d.setMinutes(Math.floor(d.getMinutes() / 15) * 15, 0, 0);
          const e = q.get(+d) || { pv: 0, gin: 0, gout: 0 }; e[key] += Math.max(0, r.mean || 0) / 12; q.set(+d, e);
        }));
      } else { pvIds.forEach(id => addQ(id, 'pv')); inIds.forEach(id => addQ(id, 'gin')); outIds.forEach(id => addQ(id, 'gout')); }
      // Lücken (keine Leistungswerte) mit den Stundenwerten der Zähler füllen
      const hq = new Map();
      [[pvIds, 'pv'], [inIds, 'gin'], [outIds, 'gout']].forEach(([l, key]) => l.forEach(id => (sth[id] || []).forEach(r => {
        const e = hq.get(+new Date(r.start)) || { pv: 0, gin: 0, gout: 0 }; e[key] += Math.max(0, r.change || 0); hq.set(+new Date(r.start), e);
      })));
      hq.forEach((e, t) => { for (let i = 0; i < 4; i++) { const k = t + i * 900000; if (!q.has(k) && k < Date.now()) q.set(k, { pv: e.pv / 4, gin: e.gin / 4, gout: e.gout / 4 }); } });
      // Prognose-Summen direkt von Forecast.Solar, falls nicht in der Energie-Konfiguration verknüpft
      const fsens = re => { const x = Object.values(this._hass.states).find(v => re.test(v.entity_id)); const n = x && parseFloat(x.state); return isNaN(n) ? null : n; };
      const fsToday = fsens(/^sensor\.energy_production_today(_\d+)?$/), fsTom = fsens(/^sensor\.energy_production_tomorrow(_\d+)?$/);
      // Prognose (Forecast.Solar o. ä.): Wh je Stunde
      const fch = new Map();
      if (fc) Object.entries(fc).forEach(([eid, v]) => { if (fcEntries.length && !fcEntries.includes(eid)) return; Object.entries((v && v.wh_hours) || {}).forEach(([ts, wh]) => { const d = new Date(ts); d.setMinutes(0, 0, 0); fch.set(+d, (fch.get(+d) || 0) + wh / 1000); }); });
      this._edata = { days, week: [[pv, 'var(--sun)', 'PV-Ertrag'], [gin, 'var(--grid)', 'Netzbezug'], [wb, 'var(--house)', 'Wallbox']], q, fch, hasFc: fch.size > 0, smaToday: smaKwh, fsToday, fsTom };
      this._drawEnergy();
    } catch (e) {
      this._k.hist.innerHTML = '<p class="sub">Verlauf konnte nicht geladen werden.</p>';
    }
  }

  _drawEnergy() {
    const D = this._edata, k = this._k; if (!D) return;
    const tab = this._etab === undefined ? 1 : this._etab;
    this.shadowRoot.querySelectorAll('[data-etab]').forEach(b => b.setAttribute('aria-selected', String(+b.dataset.etab === tab)));
    const leg = a => a.map(([c, n, dash]) => `<span style="--c:${c}"${dash ? ' class="dsh"' : ''}>${n}</span>`).join('');
    if (tab === 3) {
      k.htip.innerHTML = '';
      this._drawHist(D.days, D.week);
      k.hleg.innerHTML = leg(D.week.map(w => [w[1], w[2]]));
      const tot = i => D.week[i][0].reduce((a, b) => a + b, 0);
      k.etot.innerHTML = `<div>Erzeugt in 7 Tagen<b class="num">${de(tot(0), 0)} kWh</b></div><div>Netzbezug<b class="num">${de(tot(1), 0)} kWh</b></div><div>Wallbox<b class="num">${de(tot(2), 0)} kWh</b></div>`;
      return;
    }
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() + tab - 1);
    const pts = [];
    let ePv = 0, eUse = 0, eFc = 0;
    for (let i = 0; i < 96; i++) {
      const t = +day + i * 900000, e = D.q.get(t), hr = new Date(t); hr.setMinutes(0, 0, 0);
      const f = D.fch.has(+hr) ? D.fch.get(+hr) : null;
      const p = e ? { pv: e.pv * 4, use: Math.max(0, e.pv + e.gin - e.gout) * 4 } : null;
      if (p) { ePv += p.pv / 4; eUse += p.use / 4; }
      if (f !== null && i % 4 === 0) eFc += f;
      pts.push({ t, p, f });
    }
    const W = Math.max(320, Math.round(k.hist.clientWidth || 600)), H = 198, l = 30, b = 22, tp = 18;
    const peak = Math.max(1, ...pts.map(x => Math.max(x.p ? Math.max(x.p.pv, x.p.use) : 0, x.f || 0)));
    const step = peak > 8 ? 2 : peak > 4 ? 1 : peak > 2 ? 0.5 : 0.25, max = Math.ceil(peak / step) * step;
    const X = i => l + (W - l - 6) * i / 96, Y = v => tp + (H - tp - b) * (1 - v / max);
    let g = '';
    for (let v = 0; v <= max + 1e-9; v += step) g += `<line x1="${l}" x2="${W}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${l - 5}" y="${Y(v) + 3}" text-anchor="end">${de(v, step < 0.5 ? 2 : step < 1 ? 1 : 0)}</text>`;
    for (let h = 4; h < 24; h += 4) g += `<text x="${X(h * 4)}" y="${H - 5}" text-anchor="middle">${String(h).padStart(2, '0')} Uhr</text>`;
    const area = (key, col, op) => {
      const seg = []; let cur = [];
      pts.forEach((x, i) => { if (x.p) cur.push([X(i), Y(x.p[key])]); else if (cur.length) { seg.push(cur); cur = []; } });
      if (cur.length) seg.push(cur);
      return seg.map(c => `<path d="M${c[0][0]},${Y(0)} L${c.map(p => p.join(',')).join(' L')} L${c[c.length - 1][0]},${Y(0)} Z" fill="${col}" fill-opacity="${op}"/><polyline fill="none" stroke="${col}" stroke-width="1.6" points="${c.map(p => p.join(',')).join(' ')}"/>`).join('');
    };
    g += area('pv', 'var(--sun)', 0.35) + area('use', 'var(--house)', 0.12);
    const fpts = pts.map((x, i) => x.f !== null && i % 4 === 2 ? [X(i), Y(x.f)] : null).filter(Boolean);
    if (fpts.length) g += `<polyline fill="none" stroke="var(--batt)" stroke-width="2" stroke-dasharray="4 4" points="${fpts.map(p => p.join(',')).join(' ')}"/>`;
    g += `<text x="${l - 5}" y="9" text-anchor="end">kW</text>`;
    // angetippter Zeitpunkt: Linie und Werte darunter
    this._eGeo = { W, l, n: 96, tab };
    const si = this._esel && this._esel.tab === tab ? this._esel.i : null;
    if (si !== null) {
      const x = pts[si], hm = new Date(x.t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      g += `<line x1="${X(si)}" x2="${X(si)}" y1="${tp}" y2="${Y(0)}" stroke="var(--fg)" stroke-width="1" stroke-dasharray="2 2"/>`;
      const fv = x.f !== null ? x.f : null;
      k.htip.innerHTML = `<b>${hm} Uhr</b>` + (x.p ? ` · Erzeugung ${de(x.p.pv, 2)} kW · Verbrauch ${de(x.p.use, 2)} kW` : '') + (fv !== null ? ` · Prognose ${de(fv, 2)} kW` : '') + (!x.p && fv === null ? ' · keine Daten' : '');
    } else k.htip.innerHTML = '<span style="color:var(--muted)">Antippen zeigt die Werte zu einer Uhrzeit</span>';
    if (tab === 1) { const n = (Date.now() - +day) / 900000; g += `<line x1="${X(n)}" x2="${X(n)}" y1="${tp}" y2="${Y(0)}" stroke="var(--grid)" stroke-width="1.5"/>`; }
    k.hist.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Erzeugung und Verbrauch">${g}</svg>`;
    k.hleg.innerHTML = leg([...(tab < 2 ? [['var(--sun)', 'Erzeugung'], ['var(--house)', 'Verbrauch']] : []), ['var(--batt)', 'Erwartete Erzeugung', 1]]);
    if (tab === 1 && D.smaToday !== null) ePv = D.smaToday;
    const fsT = tab === 1 ? D.fsToday : tab === 2 ? D.fsTom : null;
    const fcTxt = D.hasFc ? `${de(eFc, 1)} kWh` : fsT !== null ? `${de(fsT, 1)} kWh` : 'nicht eingerichtet';
    k.etot.innerHTML = tab < 2
      ? `<div>Erzeugung<b class="num">${de(ePv, 1)} kWh</b></div><div>Verbrauch<b class="num">${de(eUse, 1)} kWh</b></div><div>Prognose<b class="num">${fcTxt}</b></div>`
      : `<div>Erwartete Erzeugung morgen<b class="num">${fcTxt}</b></div>`;
  }

  _drawHist(days, sets) {
    const W = 1100, H = 150, l = 30, b = 22, t = 8;
    const peak = Math.max(10, ...sets.flatMap(s => s[0]));
    const step = peak > 60 ? 20 : peak > 30 ? 10 : 5;
    const max = Math.ceil(peak / step) * step;
    const cw = (W - l) / days.length, y = v => t + (H - t - b) * (1 - v / max);
    let g = '';
    for (let v = 0; v <= max; v += step) g += `<line x1="${l}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${l - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
    const bw = cw * 0.18;
    days.forEach((d, i) => {
      const x0 = l + i * cw + cw / 2 - (bw * sets.length + 2 * (sets.length - 1)) / 2;
      sets.forEach(([vals, col], j) => { const v = vals[i]; if (v > 0) g += `<rect x="${x0 + j * (bw + 2)}" y="${y(v)}" width="${bw}" height="${y(0) - y(v)}" rx="2" fill="${col}"/>`; });
      g += `<text x="${l + i * cw + cw / 2}" y="${H - 6}" text-anchor="middle">${i === days.length - 1 ? 'heute' : DAYS[d.getDay()]}</text>`;
    });
    this._k.hist.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Erzeugung und Verbrauch der letzten 7 Tage">${g}</svg>`;
  }
}

if (!customElements.get('zuhause-card')) customElements.define('zuhause-card', ZuhauseCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'zuhause-card', name: 'Zuhause', description: 'Startseite mit Energie, Sicherheit, Raumklima, Kameras und Wetter' });
}
