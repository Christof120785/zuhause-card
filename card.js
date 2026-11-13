// Zuhause-Karte: komplette Startseite als eine Karte für Home Assistant.
// Alle Geräte stehen in der Dashboard-Konfiguration (type: custom:zuhause-card), nicht in dieser Datei.
// Leere Einträge sind vorbereitet und zeigen "noch nicht verbunden".
// Räume, Licht, Jalousien, Heizung und Szenen kommen automatisch aus den Bereichen in Home Assistant.
const VERSION = '2.48.0';

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
  wx: ['Wetter', 8, 1], hist: ['Energiebilanz', 12, 2], sec: ['Sicherheit', 4, 1], vac: ['Saugroboter', 4, 1], app: ['Haushaltsgeräte', 4, 1], prn: ['3D-Drucker', 4, 1], stor: ['Speicher', 12, 2]
};

// Blätter (Tabs) unter der Begrüßung: Schlüssel, Name, enthaltene Kacheln (null = alle)
const PG_ICO = {
  start: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  raeume: 'M3 3h8v8H3zm0 10h8v8H3zM13 3h8v8h-8zm0 10h8v8h-8z',
  kameras: 'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z',
  geraete: 'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 6v12h12V8H6zm6 2.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM8 4.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  energie: 'M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z',
  alles: 'M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z'
};
const PAGES = [['start', 'Start', ['energy', 'wx', 'waste']], ['raeume', 'Räume', ['home']], ['kameras', 'Kameras', ['cams', 'sec']],
  ['geraete', 'Haushalt', ['app', 'vac', 'prn']], ['energie', 'Energie', ['hist', 'stor']], ['alles', 'Alles', null]];

// Lampen für das Karussell unter dem Energie-Haus: Name im Dashboard, Suchmuster für den Namen in Home Assistant
const FAV = [['Wohnzimmer klein', /^wohnzimmer klein$/i], ['Wohnzimmer groß', /^wohnzimmer( gro(ß|ss))?$/i], ['Küche', /k(ü|ue|u)che/i],
  ['Flur', /flur/i], ['Esszimmer', /esszimmer/i], ['Carport', /carportlicht( 1)?$/i]];

// Haus-Bild für die Energie-Kachel (liegt im Repo)
const IMG = 'https://raw.githubusercontent.com/Christof120785/zuhause-card/main/img/';
const HAUS = IMG + 'haus-energie2.webp';
// Wallbox-Leistung in W: Mindestleistung (6 A, 3 Phasen) und eingestellte Höchstleistung; WBN_V = Version der Netzanteil-Automation
const WB_MIN = 4200, WB_MAX = 11500, WBN_V = 5;

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
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.9-.7-1.3-.7-2.2 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7.2" r="1.2"/><circle cx="14.5" cy="7.2" r="1.2"/>',
  paletteF: '<path fill="currentColor" stroke="none" d="M12 2.5a9.5 9.5 0 1 0 0 19c1.3 0 1.9-.9 1.9-1.8 0-1-.8-1.4-.8-2.4 0-1.1.9-1.8 2-1.8h2.2a4.2 4.2 0 0 0 4.2-4.2C21.5 6.6 17.3 2.5 12 2.5z"/><circle cx="7.3" cy="11.2" r="1.5" fill="#2a3442" stroke="none"/><circle cx="9.8" cy="7.2" r="1.5" fill="#2a3442" stroke="none"/><circle cx="14.6" cy="7.2" r="1.5" fill="#2a3442" stroke="none"/>',
  timerF: '<circle cx="12" cy="13.5" r="8" fill="currentColor" stroke="none"/><path d="M10 2.5h4M12 2.5v3" /><path d="M12 9.5v4.2l2.6 1.6" stroke="#2a3442"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/>',
  power: '<path d="M12 3v8M6.3 6.8a8 8 0 1 0 11.4 0"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
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
.storg{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;align-items:start}.storg .sc{display:flex;flex-direction:column;gap:12px;min-width:0}.storg .sh{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:2px 2px 0}
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
.sysw{margin-top:12px;border-radius:14px;background:rgba(255,170,60,.14);box-shadow:inset 0 0 0 1px rgba(255,170,60,.35);padding:10px 12px;font-size:13px;max-width:520px}
.sysw b{color:#ffc06b}.sysw ul{margin:6px 0 0;padding-left:18px}.sysw li{margin:3px 0}.sysw li small{opacity:.7}
.sysw.ok{background:rgba(98,196,139,.14);box-shadow:inset 0 0 0 1px rgba(98,196,139,.35)}.sysw.ok b{color:#8fe0b0}
.sysw button{all:unset;cursor:pointer;text-decoration:underline;font-size:12px;opacity:.8;margin-left:6px}
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
.stage{position:relative;border-radius:18px;overflow:hidden;background:linear-gradient(#9faabb,#adb2be);padding:74px 0 104px;margin-bottom:2px}
.hbox{position:relative;max-width:620px;margin:0 auto}.hbox img{display:block;width:100%;height:auto;-webkit-mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent),linear-gradient(transparent,#000 9%,#000 94%,transparent);-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent),linear-gradient(transparent,#000 9%,#000 94%,transparent);mask-composite:intersect}
.hbox img.wp{position:absolute;left:4%;top:80%;width:12%;height:auto;-webkit-mask-image:none;mask-image:none;filter:drop-shadow(0 4px 6px rgba(30,40,60,.35))}
.wpchip{position:absolute;left:2%;top:73%;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:rgba(255,255,255,.92);color:#333;box-shadow:0 1px 4px rgba(30,40,60,.25);white-space:nowrap}.wpchip.on{background:var(--sun);color:#3a2a00}.wpchip.lock{background:#c0392b;color:#fff}
.lab{position:absolute;color:#fff;text-shadow:0 1px 3px rgba(30,40,60,.35);white-space:nowrap}
.lab.up{bottom:calc(100% + 6px)}.lab.dn{top:calc(100% + 6px)}.lab[data-more]{cursor:pointer}
.lab .t{font-size:13px;opacity:.92}.lab .v{font-family:var(--display);font-size:22px;font-weight:700;line-height:1.15}
.lab .v small{font-size:13px;font-weight:600;margin-left:3px}.lab .s{font-size:12.5px;opacity:.95}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:1px;transition:opacity .3s}
.dot.idle{opacity:.35}
/* Lichtimpuls (hellblau mit Schweif), der auf den Kabeln im Bild entlangläuft: Richtung = wohin der Strom fließt (.rev = rückwärts) */
.flow{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.flow path{fill:none;stroke-linecap:round;stroke-linejoin:round;transition:opacity .4s}
.flow .cab{fill:none;stroke:#55595f;stroke-width:3.5;stroke-linejoin:round;stroke-linecap:round}
.flow .p{stroke-width:7;animation:pulse 1.8s linear infinite;animation-delay:var(--d)}
.flow .p.t1{stroke:#3d8bff;opacity:.35;stroke-dasharray:22 78}
.flow .p.t2{stroke:#5aa8ff;opacity:.7;stroke-dasharray:12 88}
.flow .p.t3{stroke:#d9efff;stroke-dasharray:5 95;filter:drop-shadow(0 0 4px #6db7ff)}
.flow .p.rev{animation-direction:reverse;animation-delay:0s}
.flow g{transition:opacity .4s}.flow g.idle{opacity:0}
@keyframes pulse{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
@media(prefers-reduced-motion:reduce){.flow .p{animation:none}}
@media(max-width:520px){.lab .v{font-size:18px}.lab .v small{font-size:12px}}
.fav{position:relative;height:158px;margin:12px 0 0;border-radius:18px;background:linear-gradient(160deg,#2b3b4f,var(--hero));box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);perspective:720px;overflow:hidden;touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:grab}
.fav::before{content:"";position:absolute;left:50%;bottom:8px;width:62%;height:26px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.07),transparent)}
.fi{position:absolute;left:50%;top:26px;width:140px;margin-left:-70px;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11.5px;color:var(--hero-mut);text-align:center;will-change:transform,opacity}
.fav:not(.drag) .fi{transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .45s}
.fi i{width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.1);color:#d6dee6;display:grid;place-items:center;margin:4px 0 7px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 8px 16px rgba(0,0,0,.25);transition:background .25s,color .25s,box-shadow .25s}
.fi i svg{width:24px;height:24px}
.fi b{font-weight:700;font-size:13px;color:var(--hero-fg);line-height:1.2;white-space:nowrap;opacity:var(--lo,1)}
.fi span{font-size:11.5px;opacity:var(--lo,1)}
.fi.on i{background:var(--sun);color:#fff;box-shadow:0 0 0 6px rgba(239,181,68,.22),0 0 26px rgba(239,181,68,.45)}
.fi.na{filter:grayscale(1)}
.fi.arm i{box-shadow:0 0 0 3px rgba(255,255,255,.85),0 0 22px rgba(160,200,255,.5)}
.fi.arm span{display:none}.fi.arm::after{content:attr(data-arm);font-size:11.5px;font-weight:600;color:#fff;opacity:var(--lo,1)}
.hxo{position:fixed;inset:0;z-index:20;background:rgba(6,10,16,.62);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);animation:hxf .2s ease-out}
.hxo[hidden]{display:none}
.hxw{position:absolute;left:50%;top:50%}
.hx{all:unset;box-sizing:border-box;position:absolute;left:0;top:0;width:var(--w);height:var(--h);background:center/100% 100% no-repeat;filter:drop-shadow(0 0 7px rgba(170,200,235,.22)) drop-shadow(0 10px 16px rgba(0,0,0,.45));transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y)));cursor:pointer;animation:hxp .3s cubic-bezier(.2,.9,.3,1.25) both;animation-delay:var(--dl,0s);-webkit-tap-highlight-color:transparent}
.hx>div{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(var(--u) * .03);color:#eef3f7;font-size:calc(var(--u) * .145);font-weight:500;text-align:center;line-height:1.12;padding:0 18%}
.hx .ic{width:calc(var(--u) * .3);height:calc(var(--u) * .3);color:#f4b63f}.hx .ic svg{width:100%;height:100%}
.hx.red .ic{color:#ff5a4a}
.hx.gold{filter:drop-shadow(0 0 10px rgba(239,181,68,.45)) drop-shadow(0 10px 16px rgba(0,0,0,.45))}
.hx.sm>div{font-size:calc(var(--u) * .1);font-weight:600;padding:0 16%;line-height:1.1}
.hx .pct{font-size:calc(var(--u) * .1);opacity:.7}
.hx.ctr>div{font-weight:700;font-size:calc(var(--u) * .115);gap:calc(var(--u) * .06);padding:0 14%}
.hx .bulb{width:calc(var(--u) * .6);height:calc(var(--u) * .6);border-radius:50%;background:rgba(255,255,255,.14);display:grid;place-items:center;flex:none}
.hx .bulb svg{width:50%;height:50%;color:#fff}.hx.lon .bulb{background:#f4b63f;box-shadow:0 0 calc(var(--u) * .2) rgba(244,182,63,.55)}
.hx.dm>div{gap:calc(var(--u) * .07);padding:0 14%}
.hx .dl{font-size:calc(var(--u) * .14)}
.hx .bar{position:relative;width:72%;height:calc(var(--u) * .18);border-radius:99px;background:rgba(255,255,255,.2);overflow:hidden;flex:none}
.hx .bar i{position:absolute;inset:0 auto 0 0;width:var(--p,50%);border-radius:99px;background:linear-gradient(90deg,#f2b13a,#fffaf0)}
.hx .bar input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}
@keyframes hxp{from{opacity:0;transform:translate(-50%,-50%) scale(.3)}}
@keyframes hxf{from{opacity:0}}
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
.wbprio{margin-top:12px}.wbprio-h{display:flex;justify-content:space-between;gap:8px;align-items:baseline;font-size:13px}.wbprio-h span{color:var(--muted);font-size:12px;text-align:right}.wbdays{display:flex;gap:4px;margin:6px 0 4px}.wbdays .seg{flex:1;padding:8px 0;font-size:12.5px}.segs-s{display:block;font-size:11px;font-weight:500;opacity:.8;margin-top:1px}
.wbn{margin-top:10px;padding:12px;border-radius:14px;background:var(--tile)}
.wbn-h{display:flex;justify-content:space-between;align-items:baseline;font-size:13.5px}.wbn-h span{font-weight:700;font-size:18px;color:var(--grid)}
.wbn input{width:100%;margin:10px 0 2px;accent-color:var(--grid)}
.wbn-s{display:flex;justify-content:space-between;font-size:11px;color:var(--muted)}
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
.row.mn{flex-wrap:wrap;gap:2px 10px}.row.mn .txt{flex:1 1 100%}.row.mn .dim{flex:1 1 100%;margin:2px 0 4px}
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
.vac .vh{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.vac .vh b{font-size:19px}.vac .vst{text-align:right;font-size:12px;color:var(--muted)}.vac .vst b{display:block;font-size:15px;color:var(--ok,#6fcf97)}
.vac .vb{display:flex;gap:8px;margin:12px 0 4px}.vac .vb button{all:unset;cursor:pointer;flex:1;text-align:center;border:1px solid var(--line);border-radius:12px;padding:10px 0;font-size:13px;font-weight:600}.vac .vb button.go{background:var(--ok,#4caf7d);color:#fff;border-color:transparent}
.vac .vl{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);font-weight:600;margin:12px 0 5px}.vac .vc{display:flex;flex-wrap:wrap;gap:6px}.vac .vc button{all:unset;cursor:pointer;border:1px solid var(--line);border-radius:99px;padding:4px 12px;font-size:12.5px}.vac .vc button.on{border-color:var(--sun);color:var(--sun)}
.vac .vm{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.vac .vphoto{display:block;width:100%;max-width:210px;height:auto;margin:6px auto 2px;border-radius:16px;background:#fff}.vac .vart{width:100%;max-width:230px;height:auto;margin:6px auto 2px}.vac .vart .rb{transform-origin:112px 78px}.vac .cl .rb{animation:vspin 3s linear infinite}.vac .cl .ld{animation:vspin 1.6s linear infinite;transform-origin:112px 78px}@keyframes vspin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.vac .cl .rb,.vac .cl .ld{animation:none}}
.pg{display:flex;gap:2px;overflow-x:auto;-webkit-mask-image:linear-gradient(90deg,#000 90%,transparent);mask-image:linear-gradient(90deg,#000 90%,transparent);scrollbar-width:none;border-bottom:1px solid var(--line);padding:0 2px}.pg::-webkit-scrollbar{display:none}
.pg button{all:unset;display:inline-flex;align-items:center;gap:7px;cursor:pointer;flex:none;padding:11px 12px;font-size:14px;font-weight:600;color:var(--muted);border-bottom:3px solid transparent;margin-bottom:-1px;white-space:nowrap}
.pg[hidden]{display:none}@media (max-width:600px){.pg button:not([aria-selected="true"]) span{display:none}.pg button{padding:11px 14px}}
.pg button[aria-selected="true"]{color:var(--sun);border-bottom-color:var(--sun)}.pg button:focus-visible{outline:2px solid var(--sun);outline-offset:-2px;border-radius:8px}
.bins .row{gap:12px;padding:8px 0}.bins svg.bin{width:26px;height:32px;flex:none}
.camg{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}
.cam{border-radius:14px;overflow:hidden;background:var(--tile);cursor:pointer}
.cam .view{aspect-ratio:16/9;max-width:100%;position:relative;overflow:hidden;display:grid;place-items:center;background:var(--house-soft);color:var(--muted)}
.cam .view img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
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
  // Dimmen: bei einer Lampengruppe (z. B. nach einer Szene) nur die Lampen ändern, die schon an sind, und zwar relativ,
  // damit die Szene erhalten bleibt und ausgeschaltete Lampen aus bleiben
  _dim(eid, pct) {
    const s = this._s(eid), mem = (s && s.attributes.entity_id || []).map(x => this._s(x)).filter(x => x && x.state === 'on');
    if (s && s.state === 'on' && mem.length && mem.length < (s.attributes.entity_id || []).length) {
      const cur = this._pct(s) || 100;
      this._hass.callService('light', 'turn_on', { entity_id: mem.map(x => x.entity_id), brightness_step_pct: pct - cur });
    } else this._hass.callService('light', 'turn_on', { entity_id: eid, brightness_pct: pct });
  }
  _flow(key, on, rev) {
    const k = this._k; if (!k[key]) return;
    k[key].classList.toggle('idle', !on);
    k[key].querySelectorAll('path').forEach(p => p.classList.toggle('rev', !!rev));
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

    root.innerHTML = `<style>${CSS}</style><div class="wrap"><div class="grid">
      <section class="card hero"><span class="ver">v${VERSION}${window.__zuhauseSrc === 'lokal' ? ' · lokal' : ''}</span>
        <div><h1><span data-k="greet">Hallo</span>,<br><em><span data-k="uname">${c.name}</span>.</em></h1>
          <p>Dein Zuhause. Ein Blick. Alles Wichtige.</p>
          <div class="chips"><span class="chip" data-k="chOpen"></span></div><div class="sysw" data-k="sys" hidden></div></div>
        <div class="hr"><div class="wxn"><div class="t num"><span data-k="wt">–</span><small>°C</small></div><div data-k="wc"></div><div class="num" data-k="wd"></div></div>
          <div data-k="alarm"></div></div>
      </section>
      <nav class="pg wide" role="tablist" aria-label="Blätter" data-k="pages">${PAGES.map(([k, n]) => `<button role="tab" data-page="${k}" aria-label="${n}" title="${n}" aria-selected="false"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${PG_ICO[k]}"/></svg><span>${n}</span></button>`).join('')}</nav>

      <section class="card energy" data-sec="energy">
        <div class="eyebrow"><span>Energie &amp; Wallbox</span><span>● Live</span></div>
        <h2 data-k="eh">Dein Energiefluss</h2><p class="sub"><span data-k="esub"></span> · Autarkie heute <b class="num" data-k="aut">–</b></p>
        <div class="stage"><div class="hbox">
          <img src="${HAUS}" alt="Haus mit Solaranlage, Speicher und Wallbox">
          <svg class="flow" viewBox="0 0 1200 777" preserveAspectRatio="none" aria-hidden="true">
            <path class="cab" d="M458 614L458 585L657 572"/>
            ${[['fpv', 'M846 140L909 226L915 240L916 534L803 551', 'var(--sun)'], ['fbk', 'M215 421L255 437L401 428L404 433L404 512L396 521L396 618', 'var(--sun)'],
              ['fbat', 'M627 708L667 704L669 584L684 566L747 562', 'var(--batt)'], ['fgrid', 'M948 777L768 690L766 600', 'var(--grid)'],
              ['fwb', 'M801 552L935 538', 'var(--grid)'], ['fhouse', 'M772 512L772 412L753 406', '#fff'], ['fmk', 'M458 614L458 585L657 572L684 566L747 562', 'var(--sun)'], ['fwp', 'M396 618L352 664L238 692', 'var(--sun)']].map(([k, d, col]) =>
              `<g data-k="${k}" class="idle">${[['t1', -1.494], ['t2', -1.674], ['t3', 0]].map(([c, dl]) => `<path class="p ${c}" d="${d}" pathLength="100" style="--d:${dl}s"/>`).join('')}</g>`).join('')}
          </svg>
          <img class="wp" data-k="wp" src="${IMG}waermepumpe.webp" alt="Wärmepumpe" hidden>
          <div class="wpchip" data-k="wpchip" hidden></div>
          <div class="lab up" style="left:21%" data-more="${c.pv}"><div class="t"><span class="dot" data-k="dpv" style="background:var(--sun)"></span>Solar</div><div class="v num"><span data-k="vpv">–</span><small data-k="upv">kW</small></div><div class="s">heute <span class="num" data-k="today">–</span></div></div>
          <div class="lab up" style="left:64%"><div class="t"><span class="dot" style="background:#fff"></span>Haus</div><div class="v num"><span data-k="vhouse">–</span><small data-k="uhouse">kW</small></div><div class="s" data-k="shouse"></div></div>
          <div class="lab dn" style="left:3%"><div class="t"><span class="dot" data-k="dbk" style="background:var(--sun)"></span>Marstek</div><div class="v num"><span data-k="vbk">–</span><small data-k="ubk">W</small></div><div class="s" data-k="sbk"></div><div class="s" data-k="sbk3"></div><div class="s" data-k="sbk2"></div></div>
          <div class="lab dn" style="left:47%;transform:translateX(-50%)"><div class="t"><span class="dot" data-k="dbat" style="background:var(--batt)"></span>Speicher</div><div class="v num"><span data-k="vbat">–</span></div><div class="s" data-k="sbat"></div></div>
          <div class="lab dn" style="left:66%" data-more="${c.grid_in}"><div class="t"><span class="dot" data-k="dgrid" style="background:var(--grid)"></span>Netz</div><div class="v num"><span data-k="vgrid">–</span><small data-k="ugrid">kW</small></div><div class="s" data-k="sgrid"></div></div>
        </div></div>
        <div class="fav" data-k="fav"></div><div class="hxo" data-k="favp" lang="de" hidden></div>
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


      <section class="card vac" data-sec="vac">
        <div class="eyebrow"><span>Saugroboter</span><span>Steuerung</span></div>
        <div data-k="vac"></div>
      </section>

      <section class="card app" data-sec="app">
        <div class="eyebrow"><span>Haushaltsgeräte</span><span>Status</span></div>
        <div data-k="app"></div>
      </section>

      <section class="card prn" data-sec="prn">
        <div class="eyebrow"><span>3D-Drucker</span><span>Verbrauch</span></div>
        <div data-k="prn"></div>
      </section>

      <section class="card hist chart" data-sec="hist">
        <div class="eyebrow"><span>Energie</span><span>Bilanz und Prognose</span></div>
        <h2>Erzeugung und Verbrauch</h2>
        <div class="tabs" role="tablist">${['Gestern', 'Heute', 'Morgen', 'Woche'].map((t, i) => `<button role="tab" data-etab="${i}" aria-selected="${i === 1}">${t}</button>`).join('')}</div>
        <div data-k="hist"></div><div class="htip" data-k="htip"></div>
        <div class="legend" data-k="hleg"></div>
        <div class="etot" data-k="etot"></div>
      </section>

      <section class="card stor" data-sec="stor">
        <div class="eyebrow"><span>Speicher</span><span>Anker · Marstek</span></div>
        <div class="storg" data-k="stor"></div>
      </section>
    </div></div>`;

    this._k = {};
    root.querySelectorAll('[data-k]').forEach(e => { this._k[e.dataset.k] = e; });
    // Leiste zum Verschieben und Ausblenden der Kacheln (nur bei Anordnen sichtbar)
    root.querySelectorAll('section[data-sec]').forEach(e => { const b = document.createElement('div'); b.className = 'tbar'; b.hidden = true; e.prepend(b); });
    this._tileSig = null;
    // Während ein Slider bewegt wird, nicht neu zeichnen
    root.addEventListener('pointerdown', e => {
      if (e.target.matches('input[type=range]')) this._busy = Date.now() + 60000;
      // langes Drücken auf PV-Laden öffnet den Netzanteil-Regler
      const pb = e.target.closest('[data-wbmode]');
      clearTimeout(this._wbLp);
      if (pb && /optimiert|optimized/i.test(pb.dataset.wbmode)) {
        const y0 = e.clientY, x0 = e.clientX;
        const mv = ev => { if (Math.abs(ev.clientY - y0) > 8 || Math.abs(ev.clientX - x0) > 8) clearTimeout(this._wbLp); };
        pb.addEventListener('pointermove', mv);
        pb.addEventListener('pointerup', () => { clearTimeout(this._wbLp); pb.removeEventListener('pointermove', mv); }, { once: true });
        this._wbLpUntil = Date.now() + 600;
        this._wbLp = setTimeout(() => { this._wbLong = true; this._wbNOpen = true; if (navigator.vibrate) navigator.vibrate(15); this._renderWbMode(); }, 500);
      }
    });
    root.addEventListener('contextmenu', e => { if (e.target.closest('[data-wbmode]')) e.preventDefault(); });
    root.addEventListener('focusin', e => { if (e.target.matches('input.rn,select,input[data-mottime]')) this._busy = Date.now() + 120000; });
    root.addEventListener('focusout', e => { if (e.target.matches('input.rn,select,input[data-mottime]')) this._busy = 0; });
    root.addEventListener('input', e => {
      const t = e.target;
      if (t.parentNode && t.parentNode.classList && t.parentNode.classList.contains('bar')) t.parentNode.style.setProperty('--p', t.value + '%');
      if (t.dataset.wbn) { this._busy = Date.now() + 60000; const v = this._k.wbmode.querySelector('[data-k2="wbnv"]'); if (v) v.textContent = t.value + ' %'; }
      if (t.dataset.motnum) { this._busy = Date.now() + 60000; const sp = t.closest('.row') && t.closest('.row').querySelector('.txt span'); if (sp) sp.textContent = t.value + (t.dataset.unit ? ' ' + t.dataset.unit : ''); }
      if (t.dataset.dim || t.dataset.pos) {
        this._busy = Date.now() + 60000;
        const s = t.closest('.row') && t.closest('.row').querySelector('.txt span');
        if (s) s.textContent = t.dataset.dim ? `An · ${t.value} %` : this._posTxt(+t.value);
      }
    });
    root.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.dim) this._dim(t.dataset.dim, +t.value);
      if (t.dataset.motnum) { this._busy = 0; this._hass.callService('input_number', 'set_value', { entity_id: t.dataset.motnum, value: +t.value }); }
      if (t.dataset.mottime && t.value) this._hass.callService('input_datetime', 'set_datetime', { entity_id: t.dataset.mottime, time: t.value + ':00' });
      if (t.dataset.wbn) {
        // Netzanteil setzen; > 0 schaltet die eigene Regelung ein, 0 gibt die Wallbox an den Home Manager zurück
        const h = this._hass, n = this._wbN(), v = +t.value;
        this._busy = 0;
        h.callService('input_number', 'set_value', { entity_id: t.dataset.wbn, value: v }).then(() => {
          if (n.bool) h.callService('input_boolean', v > 0 ? 'turn_on' : 'turn_off', { entity_id: n.bool.entity_id });
          const sel = this._wbEnt(['select'], /betriebsart des ladevorgangs|charging mode|operating mode of charge/i);
          const pv = sel && (sel.attributes.options || []).find(o => /optimiert|optimized/i.test(o));
          if (sel && pv) {
            if (v === 0 && n.bool && n.bool.state === 'on' && sel.state !== pv) h.callService('select', 'select_option', { entity_id: sel.entity_id, option: pv });
            if (v > 0 && sel.state !== pv && !(n.bool && n.bool.state === 'on')) h.callService('select', 'select_option', { entity_id: sel.entity_id, option: pv });
          }
        });
      }
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
      if (t.dataset.boostmin) { const v = Math.max(1, Math.min(240, +t.value || 120)); this._lay.boost_min = v; this._save(); }
      if (t.dataset.dim || t.dataset.pos) this._busy = Date.now() + 1500;
    });
    root.addEventListener('click', e => {
      if (e.target.closest('input,select')) return;
      if (this._roomClick(e)) return;
      const ch = e.target.closest('[data-chide]');
      if (ch && this._lay) { const id = ch.dataset.chide, l = this._lay.hc = this._lay.hc || []; const i = l.indexOf(id); if (i < 0) l.push(id); else l.splice(i, 1); this._save(); this._update(); return; }
      const ho = e.target.closest('.hxo');
      if (ho) {
        const hb = e.target.closest('[data-hx]'), a = hb && hb.dataset.hx, id = this._favOpen;
        if (!hb || a === 'more') { this._favOpen = null; this._favSub = ''; this._renderFavP(); if (!hb) return; }
        else if (a === 'tg') { this._hass.callService(id.split('.')[0], 'toggle', { entity_id: id }); return; }
        else if (a === 'col' || a === 'sc') { this._favSub = a; this._renderFavP(); return; }
        else if (a === 'back') { this._favSub = ''; this._renderFavP(); return; }
        else if (a === 'tmr') { this._hass.callService('light', 'turn_off', { entity_id: id, transition: 60 * (+hb.dataset.min || 30) }); this._favOpen = null; this._renderFavP(); return; }
        else if (a === 'none') return;
      }
      const sf = e.target.closest('[data-sysfix]');
      if (sf) { this._sysFix(...sf.dataset.sysfix.split('|')); return; }
      if (e.target.closest('[data-syshide]')) { this._sysHide = [...this._sys.bad, ...this._sys.hint].join('|'); this._renderSys(); return; }
      const wp = e.target.closest('[data-wbprio]');
      if (wp) { this._hass.callService('input_boolean', wp.dataset.wbprio === 'auto' ? 'turn_on' : 'turn_off', { entity_id: 'input_boolean.zuhause_solar_prioritaet_auto' }); return; }
      const ab = e.target.closest('[data-appbtn]'); if (ab) { this._hass.callService('button', 'press', { entity_id: ab.dataset.appbtn }); return; }
      const wz = e.target.closest('[data-wbz]');
      if (wz) { this._hass.callService('input_boolean', 'toggle', { entity_id: 'input_boolean.zuhause_wallbox_zeit_' + (wz.dataset.wbz === 'ende' ? 'ende_aktiv' : 'aktiv') }); return; }
      const wt = e.target.closest('[data-wbtag]');
      if (wt) { const st = this._hass.states['input_text.zuhause_wallbox_zeit_tage']; const cur = new Set(String(st ? st.state : '0123456').split('').filter(c => /[0-6]/.test(c))); const d = wt.dataset.wbtag; cur.has(d) ? cur.delete(d) : cur.add(d); if (cur.size) this._hass.callService('input_text', 'set_value', { entity_id: 'input_text.zuhause_wallbox_zeit_tage', value: [...cur].sort().join('') }); return; }
      const mmb = e.target.closest('[data-mmode]');
      if (mmb) { Object.values(this._hass.states).filter(x => x.entity_id.startsWith('select.') && /marstek/i.test(x.entity_id) && /charging_mode/i.test(x.entity_id)).forEach(x => { const o = (x.attributes.options || []).find(t => mmb.dataset.mmode === 'full' ? /fully|erst/i.test(t) : /simult/i.test(t)); if (o) this._hass.callService('select', 'select_option', { entity_id: x.entity_id, option: o }); }); return; }
      if (e.target.closest('[data-wphp]')) { const l = this._hass.states['light.waermepumpe_pv']; this._hass.callService('light', l && l.state === 'on' ? 'turn_off' : 'turn_on', { entity_id: 'light.waermepumpe_pv' }); return; }
      if (e.target.closest('[data-wplock]')) { const l = this._hass.states['input_boolean.warmepumpe_pv_gesperrt']; this._hass.callService('input_boolean', l && l.state === 'on' ? 'turn_off' : 'turn_on', { entity_id: 'input_boolean.warmepumpe_pv_gesperrt' }); return; }
      if (e.target.closest('[data-wbsperre]')) { this._hass.callService('input_boolean', 'toggle', { entity_id: 'input_boolean.zuhause_anker_entladen_sperren' }); return; }
      if (e.target.closest('[data-wbakku]')) { this._hass.callService('input_boolean', 'toggle', { entity_id: 'input_boolean.zuhause_wallbox_akku_erlaubt' }); return; }
      if (e.target.closest('[data-wbnclose]')) { this._wbNOpen = false; this._renderWbMode(); return; }
      if (e.target.closest('[data-wbgear]')) { this._wbNOpen = !this._wbNOpen; this._renderWbMode(); return; }
      const wm = e.target.closest('[data-wbmode]');
      if (wm && !wm.disabled) {
        if (this._wbLong) { this._wbLong = false; return; }
        const [eid, opt] = wm.dataset.wbmode.split('|');
        const zt = this._hass.states['input_boolean.zuhause_wallbox_zeit_aktiv'], zv = this._hass.states['input_datetime.zuhause_wallbox_zeit_von'];
        if (zt && zt.state === 'on' && !/optimiert|optimized/i.test(opt) && !confirm('Die Zeitschaltung ist an' + (zv ? ' und lädt ab ' + String(zv.state).slice(0, 5) : '') + '. „Sofort“ lädt jetzt gleich. Willst du das?\n\nSonst auf PV-Laden lassen, dann wartet die Wallbox bis zur Startzeit.')) return;
        this._setWbMode(eid, opt); return;
      }
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
    root.addEventListener('click', e => {
      const pb = e.target.closest('[data-page]'); if (pb) { this._setPage(pb.dataset.page); return; }
      const b = e.target.closest('[data-vac],[data-vsel],[data-vfan],[data-vbtn]'); if (!b) return;
      const h = this._hass, d = b.dataset;
      if (d.vac) { const [act, id] = d.vac.split('|'); h.callService('vacuum', act, { entity_id: id }); }
      if (d.vsel) { const [id, ...o] = d.vsel.split('|'); h.callService('select', 'select_option', { entity_id: id, option: o.join('|') }); }
      if (d.vbtn) { if (!confirm('Zähler wirklich zurücksetzen? Nur nach dem Wechsel von ' + b.textContent + ' tun.')) return; h.callService('button', 'press', { entity_id: d.vbtn }); }
      if (d.vfan) { const [id, ...o] = d.vfan.split('|'); h.callService('vacuum', 'set_fan_speed', { entity_id: id, fan_speed: o.join('|') }); }
      setTimeout(() => this._renderVac(), 600);
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
    const list = this._cfg.cameras.map(m => {
      let id = m.entity && st[m.entity] ? m.entity : null;
      if (!id) {
        const f = this._key(m);
        const ids = f ? all.filter(x => x.includes(f)) : [];
        id = ids.find(x => !/clear|klar|snapshot/.test(x)) || ids[0] || null;
      }
      return Object.assign({}, m, { id });
    }).filter(m => m.id && this._stream(m.id));
    // weitere Kameras mit Livebild (z. B. neu hinzugekommene Reolink) automatisch dazunehmen, je Gerät nur eine
    const ent = this._hass.entities || {}, used = new Set(), seen = new Set(list.map(m => m.id));
    list.forEach(m => { const d = ent[m.id] && ent[m.id].device_id; if (d) used.add(d); });
    all.filter(id => !seen.has(id) && !/clear|klar|snapshot/.test(id) && this._stream(id)).forEach(id => {
      const d = ent[id] && ent[id].device_id;
      if (d ? used.has(d) : false) return;
      if (d) used.add(d);
      const fn = (st[id].attributes.friendly_name || id).replace(/\s*(fluent|flüssig|balanced|ausgewogen|clear|klar|sub|main|haupt|standard|hochaufl|niedrigaufl|aufl)\w*\s*$/i, '').trim();
      list.push({ name: fn, brand: 'Kamera', id });
    });
    return list;
  }

  // ---------- Anordnung (gespeichert in Home Assistant, pro Benutzer) ----------
  async _loadLayout() {
    this._lay = { order: [], hidden: [], merge: {}, names: {}, dev: {}, boost: {}, boost_min: 120 };
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
    // ab v2.26.0 dauert ein Boost standardmäßig 2 Stunden
    if (!this._lay.boost2h) { this._lay.boost2h = true; if (this._lay.boost_min < 120) this._lay.boost_min = 120; this._save(); }
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
      // "Flur unten" ist ein eigenes Stockwerk, kein Teil von "Flur"
      if (/(unten|oben|keller|dg|og|eg)$/.test(n)) return '';
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
    const bis = this._boostBis(), run = list.filter(x => this._boosting(x) || bis[x.entity_id] > Date.now() / 1000);
    if (!run.length) return null;
    const ends = run.map(x => bis[x.entity_id]).filter(Boolean);
    if (ends.length) { const left = Math.ceil((Math.max(...ends) - Date.now() / 1000) / 60); return left > 0 ? (left > 90 ? `noch ${Math.floor(left / 60)} h${left % 60 ? ` ${left % 60} min` : ''}` : `noch ${left} min`) : 'läuft'; }
    const lay = this._lay || { boost: {}, boost_min: 120 };
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
  // Homematic beendet den Boost nach seiner eigenen kurzen Dauer. Damit er so lange läuft wie eingestellt,
  // steht das Ende in input_text.zuhause_boost_bis ("Ende:Index,Index|…") und eine Automation schaltet ihn bis dahin wieder ein
  _boostIds() { return Object.values(this._hass.states).filter(s => s.entity_id.startsWith('climate.') && this._canBoost(s)).map(s => s.entity_id).sort(); }
  _boostBis() {
    const s = this._s('input_text.zuhause_boost_bis'), ids = this._boostIds(), m = {};
    if (!s) return m;
    String(s.state).split('|').forEach(g => { const [t, l] = g.split(':'); if (l) l.split(',').forEach(i => { if (ids[+i]) m[ids[+i]] = +t; }); });
    return m;
  }
  _boostWrite(m) {
    const ids = this._boostIds(), now = Date.now() / 1000, g = {};
    Object.entries(m).forEach(([e, t]) => { const i = ids.indexOf(e); if (i >= 0 && t > now) (g[t] = g[t] || []).push(i); });
    const v = Object.entries(g).map(([t, l]) => t + ':' + l.join(',')).join('|').slice(0, 255);
    this._hass.callService('input_text', 'set_value', { entity_id: 'input_text.zuhause_boost_bis', value: v });
  }
  _startBoost(ids, more) {
    ids.forEach(id => { this._lay.boost[id] = Date.now(); });
    this._save();
    this._hass.callService('climate', 'set_preset_mode', { entity_id: ids, preset_mode: 'boost' });
    if (!this._s('input_text.zuhause_boost_bis')) return;
    // erster Druck: eingestellte Dauer (Standard 2 h); "Verlängern": 1 Stunde dazu, höchstens 6 Stunden ab jetzt
    const m = this._boostBis(), now = Math.floor(Date.now() / 1000), cur = Math.max(now, ...ids.map(id => m[id] || 0));
    const end = more ? Math.min(cur + 3600, now + 6 * 3600) : now + (this._lay.boost_min || 120) * 60;
    ids.forEach(id => { m[id] = end; });
    this._boostWrite(m);
  }
  _stopBoost(ids) {
    const m = this._boostBis(); ids.forEach(id => delete m[id]);
    if (this._s('input_text.zuhause_boost_bis')) this._boostWrite(m);
    this._hass.callService('climate', 'set_preset_mode', { entity_id: ids, preset_mode: 'none' });
  }
  // ---------- Bewegung schaltet Steckdosen eines Raums ----------
  // Einstellwerte zur Bewegung eines Raums (Helfer legt der Claude in Home Assistant an: input_*.bewegung_<raum>_...)
  _motSlug(r) { return String(r.name || r.id).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
  _motSet(r) {
    const st = this._hass.states, k = this._motSlug(r), g = (d, n) => st[`${d}.bewegung_${k}_${n}`] || null;
    const ms = { akt: g('input_boolean', 'aktiv'), nach: g('input_number', 'nachlauf'), dunk: g('input_boolean', 'nur_dunkel'), lux: g('input_number', 'dunkel_lux'), hell: g('input_number', 'helligkeit'), von: g('input_datetime', 'von'), bis: g('input_datetime', 'bis') };
    return Object.values(ms).some(Boolean) ? ms : null;
  }
  _motPanel(ms, sensor) {
    const num = (s, lbl) => { if (!s) return ''; const a = s.attributes, u = a.unit_of_measurement ? ' ' + a.unit_of_measurement : '', v = +s.state;
      return `<div class="row mn"><div class="txt"><b>${lbl}</b><span>${isNaN(v) ? '–' : v + u}</span></div><input type="range" class="dim" min="${a.min}" max="${a.max}" step="${a.step || 1}" value="${isNaN(v) ? a.min : v}" data-motnum="${s.entity_id}" data-unit="${a.unit_of_measurement || ''}" aria-label="${lbl}"></div>`; };
    const tgl = (s, lbl) => s ? `<div class="row"><div class="txt"><b>${lbl}</b><span>${s.state === 'on' ? 'An' : 'Aus'}</span></div><button class="tg" role="switch" aria-label="${lbl}" aria-checked="${s.state === 'on'}" data-motbool="${s.entity_id}"></button></div>` : '';
    const tm = (s, lbl) => { if (!s) return ''; const t = /^\d{1,2}:\d{2}/.test(String(s.state)) ? String(s.state).slice(0, 5).padStart(5, '0') : '';
      return `<div class="row"><div class="txt"><b>${lbl}</b><span>${t || 'nicht gesetzt'}</span></div><input type="time" value="${t}" data-mottime="${s.entity_id}" aria-label="${lbl}" style="background:var(--line);color:var(--ink,inherit);color-scheme:light dark;border:0;border-radius:8px;padding:6px 10px;min-width:96px;font:inherit;font-size:14px"></div>`; };
    // Helligkeit und Batterie des Melders (gleiches Gerät wie der Bewegungssensor)
    const E = this._hass.entities || {}, dev = E[sensor.entity_id] && E[sensor.entity_id].device_id;
    const sib = dev ? Object.values(this._hass.states).filter(x => E[x.entity_id] && E[x.entity_id].device_id === dev) : [];
    const lx = sib.find(x => x.attributes.device_class === 'illuminance') || sib.find(x => x.entity_id.startsWith('sensor.') && /lichtst|helligkeit|illuminance/i.test(x.entity_id)), bt = sib.find(x => x.attributes.device_class === 'battery');
    const dk = sib.find(x => x.entity_id.startsWith('binary_sensor.') && x.attributes.device_class === 'light');
    let info = '';
    if (lx || dk) info += `<div class="row"><div class="txt"><b>${lx && lx.attributes.unit_of_measurement ? 'Helligkeit jetzt' : 'Lichtstufe jetzt'}</b><span>${lx && !isNaN(+lx.state) ? (lx.attributes.unit_of_measurement ? Math.round(+lx.state) + ' ' + lx.attributes.unit_of_measurement : Math.round(+lx.state) + ' (0 dunkel, 2 hell)') : ''}${dk ? (lx ? ' · ' : '') + (dk.state === 'on' ? 'hell' : 'dunkel') : ''}</span></div></div>`;
    if (bt && !isNaN(+bt.state)) info += `<div class="row"><div class="txt"><b>Batterie des Melders</b><span>${Math.round(+bt.state)} %</span></div></div>`;
    return tgl(ms.akt, 'Lampe schaltet bei Bewegung') + num(ms.hell, 'Helligkeit beim Einschalten') + num(ms.nach, 'Bleibt an nach Bewegung') + tgl(ms.dunk, 'Nur wenn es dunkel ist') + num(ms.lux, ms.lux && ms.lux.attributes.unit_of_measurement ? 'Dunkel unter' : 'Dunkel unter Lichtstufe (0, 1, 2)') + tm(ms.von, 'Aktiv von') + tm(ms.bis, 'Aktiv bis') + info;
  }
  _bewSlug(id) { return 'zuhause_bew_' + String(id).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
  _bewAuto(id) { const k = this._bewSlug(id); return Object.values(this._hass.states).find(x => x.entity_id.startsWith('automation.') && x.attributes.id === k) || null; }
  async _bewToggle(r) {
    const h = this._hass, au = this._bewAuto(r.id);
    try {
      if (au) { await h.callService('automation', 'toggle', { entity_id: au.entity_id }); return; }
      const mot = Object.values(h.states).filter(x => /^binary_sensor\./.test(x.entity_id) && /occupancy|motion|presence/.test(x.attributes.device_class || '') && this._areaOf(x.entity_id) === r.id).map(x => x.entity_id);
      const sw = r.sw.map(x => x.entity_id);
      if (!mot.length || !sw.length) return;
      const id = this._bewSlug(r.id), q = l => l.map(e => `'${e}'`).join(', ');
      await h.callApi('POST', 'config/automation/config/' + id, {
        id, alias: `Zuhause: Bewegungslicht ${r.name}`, mode: 'restart',
        description: 'Angelegt vom Zuhause-Dashboard. Schaltet die Steckdosen des Raums bei Bewegung ein und 3 Minuten nach der letzten Bewegung wieder aus.',
        triggers: [{ trigger: 'state', entity_id: mot, to: 'on' }],
        conditions: [],
        actions: [
          { action: 'homeassistant.turn_on', target: { entity_id: sw } },
          { wait_template: `{{ [${q(mot)}] | select('is_state', 'on') | list | count == 0 }}` },
          { delay: { minutes: 3 } },
          { action: 'homeassistant.turn_off', target: { entity_id: sw } },
        ],
      });
      await h.callService('automation', 'reload', {});
    } catch (e) { this._sysMsg = 'Bewegungslicht hat nicht geklappt: ' + ((e && e.message) || e); }
    this._roomSig = null; this._renderRooms(); setTimeout(() => { this._roomSig = null; this._renderRooms(); }, 1500);
  }
  async _boostSetup() {
    const h = this._hass, L = this._lay;
    if (this._boostT || !L || !(h.user && h.user.is_admin)) return;
    const ids = this._boostIds(), key = ids.join();
    if (!ids.length || (h.states['input_text.zuhause_boost_bis'] && L.boostIds === key)) return;
    this._boostT = true;
    try {
      if (!h.states['input_text.zuhause_boost_bis']) await h.callWS({ type: 'input_text/create', name: 'Zuhause Boost bis', max: 255, icon: 'mdi:radiator' });
      const pick = (cmp, want) => `{% set ns = namespace(l=[]) %}{% for g in raw.split('|') if ':' in g %}{% if g.split(':')[0] | int(0) ${cmp} now().timestamp() %}{% for i in g.split(':')[1].split(',') if 0 <= i | int(-1) < ids | length %}{% set e = ids[i | int] %}{% if (state_attr(e, 'preset_mode') == 'boost') == ${want} %}{% set ns.l = ns.l + [e] %}{% endif %}{% endfor %}{% endif %}{% endfor %}{{ ns.l }}`;
      await h.callApi('POST', 'config/automation/config/zuhause_boost_halten', {
        id: 'zuhause_boost_halten', alias: 'Zuhause: Boost halten', mode: 'single',
        description: 'Angelegt vom Zuhause-Dashboard. Hält den Heizungs-Boost bis zur Endzeit in "Zuhause Boost bis" aktiv und beendet ihn danach.',
        triggers: [{ trigger: 'time_pattern', minutes: '/1' }, { trigger: 'state', entity_id: 'input_text.zuhause_boost_bis' }],
        variables: {
          ids, raw: "{{ states('input_text.zuhause_boost_bis') }}",
          an: pick('>', 'false'), aus: pick('<=', 'true'),
          rest: "{% set ns = namespace(l=[]) %}{% for g in raw.split('|') if ':' in g and g.split(':')[0] | int(0) > now().timestamp() %}{% set ns.l = ns.l + [g] %}{% endfor %}{{ ns.l | join('|') }}",
        },
        actions: [
          { if: [{ condition: 'template', value_template: '{{ an | length > 0 }}' }], then: [{ action: 'climate.set_preset_mode', target: { entity_id: '{{ an }}' }, data: { preset_mode: 'boost' } }] },
          { if: [{ condition: 'template', value_template: '{{ aus | length > 0 }}' }], then: [{ action: 'climate.set_preset_mode', target: { entity_id: '{{ aus }}' }, data: { preset_mode: 'none' } }] },
          { if: [{ condition: 'template', value_template: "{{ raw not in ['unknown', 'unavailable'] and rest != raw }}" }],
            then: [{ action: 'input_text.set_value', target: { entity_id: 'input_text.zuhause_boost_bis' }, data: { value: '{{ rest }}' } }] },
        ],
      });
      L.boostIds = key; this._save();
    } catch (e) { console.warn('zuhause-card: Boost-Automation', e); this._boostT = false; }
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
    this._renderFavP();
    el.querySelectorAll('.fi').forEach(b => {
      const s = f[+b.dataset.fi % f.length].s, on = !!s && s.state === 'on', na = !s || s.state === 'unavailable';
      b.classList.toggle('on', on); b.classList.toggle('na', na);
      b.querySelector('span').textContent = !s ? 'nicht gefunden' : na ? 'nicht erreichbar' : on ? 'an' : 'aus';
    });
  }
  // Bedienfeld nach langem Drücken: an/aus, dimmen, Farben, Szenen (Hue-Szenen der Gruppe)
  // Waben-Ansicht nach langem Drücken: Lampe in der Mitte, drumherum Dimmen, Farbe, Szenen, Timer, An/Aus, Mehr
  _renderFavP() {
    const P = this._k.favp; if (!P) return;
    const s = this._favOpen && this._s(this._favOpen);
    if (!s) { P.hidden = true; this._favPSig = null; return; }
    P.hidden = false;
    const on = s.state === 'on', pct = this._pct(s), name = this._favOpenName || s.attributes.friendly_name, sub = this._favSub || '';
    const sig = [s.entity_id, on, sub, s.attributes.color_mode, JSON.stringify(s.attributes.hs_color || '')].join('|');
    if (sig === this._favPSig) { const sp = P.querySelector('[data-k2="pct"]'); if (sp) sp.textContent = on ? `${pct ?? 100} %` : 'aus'; return; }
    this._favPSig = sig;
    const isL = s.entity_id.startsWith('light.'), modes = s.attributes.supported_color_modes || [];
    const dimm = isL && modes.some(m => m !== 'onoff'), col = isL && modes.some(m => /^(hs|xy|rgb|rgbw|rgbww)$/.test(m));
    const fn = (s.attributes.friendly_name || '').trim().toLowerCase();
    const sc = Object.values(this._hass.states).filter(x => x.entity_id.startsWith('scene.') && (x.attributes.group_name || '').trim().toLowerCase() === fn)
      .sort((a, b) => (a.attributes.name || '').localeCompare(b.attributes.name || ''));
    // Waben sind Bilder im Glas-Look (img/wabe*.webp), Text und Symbole liegen darüber
    const hx = (x, y, w, h, body, attr = '', cls = '', i = 0) => {
      const im = /gold/.test(cls) ? 'wabe-gold' : w / h > 1.6 ? 'wabe-breit' : 'wabe';
      return `<button class="hx ${cls}" style="--x:${x.toFixed(1)}px;--y:${y.toFixed(1)}px;--w:${w.toFixed(1)}px;--h:${h.toFixed(1)}px;--dl:${(i * 0.035).toFixed(3)}s;background-image:url(${IMG}${im}.webp)" ${attr}><div>${body}</div></button>`;
    };
    const ic = k => `<span class="ic">${svg(k)}</span>`;
    const vw = this.getBoundingClientRect().width || 390;
    let html = '';
    if (!sub) {
      // Maße aus Christofs Vorlage, in Einheiten der Wabenbreite u (Farbe-Wabe = 1): [x, y, Breite, Höhe] relativ zur Lampe
      const u = Math.min(118, Math.floor((vw - 20) / 4.1)), ox = sc.length ? -0.505 * u : 0;
      const at = (x, y, w, h, body, attr, cls, i) => hx(ox + x * u, y * u, w * u, h * u, body, attr, cls, i);
      this._k.favp.style.setProperty('--u', u + 'px');
      html += at(0, 0, 1.29, 1.08, `<span class="bulb">${svg('bulb')}</span><span class="nm">${name}</span>`, 'data-hx="tg"', 'ctr' + (on ? ' lon' : ''), 0);
      html += at(0, -1.035, 1.57, 0.88, dimm ? `<span class="dl">Dimmen</span><span class="bar" style="--p:${on ? pct || 100 : 0}%"><i></i><input type="range" min="1" max="100" value="${on ? pct || 100 : 50}" data-dim="${s.entity_id}" aria-label="${name} dimmen"></span>` : `<span class="dl">${on ? 'An' : 'Aus'}</span>`, 'data-hx="none"', 'dm', 1);
      if (col) html += at(-1.005, -0.424, 1, 0.874, `${ic('paletteF')}Farbe`, 'data-hx="col"', '', 2);
      if (sc.length) html += at(1.005, -0.424, 1, 0.874, 'Szenen', 'data-hx="sc"', 'gold', 3);
      if (isL) html += at(-0.97, 0.56, 1.09, 0.92, `${ic('timerF')}Timer<span class="pct">30 min</span>`, 'data-hx="tmr" data-min="30"', '', 4);
      html += at(0.97, 0.56, 1.09, 0.92, `${ic('power')}Power`, 'data-hx="tg"', 'red', 5);
      if (isL) html += at(0, 1.056, 1.09, 0.92, `${ic('timer')}Timer<span class="pct">60 min</span>`, 'data-hx="tmr" data-min="60"', '', 6);
      // die ersten drei Szenen als kleine Waben rechts neben "Szenen"
      [[1.78, -0.63, 0.61, 0.54], [2.22, -0.25, 0.61, 0.54], [1.67, 0.056, 0.71, 0.62]].forEach(([x, y, w, h], i) => {
        const z = sc[i]; if (z) html += at(x, y, w, h, this._shy(z.attributes.name || z.attributes.friendly_name), `data-scene="${z.entity_id}" data-hx="pick"`, 'sm', 7 + i);
      });
    } else {
      const w = Math.min(90, Math.floor(vw / 4.6)), h = w * 0.895;
      this._k.favp.style.setProperty('--u', (w / 0.75).toFixed(0) + 'px');
      const g = []; for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) { if (Math.abs(q + r) > 2 || (!q && !r)) continue; g.push([(w * 0.79 + 5) * q, (h + 5) * (r + q / 2)]); }
      g.sort((a, b) => Math.hypot(...a) - Math.hypot(...b) || Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
      html += hx(0, 0, w, h, `${ic('back')}Zurück`, 'data-hx="back"', 'sm gold');
      const items = sub === 'col'
        ? LCOL.map((c, i) => [`<span class="bulb" style="--b:30px;background:hsl(${c[1]},95%,52%)"></span>${c[0]}`, `data-lcol="${s.entity_id}|${i}"`]).concat([[`<span class="bulb" style="--b:30px;background:#fff1dc"></span>Weiß`, `data-lcol="${s.entity_id}|w"`]])
        : sc.map(x => [this._shy(x.attributes.name || x.attributes.friendly_name), `data-scene="${x.entity_id}"`]);
      items.slice(0, g.length).forEach(([b, a], i) => { html += hx(g[i][0], g[i][1], w, h, b, a + ' data-hx="pick"', 'sm', i + 1); });
    }
    P.innerHTML = `<div class="hxw">${html}</div>`;
  }
  // lange Wörter in kleinen Waben mit Trennstrich umbrechen lassen
  _shy(s) {
    const V = /[aeiouäöüy]/i;
    return s.split(' ').map(w => {
      if (w.length <= 8) return w;
      // Doppelbuchstaben (Entspan-nen) oder Vokal-Konsonant|Konsonant-Vokal (Kon-zentrieren), möglichst nah an der Mitte
      let best = -1;
      for (let i = 3; i <= w.length - 3; i++) {
        const ok = (w[i - 1].toLowerCase() === w[i].toLowerCase() && !V.test(w[i])) || (!V.test(w[i - 1]) && !V.test(w[i]) && V.test(w[i + 1]) && V.test(w[i - 2]));
        if (ok && (best < 0 || Math.abs(i - w.length / 2) < Math.abs(best - w.length / 2))) best = i;
      }
      if (best < 0) best = Math.ceil(w.length / 2);
      return w.slice(0, best) + '\u00AD' + w.slice(best);
    }).join(' ');
  }
  // Lampen stehen auf einem Ring; vorne groß, nach hinten kleiner und blasser
  _favLay() {
    const el = this._k.fav, it = [...el.children], n = it.length; if (!n) return;
    const R = this._favR(), st = 2 * Math.PI / n;
    it.forEach((b, i) => {
      let a = (i - this._favPos) * st; a = Math.atan2(Math.sin(a), Math.cos(a));
      const z = Math.cos(a);
      b.style.transform = `translateX(${Math.sin(a) * R}px) translateY(${(z - 1) * 10}px) translateZ(${(z - 1) * R * 0.8 + 24}px) rotateY(${a * 180 / Math.PI * 0.45}deg) scale(${(0.58 + 0.8 * Math.pow(z, 8)).toFixed(3)})`;
      b.style.opacity = z < 0.2 ? 0 : 0.25 + 0.75 * z * z;
      b.style.setProperty('--lo', Math.max(0, 1 - Math.abs(a) / (st * 0.6)).toFixed(2)); // Name nur bei der vorderen Lampe
      b.style.zIndex = Math.round(z * 100) + 100;
      b.style.pointerEvents = z < 0 ? 'none' : '';
    });
  }
  _favR() { return Math.min(300, Math.max(140, this._k.fav.clientWidth * 0.46)); }
  _favDrag(el) {
    let x0 = null, y0 = 0, p0 = 0, moved = false, lx = 0, lt = 0, v = 0, arm = null, armT = null;
    // Schalten nur mit zweitem Tippen, damit beim Scrollen der Seite nichts aus Versehen angeht
    const disarm = () => { clearTimeout(armT); if (arm) arm.classList.remove('arm'); arm = null; };
    const per = () => this._favR() * Math.sin(2 * Math.PI / el.children.length);
    let lp = null, long = false;
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('pointerdown', e => {
      x0 = lx = e.clientX; y0 = e.clientY; lt = e.timeStamp; p0 = this._favPos; moved = false; v = 0; long = false;
      const b = e.target.closest && e.target.closest('.fi');
      clearTimeout(lp);
      if (b) lp = setTimeout(() => {
        if (moved || x0 === null) return;
        const fs = this._favs(), x = fs[+b.dataset.fi % fs.length];
        if (!x.s) return;
        long = true; this._favOpen = x.s.entity_id; this._favOpenName = x.name; this._favSub = ''; this._favPSig = null;
        const i = [...el.children].indexOf(b), n = el.children.length; this._favPos = Math.round(this._favPos + (((i - this._favPos) % n + n + n / 2) % n - n / 2));
        this._favLay(); this._renderFavP();
        if (navigator.vibrate) navigator.vibrate(15);
      }, 500);
    });
    el.addEventListener('pointermove', e => {
      if (x0 === null) return;
      if (!moved && Math.abs(e.clientY - y0) > 8) { clearTimeout(lp); x0 = null; return; }
      if (!moved && Math.abs(e.clientX - x0) > 6) { moved = true; clearTimeout(lp); el.classList.add('drag'); try { el.setPointerCapture(e.pointerId); } catch (_) {} }
      if (!moved) return;
      const dt = Math.max(1, e.timeStamp - lt); v = (e.clientX - lx) / dt; lx = e.clientX; lt = e.timeStamp;
      this._favPos = p0 - (e.clientX - x0) / per(); this._favLay();
    });
    const end = e => {
      clearTimeout(lp);
      if (x0 === null) return;
      el.classList.remove('drag');
      if (long) { x0 = null; return; }
      if (Math.abs(e.clientY - y0) > 8 || e.timeStamp - lt > 450 && !moved) { x0 = null; this._favLay(); return; }
      if (moved) {
        disarm();
        this._favPos = Math.round(this._favPos - Math.max(-2, Math.min(2, v * 0.35)));
      } else {
        const b = e.target.closest && e.target.closest('.fi');
        if (b) {
          const i = [...el.children].indexOf(b), n = el.children.length, d = ((i - this._favPos) % n + n + n / 2) % n - n / 2;
          if (Math.abs(d) < 0.5) {
            const fs = this._favs(), s = fs[i % fs.length].s;
            if (s && s.state !== 'unavailable') {
              if (arm === b) { disarm(); this._hass.callService(s.entity_id.split('.')[0], 'toggle', { entity_id: s.entity_id }); }
              else { disarm(); arm = b; b.dataset.arm = s.state === 'on' ? 'Nochmal tippen: aus' : 'Nochmal tippen: an'; b.classList.add('arm'); armT = setTimeout(disarm, 3000); }
            }
          } else { disarm(); this._favPos = Math.round(this._favPos + d); }
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
  _page() {
    // fest eingestellte Seite (Dashboard-Reiter oben in Home Assistant): page: raeume, kameras, vac, energie, start oder alles
    let fp = this._cfg && this._cfg.page; if (fp === 'vac') fp = 'geraete';
    if (fp && PAGES.some(x => x[0] === fp)) return (this._pageSel = fp);
    if (this._pageSel) return this._pageSel;
    let v = null; try { v = localStorage.getItem('zuhause-card-page'); } catch (e) { /* ohne Speicher */ }
    if (!PAGES.some(x => x[0] === v)) v = window.innerWidth >= 1100 ? 'alles' : 'start';
    return (this._pageSel = v);
  }
  _setPage(k) {
    this._pageSel = k; try { localStorage.setItem('zuhause-card-page', k); } catch (e) { /* ohne Speicher */ }
    this._tileSig = null; this._applyTiles();
  }
  _applyTiles() {
    const arr = !!this._arrange, { order, hidden } = this._tiles();
    const pg = this._page(), pdef = PAGES.find(x => x[0] === pg), inPage = x => arr || !pdef || !pdef[2] || pdef[2].includes(x);
    const sig = arr + '|' + pg + '|' + order.join() + '|' + hidden.join();
    if (sig === this._tileSig) return;
    this._tileSig = sig;
    const vis = order.filter(x => inPage(x) && (arr || !hidden.includes(x)));
    const pb = this._k && this._k.pages; if (pb) { pb.hidden = arr || !!(this._cfg && this._cfg.page); pb.querySelectorAll('[data-page]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.page === pg))); }
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
      e.hidden = (hid && !arr) || !inPage(x);
      e.classList.toggle('shid', hid && arr);
      if (wide[x]) { e.style.setProperty('--sp', wide[x]); e.style.setProperty('--sp2', mid[x]); }
      b.hidden = !arr;
      b.innerHTML = arr ? `<span>${TILES[x][0]}</span><button data-tmv="${x}|-1" aria-label="${TILES[x][0]} nach oben">↑</button><button data-tmv="${x}|1" aria-label="${TILES[x][0]} nach unten">↓</button>`
        + (x === 'home' ? '' : `<button data-thide="${x}">${svg('eye')} ${hid ? 'Einblenden' : 'Ausblenden'}</button>`) : '';
    });
  }

  // ---------- Saugroboter: alle vacuum-Entitäten, mit Saugkraft und Reinigungsart des gleichen Geräts ----------
  // Haushaltsgeräte (Waschmaschine, Trockner): findet die Einträge am Namen; ohne Treffer ein Platzhalter
  _renderApp() {
    const k = this._k; if (!k.app) return;
    const all = Object.values(this._hass.states);
    const DEV = [['Waschmaschine', /waschmaschine|washer|washing/i, '🧺', 'Noch nicht verbunden'], ['Trockner', /trockner|dryer/i, '♨', 'Noch nicht verbunden']];
    const nm = x => x.entity_id + ' ' + (x.attributes.friendly_name || '');
    const ok = x => x && !['unknown', 'unavailable', ''].includes(x.state);
    const MS = { off: 'Aus', standby: 'Bereit', running: 'Läuft', paused: 'Pausiert', finished: 'Fertig', idle: 'Bereit', ready: 'Bereit', delay_start_waiting: 'Startzeit gewählt', anti_crease: 'Knitterschutz', error: 'Fehler', on: 'An', run: 'Läuft', inactive: 'Bereit', pause: 'Pausiert', actionrequired: 'Eingriff nötig', delayedstart: 'Startzeit gewählt', aborting: 'Bricht ab' };
    const tr = v => MS[String(v).toLowerCase()] || v;
    const mins = x => { const n = +x.state; if (!isFinite(n)) return x.state; const u = x.attributes.unit_of_measurement; const m = u === 's' ? Math.round(n / 60) : u === 'h' ? Math.round(n * 60) : Math.round(n); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'; };
    const PN = { auto: 'Automatik', allergy_care: 'Allergiker', refresh: 'Auffrischen', sportswear: 'Sport', towels: 'Handtücher', time: 'Zeit', cotton: 'Baumwolle', baby_care: 'Baby', synthetic: 'Pflegeleicht', wool: 'Wolle', delicates: 'Feinwäsche', quick_30: 'Schnell 30', shirts: 'Hemden', bedding: 'Bettwäsche', down: 'Daunen',
      cotton_eco_4060: 'Baumwolle Eco 40/60', easy_care: 'Pflegeleicht', mix: 'Mix', delicates_silk: 'Fein/Seide', dark_wash: 'Dunkles', sportswear_1: 'Sport', quick_15: 'Schnell 15', quick_mix: 'Schnell Mix', super_15: 'Super 15 min', super_30: 'Super 30 min', shirts_blouses: 'Hemden/Blusen', down_duvet: 'Daunen', drum_clean: 'Trommelreinigung', rinse: 'Spülen', spin_drain: 'Schleudern/Abpumpen' };
    const pn = v => { const k = String(v).replace(/^laundry_care_(washer|dryer)_program_/i, '').toLowerCase(); return PN[k] || (k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ')); };
    const row = ([label, re, ic, ph]) => {
      const es = all.filter(x => re.test(nm(x)));
      if (!es.length) return `<div class="row"><div class="txt"><b>${ic} ${label}</b><div class="s" style="color:var(--muted);font-size:12px">${ph}</div></div><span class="sub">–</span></div>`;
      const dom = (d, r) => es.find(x => x.entity_id.startsWith(d + '.') && r.test(nm(x)));
      const stat = dom('sensor', /maschinenstatus|betriebszustand|machine.?status/i) || dom('sensor', /status|zustand|operation/i), phase = dom('sensor', /programmphase|phase/i);
      const rem = dom('sensor', /verbleibend|restzeit|remaining/i), prgs = es.filter(x => x.entity_id.startsWith('select.') && /programm|program/i.test(nm(x))), prg = prgs.find(x => /aktives|active/i.test(nm(x)) && ok(x)) || prgs.find(x => /ausgew|selected/i.test(nm(x)) && ok(x)) || prgs.find(ok) || prgs[0] || dom('sensor', /^sensor\.[^ ]*(programm|program)(?!phase)/i);
      const door = dom('binary_sensor', /t(ü|u)r|door/i), tank = dom('binary_sensor', /wasserbeh|water.?tank|container/i), filt = dom('binary_sensor', /filter/i);
      const run = stat && ['running', 'run'].includes(stat.state);
      const pct = dom('sensor', /fortschritt|progress/i), endt = dom('sensor', /endzeit|end.?time|finish/i), doorS = dom('sensor', /_t(ü|u|ue)r$/i), dosis = es.filter(x => x.entity_id.startsWith('sensor.') && /i_?dos|fullstand|fill/i.test(x.entity_id) && /empty|leer/i.test(x.state));
      const endTxt = run && endt && ok(endt) && !isNaN(Date.parse(endt.state)) ? 'fertig um ' + new Date(endt.state).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
      const head = stat && ok(stat) ? tr(stat.state) : 'nicht erreichbar';
      const sub = [prg && ok(prg) && !/^(none|keiner?|-)$/i.test(prg.state) && pn(prg.state), run && rem && ok(rem) && 'noch ' + mins(rem), run && !rem && endTxt, run && pct && ok(pct) && !isNaN(+pct.state) && Math.round(+pct.state) + ' %', !run && phase && ok(phase) && !['idle', 'off'].includes(phase.state) && tr(phase.state)].filter(Boolean).join(' · ');
      const warn = [tank && tank.state === 'on' && 'Wasserbehälter leeren', filt && filt.state === 'on' && 'Filter reinigen', door && door.state === 'on' && 'Tür offen', dosis.length && 'Waschmittel im i-Dos fast leer'].filter(Boolean);
      const bt = (r, t) => { const b = es.find(x => x.entity_id.startsWith('button.') && r.test(x.entity_id) && x.state !== 'unavailable'); return b ? `<button class="seg" data-appbtn="${b.entity_id}">${t}</button>` : ''; };
      const act = run || (stat && ['paused', 'pause'].includes(stat.state));
      const btns = bt(/_start$/i, 'Start') + (act ? bt(/_(pause|pausieren)$/i, 'Pause') + bt(/_fortsetzen$/i, 'Weiter') + bt(/_(stopp|stop|stoppen)$/i, 'Stopp') : '');
      return `<div class="row" style="flex-wrap:wrap"><div class="txt"><b>${ic} ${label}</b>${sub ? `<div class="s" style="color:var(--muted);font-size:12px">${sub}</div>` : ''}${warn.length ? `<div class="s" style="color:var(--warn,#c77d18);font-size:12px">${warn.join(' · ')}</div>` : ''}</div><span class="sub" style="text-align:right;${run ? 'color:var(--ok,#3a9b63);font-weight:600' : ''}">${head}</span>${btns ? `<div class="segs" style="flex:0 0 100%;margin-top:6px">${btns}</div>` : ''}</div>`;
    };
    const out = DEV.map(row).join('');
    if (k.app.dataset.v !== out) { k.app.dataset.v = out; k.app.innerHTML = out; }
  }
  // 3D-Drucker: Verbrauch aus der Messsteckdose (Leistung, kWh heute und im Monat); Einträge werden am Namen gefunden
  // Speicher: zeigt die Home-Assistant-Karten aus /config/www/speicher-karten.json (Spalten mit Karten) direkt in der Karte
  _renderStor() {
    const k = this._k; if (!k.stor) return;
    const pg = this._page(); if (pg !== 'energie' && pg !== 'alles') return;
    const S = this._stor || (this._stor = { cols: null, state: 'load' });
    if (S.state === 'load' && !S.busy) {
      S.busy = true;
      (async () => {
        try {
          const r = await fetch('/local/speicher-karten.json?v=' + Date.now(), { cache: 'no-store' });
          if (!r.ok) throw new Error('keine Datei');
          const cfg = await r.json(), cols = Array.isArray(cfg) ? cfg : cfg.columns;
          const helpers = await window.loadCardHelpers();
          k.stor.innerHTML = '';
          S.cols = [];
          for (const col of cols) {
            const d = document.createElement('div'); d.className = 'sc';
            if (col.title) { const t = document.createElement('div'); t.className = 'sh'; t.textContent = col.title; d.appendChild(t); }
            for (const cc of (col.cards || [])) {
              try { const el = await helpers.createCardElement(cc); S.cols.push(el); d.appendChild(el); } catch (e) { console.warn('zuhause-card: Speicherkarte', e); }
            }
            k.stor.appendChild(d);
          }
          S.state = 'ok';
        } catch (e) { S.state = 'none'; k.stor.innerHTML = '<p class="sub">Wird angezeigt, sobald die Speicher-Karten in Home Assistant angelegt sind.</p>'; }
        S.busy = false;
      })();
    }
    if (S.state === 'ok' && Date.now() - (S.t || 0) > 4000) { S.t = Date.now(); S.cols.forEach(el => { try { el.hass = this._hass; } catch (e) {} }); }
  }
  _renderPrn() {
    const k = this._k; if (!k.prn) return;
    const all = Object.values(this._hass.states).filter(x => x.entity_id.startsWith('sensor.') && /drucker|printer/i.test(x.entity_id + ' ' + (x.attributes.friendly_name || '')));
    const ok = x => x && !['unknown', 'unavailable', ''].includes(x.state) && !isNaN(+x.state);
    const nm = x => x.entity_id + ' ' + (x.attributes.friendly_name || '');
    const pw = all.find(x => /^(W|kW)$/.test(x.attributes.unit_of_measurement || '') && ok(x));
    const en = all.filter(x => /^(kWh|Wh)$/.test(x.attributes.unit_of_measurement || '') && ok(x));
    const kwh = x => { const v = +x.state; return x.attributes.unit_of_measurement === 'Wh' ? v / 1000 : v; };
    const day = en.find(x => /heute|today|tag|daily/i.test(nm(x))), mon = en.find(x => /monat|month/i.test(nm(x)));
    let out;
    if (!pw && !en.length) out = '<p class="sub">Wird angezeigt, sobald die Messsteckdose am Drucker in Home Assistant ist.</p>';
    else {
      const w = pw ? (pw.attributes.unit_of_measurement === 'kW' ? Math.round(+pw.state * 1000) : Math.round(+pw.state)) : null;
      const f = x => x ? kwh(x).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kWh' : '–';
      out = `<div class="row"><div class="txt"><b style="font-size:26px;font-variant-numeric:tabular-nums">${w == null ? '–' : w.toLocaleString('de-DE') + ' W'}</b><span>${w == null ? '' : w > 20 ? 'Der Drucker druckt oder heizt' : 'Bereit oder aus'}</span></div></div>`
        + `<div class="row"><div class="txt"><b>Heute</b></div><span class="sub">${f(day)}</span></div><div class="row"><div class="txt"><b>Dieser Monat</b></div><span class="sub">${f(mon)}</span></div>`;
    }
    if (k.prn.dataset.v !== out) { k.prn.dataset.v = out; k.prn.innerHTML = out; }
  }
  _renderVac() {
    const k = this._k; if (!k.vac) return;
    const h = this._hass, st = h.states, E = h.entities || {};
    const vs = Object.values(st).filter(x => x.entity_id.startsWith('vacuum.'));
    if (!vs.length) { const t = '<p class="sub">Wird angezeigt, sobald ein Saugroboter in Home Assistant ist.</p>'; if (k.vac.dataset.v !== t) { k.vac.dataset.v = t; k.vac.innerHTML = t; } return; }
    const TXT = { docked: 'Angedockt', cleaning: 'Reinigt', paused: 'Pausiert', returning: 'Fährt zur Station', idle: 'Bereit', error: 'Fehler', unavailable: 'nicht erreichbar', unknown: 'unbekannt' };
    const esc = t => String(t).replace(/"/g, '&quot;');
    const out = vs.map(v => {
      const a = v.attributes, dev = E[v.entity_id] && E[v.entity_id].device_id;
      const sib = dev ? Object.values(st).filter(x => E[x.entity_id] && E[x.entity_id].device_id === dev && x.entity_id !== v.entity_id) : [];
      const sels = sib.filter(x => x.entity_id.startsWith('select.') && Array.isArray(x.attributes.options));
      const fanSel = sels.find(x => /l(ü|ue|u)fter|saug|fan|suction/i.test(x.entity_id + ' ' + (x.attributes.friendly_name || '')));
      const modeSel = sels.find(x => /reinigungsmethode|wisch|mop|clean.*(method|mode)/i.test(x.entity_id + ' ' + (x.attributes.friendly_name || '')));
      const bat = a.battery_level != null ? a.battery_level : (sib.find(x => x.entity_id.startsWith('sensor.') && x.attributes.device_class === 'battery') || {}).state;
      const art = `<img class="vphoto" src="/local/saugroboter.png" alt="" onerror="this.nextElementSibling.style.display='block';this.remove()"><svg class="vart ${v.state === 'cleaning' ? 'cl' : ''}" style="display:none" viewBox="0 0 230 130" aria-hidden="true"><rect x="118" y="14" width="88" height="86" rx="18" fill="#e9edf2"/><rect x="126" y="22" width="72" height="22" rx="10" fill="#fff"/><rect x="128" y="76" width="68" height="24" rx="8" fill="#d5dbe3"/><rect x="150" y="30" width="22" height="3" rx="1.5" fill="#c3cad4"/><ellipse cx="112" cy="116" rx="60" ry="6" fill="rgba(0,0,0,.18)"/><g class="rb"><circle cx="112" cy="78" r="46" fill="#f5f7fa" stroke="#d3d9e1" stroke-width="2"/><rect x="78" y="86" width="26" height="9" rx="4" fill="#cdd3dc"/></g><g class="ld"><circle cx="112" cy="78" r="13" fill="#fff" stroke="#d3d9e1" stroke-width="2"/><circle cx="112" cy="78" r="8" fill="none" stroke="#e8602c" stroke-width="3" stroke-dasharray="26 24"/></g></svg>`;
      let html = art + `<div class="vh"><b>${a.friendly_name || v.entity_id}</b><div class="vst"><b>${bat != null && !isNaN(+bat) ? Math.round(+bat) + ' %' : ''}</b>${TXT[v.state] || v.state}</div></div>`;
      html += `<div class="vb"><button class="go" data-vac="start|${v.entity_id}">${v.state === 'paused' ? 'Weiter' : 'Start'}</button><button data-vac="pause|${v.entity_id}">Pause</button><button data-vac="return_to_base|${v.entity_id}">Zur Station</button></div>`;
      const row = (lbl, cur, opts, mk) => `<div class="vl">${lbl}</div><div class="vc">${opts.map(o => `<button class="${o === cur ? 'on' : ''}" ${mk(o)}>${o}</button>`).join('')}</div>`;
      if (fanSel) html += row('Saugkraft', fanSel.state, fanSel.attributes.options, o => `data-vsel="${esc(fanSel.entity_id + '|' + o)}"`);
      else if (Array.isArray(a.fan_speed_list) && a.fan_speed_list.length) html += row('Saugkraft', a.fan_speed, a.fan_speed_list, o => `data-vfan="${esc(v.entity_id + '|' + o)}"`);
      if (modeSel) html += row('Reinigung', modeSel.state, modeSel.attributes.options, o => `data-vsel="${esc(modeSel.entity_id + '|' + o)}"`);
      const dn = ((h.devices && dev && h.devices[dev] && (h.devices[dev].name_by_user || h.devices[dev].name)) || '').trim();
      const short = x => { const f = (x.attributes.friendly_name || x.entity_id), id = x.entity_id + ' ' + f;
        if (/staubfilter|filter/i.test(id)) return 'Filter'; if (/hauptb/i.test(id)) return 'Hauptbürste'; if (/seitenb/i.test(id)) return 'Seitenbürste'; if (/sensor/i.test(id)) return 'Sensoren';
        let t = f; [dn, a.friendly_name, 'Kehrmaschine'].filter(Boolean).forEach(n => { t = t.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ''); }); return t.replace(/zur(ü|ue|u)cksetz\w*/ig, '').trim() || f; };
      const mnt = sib.filter(x => /^button\./.test(x.entity_id) && /filter|b(ü|ue|u)rste|sensor/i.test(x.entity_id + ' ' + (x.attributes.friendly_name || '')));
      if (mnt.length) html += `<div class="vl">Wartung nach dem Wechsel</div><div class="vc">${mnt.map(x => `<button data-vbtn="${x.entity_id}">${short(x)}</button>`).join('')}</div>`;
      return html;
    }).join('<hr style="border:0;border-top:1px solid var(--line);margin:14px 0">');
    if (k.vac.dataset.v !== out) { k.vac.dataset.v = out; k.vac.innerHTML = out; }
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
    // Bewegung (z. B. WiZ SpaceSense) aus Belegungs-/Bewegungsmeldern des Raums
    const mot = Object.values(this._hass.states).filter(s => /^binary_sensor\./.test(s.entity_id) && /occupancy|motion|presence/.test(s.attributes.device_class || '')
      && this._areaOf(s.entity_id) === r.id);
    if (mot.length) {
      const on = mot.some(s => s.state === 'on');
      const ms = this._motSet(r), mo = !!ms && (this._motOpen || (this._motOpen = new Set())).has(r.id);
      h += `<div class="row"><div class="ico">${svg('bulb')}</div><div class="txt" data-more="${mot[0].entity_id}"><b>Bewegung ${r.name}</b><span>${on ? 'erkannt' : 'keine'}</span></div>${ms ? `<button class="bst" data-motopen="${r.id}" aria-expanded="${mo}">${mo ? 'Zuklappen' : 'Einstellungen'}</button>` : ''}</div>`;
      if (mo) h += this._motPanel(ms, mot[0]);
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
    if (d.bew) { const r = room(d.bew); if (r) this._bewToggle(r); return true; }
    if (d.boost) { const r = room(d.boost); if (r) { const c = r.climate.filter(x => this._canBoost(x)); this._startBoost(c.map(x => x.entity_id), !!this._boostInfo(c)); } return done(); }
    if (d.boostoff) {
      const ids = (room(d.boostoff) || { climate: [] }).climate.filter(x => this._canBoost(x)).map(x => x.entity_id);
      if (ids.length) this._stopBoost(ids);
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
    if (d.motopen) { const S = this._motOpen || (this._motOpen = new Set()); S.has(d.motopen) ? S.delete(d.motopen) : S.add(d.motopen); return done(); }
    if (d.motbool) { h.callService('input_boolean', 'toggle', { entity_id: d.motbool }); return done(); }
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
      if (this._s('input_button.zuhause_haustuer_knopf')) h.callService('input_button', 'press', { entity_id: 'input_button.zuhause_haustuer_knopf' });
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
      // nur wenn jemand im Dashboard auf "Haustür öffnen" drückt, nicht bei jedem Öffnen der Tür (Christof, 02.11.2026)
      { id: 'zuhause_haustuer', name: 'Haustür über Dashboard geöffnet', ids: door || this._doorKey() ? ['input_button.zuhause_haustuer_knopf'] : [] },
      { id: 'zuhause_carportlicht', name: 'Carportlicht an', fast: true, ids: carport ? [carport.entity_id] : [] },
      { id: 'zuhause_wasser', name: 'Wasser im Keller', ids: water.map(x => x.entity_id), loud: true },
      { id: 'zuhause_zu_heiss', name: 'Zu heiß (über 35 °C)', ids: temps.map(x => x.entity_id), loud: true },
    ] };
  }
  _notifCfg(it, phones) {
    const loud = it.fast ? { priority: 'high', ttl: 0, push: { sound: 'default' } } : it.loud ? { priority: 'high', ttl: 0, channel: 'alarm_stream', push: { 'interruption-level': 'time-sensitive', sound: 'default' } } : { push: { sound: 'default' } };
    const send = (title, message) => phones.map(p => ({ action: 'notify.' + p, data: { title, message, data: loud } }));
    const base = { id: it.id, alias: 'Zuhause: ' + it.name, description: 'Angelegt vom Zuhause-Dashboard', mode: 'queued' };
    const nb = { not_from: ['unavailable', 'unknown'], not_to: ['unavailable', 'unknown'] };
    if (it.id === 'zuhause_alarm_status') return { ...base, triggers: [{ trigger: 'state', entity_id: it.ids, ...nb }],
      actions: [{ choose: [{ conditions: [{ condition: 'template', value_template: "{{ trigger.to_state.state | lower in ['off', 'false', 'nicht anwesend', 'abwesend'] }}" }], sequence: send('Alarmanlage', 'Alarmanlage ist scharf') }],
        default: send('Alarmanlage', 'Alarmanlage ist unscharf') }] };
    if (it.id === 'zuhause_zu_heiss') return { ...base, mode: 'single', triggers: [{ trigger: 'numeric_state', entity_id: it.ids, attribute: 'current_temperature', above: 35 }],
      actions: [...send('Zu heiß!', "{{ state_attr(trigger.entity_id, 'friendly_name') }}: {{ state_attr(trigger.entity_id, 'current_temperature') }} °C"), { delay: '00:30:00' }] };
    if (it.id === 'zuhause_haustuer') return { ...base, triggers: [{ trigger: 'state', entity_id: it.ids, not_from: ['unavailable', 'unknown'] }],
      actions: send('Haustür', "{% set p = states.person | selectattr('attributes.user_id', 'eq', trigger.to_state.context.user_id) | map(attribute='name') | list %}Haustür über das Dashboard geöffnet{{ ' von ' ~ p[0] if p else '' }}") };
    const txt = { zuhause_alarm_ausgeloest: ['Alarm!', 'Alarm ausgelöst!'], zuhause_haustuer: ['Haustür', 'Haustür auf'], zuhause_carportlicht: ['Carportlicht', 'Carportlicht an'], zuhause_wasser: ['Wasser im Keller', 'Wasser im Keller!'] }[it.id];
    // Carportlicht schaltet per Bewegungsmelder oft: höchstens eine Meldung pro Stunde
    if (it.id === 'zuhause_carportlicht') return { ...base, mode: 'single', triggers: [{ trigger: 'state', entity_id: it.ids, to: ['on', 'true'], not_from: ['unavailable', 'unknown'] }], actions: [...send(...txt), { delay: '00:15:00' }] };
    return { ...base, triggers: [{ trigger: 'state', entity_id: it.ids, to: ['on', 'true', 'ausgelöst'], not_from: ['unavailable', 'unknown'] }], actions: send(...txt) };
  }
  // Empfänger einer vorhandenen Meldung beibehalten (zum Beispiel wenn ein Handy dort bewusst entfernt wurde); ohne vorhandene Regel gehen alle Handys
  async _notifRecv(id, phones) {
    try {
      const c = await this._hass.callApi('GET', 'config/automation/config/' + id), found = new Set();
      const walk = o => { if (!o || typeof o !== 'object') return; if (typeof o.action === 'string' && /^notify\.mobile_app_/.test(o.action)) found.add(o.action.slice(7)); Object.values(o).forEach(walk); };
      walk(c && (c.actions || c.action || c));
      const r = [...found].filter(p => phones.includes(p));
      return r.length ? r : phones;
    } catch (e) { return phones; }
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
        try { await h.callApi('POST', 'config/automation/config/' + it.id, this._notifCfg(it, await this._notifRecv(it.id, plan.phones))); ok++; } catch (e) { fail++; }
      }
      this._notifMsg = fail ? `${ok} eingerichtet, ${fail} fehlgeschlagen.` : `✓ ${ok} Meldungen eingerichtet.`;
    }
    this._notifSig = null; this._renderNotif();
  }
  // Einmalig: Christof will nur Alarm ausgelöst, zu heiß, Haustür und Carportlicht als Meldung (29.10.2026)
  _notifDefaults() {
    const h = this._hass, L = this._lay;
    this._notifDoor(); this._notifCarport();
    if (!L || L.nOff1 || !(h.user && h.user.is_admin)) return;
    const off = Object.values(h.states).filter(x => x.entity_id.startsWith('automation.') && ['zuhause_alarm_status', 'zuhause_wasser'].includes(x.attributes.id));
    if (!off.length) return;
    L.nOff1 = 1; this._save();
    h.callService('automation', 'turn_off', { entity_id: off.map(x => x.entity_id) });
  }
  // Carportlicht-Meldung einmalig mit Pause von 15 Minuten neu anlegen (v2.29.1 Stunde, v2.42.1 15 Minuten)
  async _notifCarport() {
    const h = this._hass, L = this._lay;
    if (!L || L.nCarp3 || this._nCarpT || !(h.user && h.user.is_admin)) return;
    const plan = this._notifPlan(), it = plan.items.find(x => x.id === 'zuhause_carportlicht');
    if (!it || !it.ids.length || !plan.phones.length) return;
    this._nCarpT = true;
    try {
      const had = Object.values(h.states).some(x => x.entity_id.startsWith('automation.') && x.attributes.id === 'zuhause_carportlicht');
      if (had) await h.callApi('POST', 'config/automation/config/zuhause_carportlicht', this._notifCfg(it, await this._notifRecv('zuhause_carportlicht', plan.phones)));
      L.nCarp2 = 1; L.nCarp3 = 1; this._save();
    } catch (e) { console.warn('zuhause-card: Carportlicht-Meldung', e); this._nCarpT = false; }
  }
  // Haustür-Meldung hängt seit v2.27.0 am Dashboard-Knopf (input_button) statt am Türöffner-Schalter
  async _notifDoor() {
    const h = this._hass, L = this._lay;
    if (!L || L.nDoor2 || this._nDoorT || !(h.user && h.user.is_admin)) return;
    const plan = this._notifPlan(), it = plan.items.find(x => x.id === 'zuhause_haustuer');
    if (!it || !it.ids.length || !plan.phones.length) return;
    this._nDoorT = true;
    try {
      if (!h.states['input_button.zuhause_haustuer_knopf']) await h.callWS({ type: 'input_button/create', name: 'Zuhause Haustuer Knopf', icon: 'mdi:door-open' });
      const had = Object.values(h.states).some(x => x.entity_id.startsWith('automation.') && x.attributes.id === 'zuhause_haustuer');
      if (had) await h.callApi('POST', 'config/automation/config/zuhause_haustuer', this._notifCfg(it, await this._notifRecv('zuhause_haustuer', plan.phones)));
      L.nDoor2 = 1; this._save();
    } catch (e) { console.warn('zuhause-card: Haustür-Meldung', e); this._nDoorT = false; }
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
      conditions: [{ condition: 'template', value_template: "{% set s = trigger.to_state.state | lower %}{{ ('nicht' in s and 'verbunden' in s) or ('not connected' in s or 'not_connected' in s) or 'getrennt' in s }}" },
        { condition: 'template', value_template: `{{ states('${sel.entity_id}') != '${pv}' }}` }],
      actions: [{ action: 'select.select_option', target: { entity_id: sel.entity_id }, data: { option: pv } }],
    }).catch(() => { this._wbAutoT = false; });
  }

  async _setWbMode(eid, opt) {
    const h = this._hass, n = this._wbN();
    // PV-Laden mit Netzanteil: die Regel-Automation übernimmt. Schnell: Regelung aus, volle Leistung
    if (n.bool) {
      const pvMode = /optimiert|optimized/i.test(opt);
      await h.callService('input_boolean', pvMode && n.share > 0 ? 'turn_on' : 'turn_off', { entity_id: n.bool.entity_id }).catch(() => {});
      if (!pvMode && n.lim && +n.lim.state < WB_MAX) await h.callService('number', 'set_value', { entity_id: n.lim.entity_id, value: WB_MAX }).catch(() => {});
    }
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

  // ---------- Netzanteil beim PV-Laden (eigene Regelung statt SMA-Portal) ----------
  _wbN() {
    const h = this._hass, num = h.states['input_number.zuhause_wallbox_netzanteil'], bool = h.states['input_boolean.zuhause_wallbox_pv_regelung'];
    const ank = (d, re) => Object.values(h.states).find(x => x.entity_id.startsWith(d + '.') && /solarbank|anker solix/i.test(x.attributes.friendly_name || '') && re.test(x.attributes.friendly_name || ''));
    return { num, bool, share: num ? Math.round(+num.state || 0) : 0, lim: this._wbEnt(['number'], /leistungsbegrenzung|power limit/i),
      akkuOk: h.states['input_boolean.zuhause_wallbox_akku_erlaubt'], pause: h.states['input_boolean.zuhause_anker_pausiert'],
      aMode: ank('select', /betriebsmodus|usage mode/i), aOut: ank('number', /leistungssteuerung|output preset|system output/i) };
  }
  // legt Helfer und Regel-Automation einmalig an (nur Admin); WBN_V hochzählen, wenn sich die Automation ändert
  async _wbNSetup(sel, pv, fast, n) {
    const h = this._hass, c = this._cfg, L = this._lay;
    if (this._wbNT || !L || !(h.user && h.user.is_admin) || !n.lim || !pv || !fast || !c.grid_in || !c.grid_out || !c.wallbox) return;
    if (n.num && n.bool && (n.akkuOk || !n.aMode) && (h.states['input_text.zuhause_anker_modus_vorher'] || !n.aMode) && L.wbnV === WBN_V) return;
    this._wbNT = true;
    try {
      if (!n.num) await h.callWS({ type: 'input_number/create', name: 'Zuhause Wallbox Netzanteil', min: 0, max: 100, step: 10, mode: 'slider', unit_of_measurement: '%', icon: 'mdi:transmission-tower', initial: 0 });
      if (!n.bool) await h.callWS({ type: 'input_boolean/create', name: 'Zuhause Wallbox PV-Regelung', icon: 'mdi:solar-power' });
      if (n.aMode && !n.akkuOk) await h.callWS({ type: 'input_boolean/create', name: 'Zuhause Wallbox Akku erlaubt', icon: 'mdi:home-battery' });
      if (n.aMode && !n.pause) await h.callWS({ type: 'input_boolean/create', name: 'Zuhause Anker pausiert', icon: 'mdi:pause-circle' });
      if (n.aMode && !h.states['input_text.zuhause_anker_modus_vorher']) await h.callWS({ type: 'input_text/create', name: 'Zuhause Anker Modus vorher', max: 60 });
      const st = this._wbEnt(['sensor'], /status ladevorgang|charging session status/i);
      const en = this._wbEnt(['number'], /energiemenge/i), du = this._wbEnt(['number'], /dauer des ladevorg/i);
      const w = e => `(states('${e}') | float(0) * (1000 if state_attr('${e}', 'unit_of_measurement') == 'kW' else 1))`;
      const id = 'zuhause_wallbox_netzanteil', lim = n.lim.entity_id;
      // Akku-Entladung zählt nicht als Sonne: sonst leert das Auto den Hausakku
      const dis = this._ankerEnt(/entladeleistung|discharg\w* power/i);
      const akku = [dis ? w(dis.entity_id) : '', ...this._marstek().filter(d => d.in && d.out).map(d => `([${w(d.out)} - ${w(d.in)}, 0] | max)`)].filter(Boolean);
      await h.callApi('POST', 'config/automation/config/' + id, {
        id, alias: 'Zuhause: Wallbox PV-Laden mit Netzanteil', description: 'Angelegt vom Zuhause-Dashboard. Regelt die Leistungsbegrenzung der Wallbox: Sonnenüberschuss plus eingestellter Netzanteil.', mode: 'single',
        triggers: [{ trigger: 'time_pattern', seconds: '/30' }, { trigger: 'state', entity_id: ['input_number.zuhause_wallbox_netzanteil', 'input_boolean.zuhause_wallbox_pv_regelung'] }],
        variables: {
          share: "{{ states('input_number.zuhause_wallbox_netzanteil') | float(0) }}",
          aktiv: "{{ is_state('input_boolean.zuhause_wallbox_pv_regelung', 'on') and states('input_number.zuhause_wallbox_netzanteil') | float(0) > 0 }}",
          verbunden: st ? `{% set s = states('${st.entity_id}') | lower %}{{ s not in ['unknown', 'unavailable'] and not (('nicht' in s and 'verbunden' in s) or ('not connected' in s or 'not_connected' in s) or 'getrennt' in s) }}` : '{{ true }}',
          frei: `{{ ${w(c.wallbox)} + ${w(c.grid_out)} - ${w(c.grid_in)}${akku.length ? ` - (0 if is_state('input_boolean.zuhause_wallbox_akku_erlaubt', 'on') else (${akku.join(' + ')}))` : ''} }}`,
          ziel: `{{ ${WB_MAX} if share >= 100 else (frei / (1 - share / 100)) | int }}`,
          neu: `{{ [[(ziel / 100) | round(0) * 100, ${WB_MIN}] | max, ${WB_MAX}] | min | int }}`,
          jetzt: `{{ states('${lim}') | float(${WB_MAX}) }}`,
          modus: `{{ states('${sel.entity_id}') }}`,
        },
        actions: [{
          choose: [
            { conditions: [{ condition: 'template', value_template: '{{ not aktiv or not verbunden }}' }],
              sequence: [{ condition: 'template', value_template: `{{ jetzt < ${WB_MAX} }}` }, { action: 'number.set_value', target: { entity_id: lim }, data: { value: WB_MAX } }] },
            { conditions: [{ condition: 'template', value_template: `{{ modus == '${pv}' and ziel >= ${WB_MIN + 400} }}` }],
              sequence: [
                ...(en && du ? [{ action: 'number.set_value', target: { entity_id: en.entity_id }, data: { value: 100 } }, { action: 'number.set_value', target: { entity_id: du.entity_id }, data: { value: 545 } }] : []),
                { action: 'number.set_value', target: { entity_id: lim }, data: { value: '{{ neu }}' } },
                { action: 'select.select_option', target: { entity_id: sel.entity_id }, data: { option: fast } }] },
            { conditions: [{ condition: 'template', value_template: `{{ modus == '${fast}' and ziel < ${WB_MIN} }}` }],
              sequence: [{ action: 'select.select_option', target: { entity_id: sel.entity_id }, data: { option: pv } }, { action: 'number.set_value', target: { entity_id: lim }, data: { value: WB_MAX } }] },
            { conditions: [{ condition: 'template', value_template: `{{ modus == '${fast}' and (neu - jetzt) | abs >= 300 }}` }],
              sequence: [{ action: 'number.set_value', target: { entity_id: lim }, data: { value: '{{ neu }}' } }] },
          ],
        }],
      });
      // Hausakku schützen: solange das Auto lädt, gibt der Anker nichts ab (Benutzerdefinierter Modus mit 0 W), danach wieder Eigenverbrauch
      const modes = n.aMode ? n.aMode.attributes.options || [] : [];
      const mEig = modes.find(o => /eigenverbrauch|self.?consumption/i.test(o)), mMan = modes.find(o => /benutzerdefiniert|custom|manual/i.test(o));
      // nur aus diesen Modi pausieren und danach genau dorthin zurück (Christof nutzt mal Eigenverbrauch, mal Smart-Modus)
      const mOk = modes.filter(o => /eigenverbrauch|self.?consumption|smart/i.test(o));
      if (n.aMode && n.aOut && mEig && mMan) {
        const am = n.aMode.entity_id, wb = w(c.wallbox);
        await h.callApi('POST', 'config/automation/config/zuhause_wallbox_akku_schutz', {
          id: 'zuhause_wallbox_akku_schutz', alias: 'Zuhause: Hausakku lädt das Auto nicht', description: 'Angelegt vom Zuhause-Dashboard. Solange das Auto lädt, gibt der Anker-Speicher nichts ab, außer „Speicher darf Auto mitladen“ ist an.', mode: 'queued',
          triggers: [
            { trigger: 'template', value_template: `{{ ${wb} > 1500 }}`, for: { minutes: 1 }, id: 'laedt' },
            { trigger: 'template', value_template: `{{ ${wb} < 300 }}`, for: { minutes: 2 }, id: 'fertig' },
            { trigger: 'state', entity_id: 'input_boolean.zuhause_wallbox_akku_erlaubt', id: 'erlaubt' },
            // auch jede Minute prüfen: lädt das Auto schon, wenn die Regel entsteht, gibt es keinen Wechsel, der sie auslöst
            { trigger: 'time_pattern', minutes: '/1' },
          ],
          actions: [{ choose: [
            { conditions: [{ condition: 'template', value_template: `{{ ${wb} > 1500 and is_state('input_boolean.zuhause_wallbox_akku_erlaubt', 'off') and is_state('input_boolean.zuhause_anker_pausiert', 'off') and states('${am}') in ${JSON.stringify(mOk)} }}` }],
              sequence: [
                { action: 'input_text.set_value', target: { entity_id: 'input_text.zuhause_anker_modus_vorher' }, data: { value: `{{ states('${am}') }}` } },
                { action: 'number.set_value', target: { entity_id: n.aOut.entity_id }, data: { value: 0 } },
                { action: 'select.select_option', target: { entity_id: am }, data: { option: mMan } },
                { action: 'input_boolean.turn_on', target: { entity_id: 'input_boolean.zuhause_anker_pausiert' } }] },
            { conditions: [{ condition: 'template', value_template: `{{ is_state('input_boolean.zuhause_anker_pausiert', 'on') and (${wb} < 300 or is_state('input_boolean.zuhause_wallbox_akku_erlaubt', 'on')) }}` }],
              sequence: [
                { action: 'select.select_option', target: { entity_id: am }, data: { option: `{% set v = states('input_text.zuhause_anker_modus_vorher') %}{{ v if v in ${JSON.stringify(mOk)} else '${mEig}' }}` } },
                { action: 'input_boolean.turn_off', target: { entity_id: 'input_boolean.zuhause_anker_pausiert' } }] },
          ] }],
        });
      }
      L.wbnV = WBN_V; this._save();
    } catch (e) { console.warn('zuhause-card: Netzanteil einrichten', e); }
  }

  // Vorrang der Sonne: Batterie oder Auto (Schalter an = Auto zuerst); ohne angestecktes Auto lädt immer die Batterie
  _wbPrio() {
    const h = this._hass, bool = h.states['input_boolean.zuhause_solar_prioritaet_auto'];
    const st = this._wbEnt(['sensor'], /status ladevorgang|charging session status/i);
    const s = st ? String(st.state).toLowerCase() : '';
    const connected = !st ? null : !(['unknown', 'unavailable', ''].includes(s) || (s.includes('nicht') && s.includes('verbunden')) || s.includes('not connected') || s.includes('not_connected') || s.includes('getrennt'));
    const auto = !!bool && bool.state === 'on';
    const note = !bool ? 'wird eingerichtet' : connected === false ? 'kein Auto: Batterie lädt' : auto ? 'Auto zuerst, Rest in die Batterie' : 'Batterie zuerst, Rest ins Auto';
    if (!bool && !this._wbPrioT && h.user && h.user.is_admin) {
      this._wbPrioT = true;
      h.callWS({ type: 'input_boolean/create', name: 'Zuhause Solar Prioritaet Auto', icon: 'mdi:car-electric' }).catch(e => console.warn('zuhause-card: Solar-Prioritaet', e));
    }
    return { bool, auto, connected, note };
  }
  // Zeitschaltung fürs Laden: ab Uhrzeit (optional bis Uhrzeit, an gewählten Wochentagen) volle Ladeleistung aus dem Netz; der Hausspeicher bleibt unberührt
  _wbZeit(sel, pv, fast) {
    const h = this._hass, S = h.states, g = k => S['input_' + k.split('.')[0] + '.zuhause_wallbox_zeit_' + k.split('.')[1]];
    const akt = g('boolean.aktiv'), ende = g('boolean.ende_aktiv'), von = g('datetime.von'), bis = g('datetime.bis'), tage = g('text.tage');
    if (!this._wbZT && h.user && h.user.is_admin && !(akt && ende && von && bis && tage && h.states['automation.zuhause_wallbox_zeitschaltung']) && pv && fast) this._wbZeitSetup(sel, pv, fast);
    const hhmm = x => x && /^\d{1,2}:\d{2}/.test(String(x.state)) ? String(x.state).slice(0, 5).padStart(5, '0') : '';
    const days = new Set(String(tage ? tage.state : '0123456').split('')), NM = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const on = !!akt && akt.state === 'on', eOn = !!ende && ende.state === 'on';
    const sub = !akt ? 'wird eingerichtet' : !on ? 'Aus' : `Lädt ab ${hhmm(von) || '–'}${eOn ? ' bis ' + (hhmm(bis) || '–') : ''} · ${days.size === 7 ? 'täglich' : NM.filter((n, i) => days.has(String(i))).join(' ')}`;
    const tm = (x, lbl) => `<div class="row"><div class="txt"><b>${lbl}</b></div><input type="time" value="${hhmm(x)}" data-mottime="${x.entity_id}" aria-label="${lbl}" style="background:var(--line);color:var(--ink,inherit);color-scheme:light dark;border:0;border-radius:8px;padding:6px 10px;min-width:96px;font:inherit;font-size:14px"></div>`;
    let d = '';
    if (on && von) d = tm(von, 'Laden ab')
      + (ende ? `<div class="row"><div class="txt"><b>Ende festlegen</b><div class="s" style="color:var(--muted);font-size:12px">${eOn ? 'Danach wieder PV-Laden' : 'Ohne Ende lädt es, bis das Auto voll ist'}</div></div><button class="tg" role="switch" aria-label="Ende festlegen" aria-checked="${eOn}" data-wbz="ende"></button></div>` : '')
      + (eOn && bis ? tm(bis, 'Laden bis') : '')
      + `<div class="wbdays">${NM.map((n, i) => `<button class="seg${days.has(String(i)) ? ' on' : ''}" data-wbtag="${i}" aria-pressed="${days.has(String(i))}">${n}</button>`).join('')}</div>`
      + `<p class="sub" style="margin:4px 0 0;font-size:12px">Modus ☀ PV-Laden stehen lassen: die Wallbox wartet dann bis zur Startzeit und lädt erst dann. „Sofort“ lädt gleich. Geladen wird mit voller Leistung aus dem Netz. Der Hausspeicher bleibt voll für die Nacht, solange „Speicher darf Auto mitladen“ aus ist.</p>`;
    return `<div class="row" style="margin-top:10px"><div class="txt"><b>⏰ Zeitschaltung</b><div class="s" style="color:var(--muted);font-size:12px">${sub}</div></div><button class="tg" role="switch" aria-label="Zeitschaltung" aria-checked="${on}" ${akt ? '' : 'disabled'} data-wbz="aktiv"></button></div>${d}`;
  }
  async _wbZeitSetup(sel, pv, fast) {
    const h = this._hass, S = h.states, L = this._lay, n = this._wbN();
    if (this._wbZT || !L || !n.lim) return;
    this._wbZT = true;
    try {
      const mk = (id, type, cfg) => S[id] ? null : h.callWS({ type: type + '/create', ...cfg });
      await mk('input_boolean.zuhause_wallbox_zeit_aktiv', 'input_boolean', { name: 'Zuhause Wallbox Zeit aktiv', icon: 'mdi:timer-outline' });
      await mk('input_boolean.zuhause_wallbox_zeit_ende_aktiv', 'input_boolean', { name: 'Zuhause Wallbox Zeit Ende aktiv', icon: 'mdi:timer-stop-outline' });
      await mk('input_datetime.zuhause_wallbox_zeit_von', 'input_datetime', { name: 'Zuhause Wallbox Zeit von', has_date: false, has_time: true, initial: '22:00', icon: 'mdi:clock-start' });
      await mk('input_datetime.zuhause_wallbox_zeit_bis', 'input_datetime', { name: 'Zuhause Wallbox Zeit bis', has_date: false, has_time: true, initial: '06:00', icon: 'mdi:clock-end' });
      await mk('input_text.zuhause_wallbox_zeit_tage', 'input_text', { name: 'Zuhause Wallbox Zeit Tage', max: 20, initial: '0123456', icon: 'mdi:calendar-week' });
      const st = this._wbEnt(['sensor'], /status ladevorgang|charging session status/i);
      const en = this._wbEnt(['number'], /energiemenge/i), du = this._wbEnt(['number'], /dauer des ladevorg/i);
      const lim = n.lim.entity_id, selId = sel.entity_id;
      const tageOk = "{{ now().weekday() | string in states('input_text.zuhause_wallbox_zeit_tage') }}";
      const verb = st ? `{% set s = states('${st.entity_id}') | lower %}{{ s not in ['unknown', 'unavailable'] and not (('nicht' in s and 'verbunden' in s) or ('not connected' in s or 'not_connected' in s) or 'getrennt' in s) }}` : '{{ true }}';
      const fenster = "{% set v = states('input_datetime.zuhause_wallbox_zeit_von')[:5] %}{% set b = states('input_datetime.zuhause_wallbox_zeit_bis')[:5] %}{% set t = now().strftime('%H:%M') %}{{ (v <= t < b) if v < b else (t >= v or t < b) }}";
      const start = [
        ...(S['input_boolean.zuhause_wallbox_pv_regelung'] ? [{ action: 'input_boolean.turn_off', target: { entity_id: 'input_boolean.zuhause_wallbox_pv_regelung' } }] : []),
        { action: 'number.set_value', target: { entity_id: lim }, data: { value: WB_MAX } },
        ...(en && du ? [{ action: 'number.set_value', target: { entity_id: en.entity_id }, data: { value: 100 } }, { action: 'number.set_value', target: { entity_id: du.entity_id }, data: { value: 545 } }] : []),
        { action: 'select.select_option', target: { entity_id: selId }, data: { option: fast } }];
      const T = t => ({ condition: 'template', value_template: t });
      await h.callApi('POST', 'config/automation/config/zuhause_wallbox_zeitschaltung', {
        id: 'zuhause_wallbox_zeitschaltung', alias: 'Zuhause: Wallbox Zeitschaltung', description: 'Angelegt vom Zuhause-Dashboard. Lädt ab der eingestellten Uhrzeit mit voller Leistung, optional bis zu einer Endzeit, an den gewählten Wochentagen.', mode: 'restart',
        triggers: [{ trigger: 'time', at: 'input_datetime.zuhause_wallbox_zeit_von', id: 'start' }, { trigger: 'time', at: 'input_datetime.zuhause_wallbox_zeit_bis', id: 'ende' }, ...(st ? [{ trigger: 'state', entity_id: st.entity_id, id: 'steckt' }] : [])],
        conditions: [{ condition: 'state', entity_id: 'input_boolean.zuhause_wallbox_zeit_aktiv', state: 'on' }],
        actions: [{ choose: [
          { conditions: [T("{{ trigger.id == 'start' }}"), T(tageOk), T(verb)], sequence: start },
          { conditions: [T("{{ trigger.id == 'steckt' }}"), { condition: 'state', entity_id: 'input_boolean.zuhause_wallbox_zeit_ende_aktiv', state: 'on' }, T(tageOk), T(verb), T(fenster), T(`{{ states('${selId}') != '${fast}' }}`)], sequence: start },
          { conditions: [T("{{ trigger.id == 'ende' }}"), { condition: 'state', entity_id: 'input_boolean.zuhause_wallbox_zeit_ende_aktiv', state: 'on' }], sequence: [
            { action: 'select.select_option', target: { entity_id: selId }, data: { option: pv } }, { action: 'number.set_value', target: { entity_id: lim }, data: { value: WB_MAX } }] },
        ] }],
      });
    } catch (e) { console.warn('zuhause-card: Zeitschaltung einrichten', e); }
  }
  _renderWbMode() {
    const k = this._k.wbmode; if (!k) return;
    if (Date.now() < (this._wbLpUntil || 0)) { clearTimeout(this._wbLpR); this._wbLpR = setTimeout(() => this._renderWbMode(), 650); return; }
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
    const n = this._wbN(), reg = n.bool && n.bool.state === 'on' && n.share > 0;
    this._wbNSetup(sel, pv, fast, n);
    const isOn = o => o === pv ? cur === pv || reg : cur === o && !reg;
    const btn = (o, label) => o ? `<button class="seg${isOn(o) ? ' on' : ''}" data-wbmode="${sel.entity_id}|${o}" ${locked ? 'disabled' : ''}>${label}</button>` : '';
    const pvl = n.num ? `☀ PV-Laden<small class="segs-s">${n.share > 0 ? `+ ${n.share} % Netz` : 'nur Sonne'}</small>` : '☀ PV-Laden';
    const pr = this._wbPrio();
    const prHtml = `<div class="wbprio"><div class="wbprio-h"><b>Solar zuerst für</b><span>${pr.note}</span></div><div class="segs" style="margin-top:6px"><button class="seg${pr.auto ? '' : ' on'}" data-wbprio="bat" ${pr.bool ? '' : 'disabled'}>🔋 Batterie</button><button class="seg${pr.auto ? ' on' : ''}" data-wbprio="auto" ${pr.bool ? '' : 'disabled'}>🚗 Auto</button></div></div>`;
    const sp = this._hass.states['input_boolean.zuhause_anker_entladen_sperren'];
    if (!sp && !this._wbSperT && this._hass.user && this._hass.user.is_admin) {
      this._wbSperT = true;
      this._hass.callWS({ type: 'input_boolean/create', name: 'Zuhause Anker Entladen sperren', icon: 'mdi:battery-lock' }).catch(e => console.warn('zuhause-card: Entladen sperren', e));
    }
    const spHtml = `<div class="row" style="margin-top:10px"><div class="txt"><b>🔒 Speicher nicht entladen</b><div class="s" style="color:var(--muted);font-size:12px">${!sp ? 'wird eingerichtet' : sp.state === 'on' ? 'Der Anker gibt nichts ans Haus ab, er lädt nur' : 'Aus: Der Anker versorgt das Haus wie sonst'}</div></div><button class="tg" role="switch" aria-label="Speicher nicht entladen" aria-checked="${!!sp && sp.state === 'on'}" ${sp ? '' : 'disabled'} data-wbsperre></button></div>`;
    const S2 = this._hass.states, wpL = S2['light.waermepumpe_pv'], wpK = S2['input_boolean.warmepumpe_pv_gesperrt'];
    const tgRow = (title, sub, on, attr, lbl) => `<div class="row" style="margin-top:10px"><div class="txt"><b>${title}</b><div class="s" style="color:var(--muted);font-size:12px">${sub}</div></div><button class="tg" role="switch" aria-label="${lbl}" aria-checked="${on}" ${attr}></button></div>`;
    const hpHtml = wpL && wpK ? tgRow('🚫 Wärmepumpe sperren', wpK.state === 'on' ? 'Gesperrt: Die PV-Anhebung bleibt aus' : wpL.state === 'on' ? 'Läuft mit Sonnenüberschuss' : 'Aus: Schaltet bei Überschuss automatisch', wpK.state === 'on', 'data-wplock', 'Wärmepumpe sperren') : '';
    // Marstek B2500: pro Akku ein Auswahlfeld "Charging Mode"; hier beide gemeinsam umschalten
    const mmS = Object.values(S2).filter(x => x.entity_id.startsWith('select.') && /marstek/i.test(x.entity_id) && /charging_mode/i.test(x.entity_id) && Array.isArray(x.attributes.options));
    const mmSim = x => /simult/i.test(x), mmFull = x => /fully|erst/i.test(x);
    const mmCur = mmS.map(x => mmFull(x.state) ? 'full' : mmSim(x.state) ? 'simul' : '?');
    const mmV = mmS.length && mmCur.every(v => v === mmCur[0]) ? mmCur[0] : (mmS.length ? 'mix' : '');
    const mmHtml = mmS.length ? `<div class="row" style="margin-top:10px;flex-wrap:wrap"><div class="txt"><b>🔋 Marstek-Speicher</b><div class="s" style="color:var(--muted);font-size:12px">${mmV === 'simul' ? 'Laden und Entladen gleichzeitig' : mmV === 'full' ? 'Erst voll laden, dann entladen' : mmV === 'mix' ? 'Die Akkus sind unterschiedlich eingestellt' : 'unbekannt'}</div></div></div><div class="segs" style="margin-top:6px"><button class="seg${mmV === 'simul' ? ' on' : ''}" data-mmode="simul">Gleichzeitig</button><button class="seg${mmV === 'full' ? ' on' : ''}" data-mmode="full">Erst voll laden</button></div>` : '';
    const zH = this._wbZeit(sel, pv, fast);
    const ztOn = (S0 => S0['input_boolean.zuhause_wallbox_zeit_aktiv'] && S0['input_boolean.zuhause_wallbox_zeit_aktiv'].state === 'on')(this._hass.states);
    const gear = n.num ? `<button class="seg${this._wbNOpen ? ' on' : ''}" data-wbgear aria-label="Netzanteil einstellen" aria-expanded="${!!this._wbNOpen}" style="flex:0 0 46px;padding:0">⚙</button>` : '';
    const html = `<div style="display:flex;gap:8px;align-items:stretch"><div class="segs" style="flex:1">${btn(pv, pvl)}${btn(fast, ztOn ? '⚡ Sofort' : '⚡ Schnell')}</div>${gear}</div>` + (this._wbNOpen && n.num ? `<div class="wbn"><div class="wbn-h"><b>Netzanteil beim PV-Laden</b><span data-k2="wbnv">${n.share} %</span></div>
        <input type="range" min="0" max="100" step="10" value="${n.share}" data-wbn="${n.num.entity_id}" aria-label="Netzanteil">
        <div class="wbn-s"><span>☀ nur Sonne</span><span>50/50</span><span>nur Netz</span></div>
        <p class="sub" style="margin:6px 0 0">Bei ${n.share || 30} % kommen höchstens ${n.share || 30} % des Ladestroms aus dem Netz, der Rest von der Sonne. Reicht die Sonne nicht einmal für die Mindestleistung (4,2 kW), entscheidet wieder der Home Manager.</p>
        ${n.akkuOk ? `<div class="row" style="margin-top:8px"><div class="txt"><b>Speicher darf Auto mitladen</b><div class="s" style="color:var(--muted);font-size:12px">${n.akkuOk.state === 'on' ? 'Der Anker hilft beim Laden mit' : n.pause && n.pause.state === 'on' ? 'Anker pausiert, solange das Auto lädt' : 'Aus: Der Anker bleibt fürs Haus voll'}</div></div><button class="tg" role="switch" aria-label="Speicher darf Auto mitladen" aria-checked="${n.akkuOk.state === 'on'}" data-wbakku></button></div>` : ''}
        <button class="btn" data-wbnclose style="margin-top:8px">Fertig</button></div>` : '') + prHtml + zH + spHtml + hpHtml + mmHtml
      + (locked ? `<p class="sub" style="margin:6px 0 0;color:var(--warn,#c77d18)">Der Drehschalter an der Wallbox steht auf Schnellladen. Stell ihn einmal auf die zweite Stellung, dann kannst du hier umschalten.</p>` : '');
    if (k.dataset.v !== html) { k.dataset.v = html; k.innerHTML = html; }
  }

  // ---------- Systemcheck: findet ausgefallene Apps, Integrationen und Geräte, bevor man es zufällig merkt ----------
  _sysEnts() {
    const c = this._cfg, h = this._hass, out = [];
    const add = (id, age) => { if (id && h.states[id] && !out.some(x => x.id === id)) out.push({ id, age }); };
    add(c.pv, 30); add(c.grid_in, 30); add(c.grid_out, 30); add(c.wallbox, 30); add(c.weather, 0);
    this._marstek().forEach(d => { add(d.soc, 20); add(d.in, 20); });
    const ank = this._ankerEnt(/ladezustand|ladestand|state of charge|soc|akku|batterie/i, /kapazit|capacity|leistung|power/i); if (ank) add(ank.entity_id, 30);
    add(this._presence(), 0);
    return out;
  }
  async _sysCheck() {
    const h = this._hass;
    if (!(h.user && h.user.is_admin) || this._sysBusy || Date.now() - (this._sysT || 0) < 120000) return;
    this._sysBusy = true; this._sysT = Date.now();
    const bad = [], hint = [], now = Date.now();
    const nm = id => (h.states[id] && h.states[id].attributes.friendly_name) || id;
    try {
      // Apps (Add-ons): gestoppt, obwohl sie beim Start laufen sollen; ohne Watchdog als Hinweis
      const ad = await h.callWS({ type: 'supervisor/api', endpoint: '/addons', method: 'get' }).catch(() => null);
      this._sysWd = new Set(); this._sysRen = {};
      for (const a of (ad && Array.isArray(ad.addons) && ad.addons) || []) {
        const info = await h.callWS({ type: 'supervisor/api', endpoint: `/addons/${a.slug}/info`, method: 'get' }).catch(() => null);
        if (!info || info.boot !== 'auto') continue;
        // Sensoren, die eine App liest (z. B. AstraMeter den Shelly), mitprüfen: fehlen sie, stürzt die App beim Start ab
        const fix = {};
        JSON.stringify(info.options || {}).replace(/sensor\.[a-z0-9_]+/g, id => {
          const s = h.states[id];
          if (!s) { const n = this._sysFind(id); if (n) fix[id] = n; bad.push(`App „${a.name}“ liest ${id}, den gibt es nicht${n ? ` <small>(neu: ${n})</small>` : ''}`); }
          else if (/^(unavailable|unknown)$/.test(s.state)) bad.push(`${nm(id)} (für ${a.name}): keine Werte`);
          return id;
        });
        if (Object.keys(fix).length) { (this._sysRen = this._sysRen || {})[a.slug] = { fix, options: info.options, name: a.name }; }
        if (a.state !== 'started') bad.push(`App „${a.name}“ läuft nicht <button data-sysfix="start|${a.slug}">Starten</button>`);
        if (info.watchdog === false) { hint.push(`App „${a.name}“: Watchdog ist aus <small>(bei einem Absturz startet sie nicht neu)</small>`); (this._sysWd = this._sysWd || new Set()).add(a.slug); }
      }
      // Integrationen mit Fehler
      const ce = await h.callWS({ type: 'config_entries/get' }).catch(() => []);
      (Array.isArray(ce) ? ce : []).filter(e => !e.disabled_by && /setup_error|setup_retry|migration_error|failed_unload/.test(e.state))
        .forEach(e => bad.push(`Integration „${e.title}“ hat einen Fehler <small>(Einstellungen → Geräte & Dienste)</small>`));
      // Geräte ohne Werte oder mit veralteten Werten
      this._sysEnts().forEach(({ id, age }) => {
        const s = h.states[id];
        if (/^(unavailable|unknown)$/.test(s.state)) {
          // Prognosen (Forecast.Solar u. ä.) haben öfter kurze Aussetzer: erst nach 2 Stunden ohne Werte warnen
          const kurz = /forecast|prognose/i.test(id + ' ' + nm(id)) && s.last_changed && now - Date.parse(s.last_changed) < 120 * 60000;
          if (!kurz) bad.push(`${nm(id)}: keine Werte`);
        }
        else if (age && s.last_reported && now - Date.parse(s.last_reported) > age * 60000) bad.push(`${nm(id)}: seit ${Math.round((now - Date.parse(s.last_reported)) / 60000)} min keine neuen Werte`);
      });
      // Vom Dashboard angelegte Automationen mit Fehler
      Object.values(h.states).filter(x => x.entity_id.startsWith('automation.') && /^zuhause:/i.test(x.attributes.friendly_name || '') && x.state === 'unavailable')
        .forEach(x => bad.push(`Automation „${x.attributes.friendly_name}“ ist fehlerhaft`));
      // offene Reparaturen von Home Assistant
      const rp = await h.callWS({ type: 'repairs/list_issues' }).catch(() => null);
      const iss = ((rp && Array.isArray(rp.issues) && rp.issues) || []).filter(i => !i.ignored && !i.dismissed_version);
      if (iss.length) hint.push(`${iss.length} offene Reparatur-Hinweise <small>(Einstellungen → Reparaturen: ${[...new Set(iss.map(i => i.domain))].join(', ')})</small>`);
    } finally { this._sysBusy = false; }
    this._sys = { bad, hint };
    this._renderSys();
    this._sysPush();
  }
  async _sysFix(what, arg) {
    const h = this._hass, api = (endpoint, data) => h.callWS({ type: 'supervisor/api', endpoint, method: 'post', ...(data ? { data } : {}) });
    try {
      if (what === 'start') { this._sysMsg = 'Starte …'; this._renderSys(); await api(`/addons/${arg}/start`); this._sysMsg = 'Gestartet.'; }
      if (what === 'ren') {
        // umbenannte Sensoren in den App-Optionen ersetzen, speichern, App neu starten
        const r = this._sysRen[arg];
        let js = JSON.stringify(r.options);
        Object.entries(r.fix).forEach(([o, n]) => { js = js.split(o).join(n); });
        this._sysMsg = 'Korrigiere …'; this._renderSys();
        await api(`/addons/${arg}/options`, { options: JSON.parse(js) });
        await api(`/addons/${arg}/restart`).catch(() => api(`/addons/${arg}/start`));
        this._sysMsg = `${r.name}: Sensoren korrigiert und neu gestartet.`;
      }
      if (what === 'wd') { for (const s of arg.split(',')) await api(`/addons/${s}/options`, { watchdog: true }); this._sysWd = new Set(); this._sysMsg = 'Watchdog ist jetzt überall an.'; }
    } catch (e) { this._sysMsg = 'Hat nicht geklappt: ' + ((e && e.message) || e); }
    this._sysT = 0; this._sysCheck(); this._renderSys();
  }
  // Nachfolger eines umbenannten Sensors finden, z. B. sensor.shellypro3em_x_phase_a_power -> sensor.shellypro3em_x_phase_a_leistung
  _sysFind(id) {
    const h = this._hass, m = id.match(/^sensor\.(.+?)_(phase_[abc]|[abc]|l[123])_(\w+)$/);
    const pw = s => s.attributes.device_class === 'power' || /^k?W$/.test(s.attributes.unit_of_measurement || '');
    const all = Object.values(h.states).filter(s => s.entity_id.startsWith('sensor.') && pw(s));
    if (m) {
      const dev = m[1], ph = m[2].replace(/^phase_/, '');
      const c = all.filter(s => s.entity_id.includes(dev) && new RegExp(`(^|_)(phase_)?${ph}(_|$)`).test(s.entity_id.slice(7 + dev.length)) && !/apparent|schein|factor|faktor/i.test(s.entity_id));
      if (c.length) return c.sort((a, b) => a.entity_id.length - b.entity_id.length)[0].entity_id;
    }
    return null;
  }
  _renderSys() {
    const k = this._k.sys; if (!k || !this._sys) return;
    const { bad, hint } = this._sys, all = [...bad, ...hint], wd = [...(this._sysWd || [])];
    if (!all.length || this._sysHide === all.join('|')) { k.hidden = true; return; }
    k.hidden = false; k.classList.toggle('ok', !bad.length);
    k.innerHTML = `<b>⚠ Systemcheck: ${bad.length ? `${bad.length} Problem${bad.length > 1 ? 'e' : ''}` : 'nur Hinweise'}</b><button data-syshide>ausblenden</button><ul>${all.map(x => `<li>${x}</li>`).join('')}</ul>${Object.entries(this._sysRen || {}).map(([slug, r]) => `<button data-sysfix="ren|${slug}" style="margin:6px 8px 0 0">${r.name}: Sensoren korrigieren und neu starten</button>`).join('')}${wd.length ? `<button data-sysfix="wd|${wd.join(',')}" style="margin:6px 0 0">Watchdog bei allen einschalten</button>` : ''}${this._sysMsg ? `<div style="margin-top:6px;font-size:12px">${this._sysMsg}</div>` : ''}`;
  }
  // Push aufs Handy, wenn wichtige Geräte 15 Minuten keine Werte liefern (läuft in Home Assistant, auch ohne offenes Dashboard)
  _sysPush() {
    const h = this._hass, L = this._lay;
    if (this._sysPushT || !L || L.sysV === 2) return;
    const phones = Object.keys((h.services && h.services.notify) || {}).filter(x => x.startsWith('mobile_app_'));
    const all = this._sysEnts().map(x => x.id);
    // Wetter-/Prognose-Daten fallen öfter kurz aus: erst nach 2 Stunden melden
    const slow = all.filter(id => /forecast|prognose|weather\./i.test(id + ' ' + ((h.states[id] && h.states[id].attributes.friendly_name) || '')));
    const ids = all.filter(id => !slow.includes(id));
    if (!phones.length || !all.length) return;
    this._sysPushT = true;
    h.callApi('POST', 'config/automation/config/zuhause_systemwarnung', {
      id: 'zuhause_systemwarnung', alias: 'Zuhause: Systemwarnung', description: 'Angelegt vom Zuhause-Dashboard. Meldet, wenn wichtige Geräte 15 Minuten keine Werte liefern.', mode: 'queued',
      triggers: [...(ids.length ? [{ trigger: 'state', entity_id: ids, to: ['unavailable', 'unknown'], for: { minutes: 15 } }] : []), ...(slow.length ? [{ trigger: 'state', entity_id: slow, to: ['unavailable', 'unknown'], for: { minutes: 120 } }] : [])],
      actions: phones.map(p => ({ action: 'notify.' + p, data: { title: 'Zuhause: Systemwarnung', message: '{{ trigger.to_state.name }} liefert seit ' + (slow.length ? '{{ 120 if trigger.entity_id in ' + JSON.stringify(slow) + ' else 15 }}' : '15') + ' Minuten keine Werte.' } })),
    }).then(() => { L.sysV = 2; this._save(); }).catch(() => { this._sysPushT = false; });
  }

  // WiZ-Birnen ohne Bereich einmalig dem Bereich „Flur unten“ zuordnen (Bereich wird bei Bedarf angelegt)
  async _wizArea() {
    const h = this._hass;
    if (this._wizT || !(h.user && h.user.is_admin) || !h.entities || !h.devices || !h.areas) return;
    this._wizT = true;
    const devs = [...new Set(Object.values(h.entities).filter(e => e.platform === 'wiz' && e.entity_id.startsWith('light.') && e.device_id && !e.area_id
      && h.devices[e.device_id] && !h.devices[e.device_id].area_id).map(e => e.device_id))];
    if (!devs.length) return;
    try {
      let a = Object.values(h.areas).find(x => (x.name || '').trim().toLowerCase() === 'flur unten');
      if (!a) a = await h.callWS({ type: 'config/area_registry/create', name: 'Flur unten', icon: 'mdi:stairs-down' });
      for (const d of devs) await h.callWS({ type: 'config/device_registry/update', device_id: d, area_id: a.area_id });
    } catch (e) { console.warn('zuhause-card: WiZ-Bereich', e); }
  }

  _update() {
    const c = this._cfg, k = this._k;
    this._sysCheck();
    this._wizArea();
    this._boostSetup();
    const h = new Date().getHours();
    this._set('greet', h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend');
    this._renderNotif();
    this._renderVac();
    this._renderApp();
    this._renderPrn();
    this._renderStor();
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
    // Ladestand jedes Marstek-Akkus einzeln
    const mSocs = mb ? this._marstek().map(d => this._n(d.soc)).filter(v => v !== null).map(v => Math.round(v)) : [];
    // wie beim Anker-Speicher: lädt / entlädt / Ruhe (Akku-Leistung = Modul-Eingang minus Ausgang)
    const mBat = mb ? this._batP(mb) : null, mW = v => `${Math.round(Math.abs(v) * 1000)} W`;
    this._set('sbk', mSoc === null ? (mb ? 'noch nicht verbunden' : '') : mBat === null ? '' : mBat > 0.01 ? `↓ lädt ${mW(mBat)}` : mBat < -0.01 ? `↑ entlädt ${mW(mBat)}` : 'Ruhe');
    this._set('sbk3', mSoc === null ? '' : `Akku ${mSocs.join(' · ')} %`);
    // die einzelnen Module (je Marstek zwei Eingänge)
    const mods = mb ? this._marstek().flatMap(d => [d.i1, d.i2]).filter(Boolean).map(id => this._n(id)).filter(v => v !== null) : [];
    this._set('sbk2', mods.length ? mods.map(v => Math.round(v)).join(' · ') + ' W' : '');
    k.dbk.classList.toggle('idle', !(mIn > 0.005));
    this._flow('fbk', mIn > 0.005);
    // Marstek gibt ab: Leitung von den Marsteks zum Verteiler (im Bild fehlte das Kabel, deshalb als .cab gezeichnet)
    const mOut = this._marstek().reduce((a, d) => a + (this._kw(d.out) || 0), 0);
    this._flow('fmk', mOut > 0.005);
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
    this._flow('fpv', (pv0 || 0) > 0.05);
    this._flow('fwb', wb > 0.05);
    this._flow('fhouse', house > 0.05);
    k.dpv.classList.toggle('idle', !((pv0 || 0) > 0.05));
    k.dbat.classList.toggle('idle', Math.abs(aP) < 0.02);
    this._flow('fbat', Math.abs(aP) > 0.02, aP > 0); // lädt: vom Haus in den Speicher
    this._flow('fgrid', Math.abs(grid) > 0.02, grid < 0); // Einspeisung: vom Haus ins Netz
    // Wärmepumpe (Wolf): Außengerät neben dem Haus; PV-Anhebung an = Sonne fließt in die Wärmepumpe
    {
      const S = this._hass.states, hpId = c.heatpump || Object.keys(S).find(id => id.startsWith('light.') && /w(ä|ae|a)rmepumpe/i.test(id) && /pv/i.test(id));
      const hp = hpId && S[hpId], lkId = c.heatpump_lock || 'input_boolean.warmepumpe_pv_gesperrt', lk = S[lkId];
      if (k.wp) k.wp.hidden = !hp;
      if (k.wpchip) {
        k.wpchip.hidden = !hp || !(lk && lk.state === 'on') && !(hp && hp.state === 'on');
        const locked = !!lk && lk.state === 'on', on = !!hp && hp.state === 'on';
        k.wpchip.className = 'wpchip' + (locked ? ' lock' : on ? ' on' : '');
        this._set('wpchip', locked ? '🔒 gesperrt' : on ? '☀ PV-Anhebung' : '');
      }
      this._flow('fwp', !!hp && hp.state === 'on' && !(lk && lk.state === 'on'));
    }

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
