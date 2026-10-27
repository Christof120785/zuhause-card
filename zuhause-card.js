// Zuhause-Karte: komplette Startseite als eine Karte für Home Assistant.
// Alle Geräte stehen in der Dashboard-Konfiguration (type: custom:zuhause-card), nicht in dieser Datei.
// Leere Einträge sind vorbereitet und zeigen "noch nicht verbunden".
const VERSION = '1.3.0';

const DEFAULTS = {
  name: '',
  images: '/local/dashboard/',
  weather: '', pv: '', grid_in: '', grid_out: '',
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
};
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[k] || ''}</svg>`;
const de = (v, d = 1) => Number(v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const WX = { 'clear-night': 'Klar', cloudy: 'Bewölkt', fog: 'Nebel', hail: 'Hagel', lightning: 'Gewitter', 'lightning-rainy': 'Gewitter', partlycloudy: 'Teils bewölkt', pouring: 'Starkregen', rainy: 'Regen', snowy: 'Schnee', 'snowy-rainy': 'Schneeregen', sunny: 'Sonnig', windy: 'Windig', 'windy-variant': 'Windig', exceptional: 'Unwetter' };
const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function wxIcon(c) {
  const sun = '<circle cx="16" cy="16" r="6" fill="var(--sun)"/>';
  const cl = '<path d="M9 25h14a5 5 0 0 0 0-10 7 7 0 0 0-13.5 2A4 4 0 0 0 9 25z" fill="var(--faint)"/>';
  const rn = '<g stroke="var(--grid)" stroke-width="2" stroke-linecap="round"><path d="M12 28l-1 3M17 28l-1 3M22 28l-1 3"/></g>';
  let g = cl;
  if (c === 'sunny' || c === 'clear-night') g = sun;
  else if (c === 'partlycloudy') g = '<circle cx="12" cy="12" r="5" fill="var(--sun)"/>' + cl;
  else if (/rain|pouring|lightning|hail|snow/.test(c || '')) g = cl + rn;
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
  .hero{grid-column:span 12}.energy{grid-column:span 5}.store{grid-column:span 3}.wb{grid-column:span 4}
  .sec{grid-column:span 3}.clima{grid-column:span 5}.sw{grid-column:span 4}
  .cams{grid-column:span 6}.wx{grid-column:span 3}.hints{grid-column:span 3}.hist{grid-column:span 12}}
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
/* energy */
.scene{width:100%;height:auto;display:block;margin:0 0 6px}
.dash{stroke-dasharray:4 6;animation:fl 1.4s linear infinite}
.dash.idle{animation:none;opacity:.3}
.dash.rev{animation-direction:reverse}
@keyframes fl{to{stroke-dashoffset:-20}}
@media(prefers-reduced-motion:reduce){.dash{animation:none}}
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
.wbt{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
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
.row .txt[data-more]{cursor:pointer}
.scn{border-top:1px solid var(--line);margin-top:6px;padding-top:8px}
.scl{font-size:11px;color:var(--muted);margin-bottom:6px}
.scw{display:flex;flex-wrap:wrap;gap:6px}
.scb{all:unset;cursor:pointer;font-size:12px;font-weight:600;padding:6px 11px;border-radius:99px;background:var(--sun-soft);color:var(--sun)}
.scb:focus-visible{outline:2px solid var(--grid);outline-offset:2px}
.swg{display:grid;grid-template-columns:1fr 1fr;column-gap:14px}
.swg .row:nth-child(2){border-top:0}
/* cameras */
.camg{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
@media(min-width:1100px){.camg{grid-template-columns:repeat(4,minmax(0,1fr))}.cam .meta{flex-direction:column;align-items:flex-start;gap:0}}
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
.fc svg{width:24px;height:24px;display:block;margin:3px auto}
/* history */
.chart svg{width:100%;height:auto;display:block}
.chart text{font-size:10px;fill:var(--faint);font-family:var(--body)}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-top:4px}
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
    if (!this._built) this._build();
    this.classList.toggle('dark', !!(hass.themes && hass.themes.darkMode));
    this._update();
    if (!this._fcSub && hass.connection && this._cfg.weather && hass.states[this._cfg.weather]) this._subForecast();
    if (!this._histT || Date.now() - this._histT > 15 * 60 * 1000) { this._histT = Date.now(); this._loadHistory(); }
  }

  _s(id) { return id && this._hass.states[id]; }
  _n(id) { const s = this._s(id); if (!s) return null; const v = parseFloat(s.state); return isNaN(v) ? null : v; }
  // Leistung immer in kW, egal ob der Sensor W oder kW liefert
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
    const rooms = c.rooms.map((r, i) => `<div class="room" data-more="${r.t}"><div class="ico">${svg(r.icon)}</div><div class="l">${r.name}</div>
      <div class="v num"><span data-k="rt${i}">–</span><small> °C</small></div><div class="h num" data-k="rh${i}"></div></div>`).join('');
    const sws = c.switches.map((s, i) => `<div class="row"><div class="ico">${svg(s.icon)}</div><div class="txt" data-more="${s.entity}"><b id="swl${i}">${s.name}</b><span data-k="sws${i}"></span>${s.entity.startsWith('light.') ? `<input type="range" class="dim" min="1" max="100" step="1" aria-label="${s.name} dimmen" data-dim="${s.entity}" data-k="swd${i}" hidden>` : ''}</div>
      <button class="tg" role="switch" aria-labelledby="swl${i}" aria-checked="false" data-toggle="${s.entity}" data-k="swt${i}"></button></div>`).join('');
    const cams = c.cameras.map((m, i) => `<div class="cam" data-cam="${i}"><div class="view" data-k="cv${i}">${svg('cam')}</div>
      <div class="meta"><b>${m.name}</b><span data-k="cs${i}">${m.brand}</span></div></div>`).join('');
    const contacts = c.contacts.map((k, i) => `<div class="row"><div class="txt" data-more="${k.entity}"><b>${k.name}</b></div><span class="pill" data-k="ct${i}"></span></div>`).join('');

    root.innerHTML = `<style>${CSS}</style><div class="wrap"><div class="grid">
      <section class="card hero"><span class="ver">v${VERSION}</span>
        <div><h1><span data-k="greet">Hallo</span>,<br><em>${c.name}.</em></h1>
          <p>Dein Zuhause. Ein Blick. Alles Wichtige.</p>
          <div class="chips"><span class="chip" data-k="chOpen"></span><span class="chip" data-k="chLights"></span></div></div>
        <div class="wxn"><div class="t num"><span data-k="wt">–</span><small>°C</small></div><div data-k="wc"></div><div class="num" data-k="wd"></div></div>
      </section>

      <section class="card energy">
        <div class="eyebrow"><span>Energie</span><span>● Live</span></div>
        <h2>Dein Energiefluss</h2><p class="sub" data-k="esub"></p>
        <svg class="scene" viewBox="0 0 400 190" role="img" aria-label="Energiefluss">
          <g fill="none" stroke-width="2" stroke-linecap="round">
            <path data-k="lpv" class="dash" d="M70 58 C110 58 120 80 130 92" stroke="var(--sun)"/>
            <path data-k="lgrid" class="dash" d="M288 112 C300 100 312 76 322 66" stroke="var(--grid)"/>
            <path data-k="lbat" class="dash" d="M130 150 C115 160 105 158 100 154" stroke="var(--batt)"/>
            <path data-k="lwb" class="dash" d="M288 150 C300 158 306 158 314 154" stroke="var(--house)"/>
          </g>
          <circle cx="55" cy="55" r="13" fill="var(--sun)"/>
          <g stroke="var(--sun)" stroke-width="2" stroke-linecap="round"><path d="M55 32v6M55 72v6M32 55h6M72 55h6M39 39l4 4M67 67l4 4M39 71l4-4M67 43l4-4"/></g>
          <text x="55" y="96" text-anchor="middle" font-size="10" fill="var(--muted)">Photovoltaik</text>
          <defs><clipPath id="hc"><rect x="128" y="62" width="160" height="104" rx="14"/></clipPath></defs>
          <image href="${c.images}haus.webp" x="128" y="62" width="160" height="104" preserveAspectRatio="xMidYMid slice" clip-path="url(#hc)"/>
          <image href="${c.images}anker.webp" x="34" y="132" width="66" height="39"/>
          <text x="67" y="182" text-anchor="middle" font-size="10" fill="var(--muted)">Speicher</text>
          <rect x="320" y="38" width="32" height="32" rx="9" fill="var(--grid-soft)"/>
          <path d="M336 44 l-7 20 M336 44 l7 20 M330 52 h12 M328 58 h16" stroke="var(--grid)" stroke-width="1.6" fill="none"/>
          <text x="336" y="86" text-anchor="middle" font-size="10" fill="var(--muted)">Stromnetz</text>
          <image href="${c.images}wallbox.webp" x="314" y="130" width="40" height="40"/>
          <text x="334" y="182" text-anchor="middle" font-size="10" fill="var(--muted)">Wallbox</text>
        </svg>
        <div class="tiles">
          <div class="tile t-sun" data-more="${c.pv}"><div class="l">Photovoltaik</div><div class="v num"><span data-k="vpv">–</span><small>kW</small></div><div class="s">SMA</div></div>
          <div class="tile t-house"><div class="l">Hausverbrauch</div><div class="v num"><span data-k="vhouse">–</span><small>kW</small></div><div class="s">ohne Wallbox</div></div>
          <div class="tile t-grid" data-more="${c.grid_in}"><div class="l">Netz</div><div class="v num"><span data-k="vgrid">–</span><small>kW</small></div><div class="s" data-k="sgrid"></div></div>
          <div class="tile t-batt"><div class="l">Speicher</div><div class="v num"><span data-k="vbat">–</span><small>%</small></div><div class="s" data-k="sbat"></div></div>
        </div>
        <div class="foot"><span>Heute erzeugt <b class="num" data-k="today">–</b></span><span>Autarkie heute <b class="num" data-k="aut">–</b></span></div>
      </section>

      <section class="card store">
        <div class="eyebrow"><span>Speicher</span><span>Anker · Marstek</span></div>
        <h2>Deine Batterien</h2><p class="sub" data-k="bsub"></p>
        <div class="pic batpic">${firstPic ? `<img src="${c.images}${firstPic.img}" alt="${firstPic.name}">` : ''}</div>
        ${bats}
      </section>

      <section class="card wb">
        <div class="eyebrow"><span>Wallbox</span><span>SMA EV Charger</span></div>
        <h2 data-k="wbh">Wallbox</h2><p class="sub" data-k="wbs"></p>
        <div class="wbpics"><div class="pic carpic"><img src="${c.images}auto.webp" alt="Auto"></div><div class="pic wbpic"><img src="${c.images}wallbox.webp" alt="Wallbox"></div></div>
        <div class="foot" style="margin:0"><span>Akku Auto</span><span class="num" data-k="csoc">–</span></div>
        <div class="prog"><i data-k="cbar" style="width:0;background:var(--grid)"></i></div>
        <div class="wbt">
          <div class="tile" data-more="${c.wallbox}"><div class="l">Ladeleistung</div><div class="v num"><span data-k="wbp">–</span><small>kW</small></div></div>
          <div class="tile"><div class="l">Laden</div><div class="v" style="font-size:15px;margin-top:6px"><button class="tg" role="switch" aria-label="Laden freigeben" aria-checked="false" data-toggle="${c.wallbox_release}" data-k="wbr"></button></div></div>
          <div class="tile"><div class="l">Heute geladen</div><div class="v num"><span data-k="wbtoday">–</span><small>kWh</small></div></div>
        </div>
      </section>

      <section class="card sec">
        <div class="eyebrow"><span>Sicherheit</span><span>Homematic</span></div>
        <div class="center"><div class="shield" data-k="shield">${svg('shield')}</div>
          <h2 data-k="sech">Alles im Blick</h2><p class="sub" data-k="secs"></p></div>
        <div class="stats two"><div><b class="num" data-k="nopen">–</b><span>offen</span></div><div><b class="num" data-k="nclosed">–</b><span>geschlossen</span></div></div>
        ${contacts}
      </section>

      <section class="card clima">
        <div class="eyebrow"><span>Raumklima</span><span>Homematic-Thermostate</span></div>
        <h2>Hier fühlst du dich zu Hause</h2><p class="sub">Temperatur und Luftfeuchtigkeit</p>
        <div class="rooms">${rooms}</div>
      </section>

      <section class="card sw">
        <div class="eyebrow"><span>Schnellzugriff</span><span>Hue · Homematic</span></div>
        <h2>Einfach schalten</h2><p class="sub">Deine häufig genutzten Geräte</p>
        <div class="swg">${sws}</div>
        <div data-k="scenes"></div>
      </section>

      <section class="card cams">
        <div class="eyebrow"><span>Kameras</span><span>${[...new Set(c.cameras.map(m => m.brand).filter(Boolean))].join(' · ')}</span></div>
        <h2>Rund ums Haus</h2><p class="sub">Antippen öffnet das Livebild</p>
        <div class="camg">${cams}</div>
      </section>

      <section class="card wx">
        <div class="eyebrow"><span>Wetter</span><span>Vorhersage</span></div>
        <h2>Die nächsten Tage</h2><p class="sub" data-k="wxs"></p>
        <div class="fc" data-k="fc"></div>
      </section>

      <section class="card hints">
        <div class="eyebrow"><span>Hinweise</span><span>automatisch</span></div>
        <h2>Das solltest du wissen</h2><p class="sub">Nur was gerade Aufmerksamkeit braucht</p>
        <div data-k="hints"></div>
      </section>

      <section class="card hist chart">
        <div class="eyebrow"><span>Energie</span><span>letzte 7 Tage</span></div>
        <h2>Erzeugung und Verbrauch</h2><p class="sub">kWh pro Tag, aus deiner Energie-Konfiguration</p>
        <div data-k="hist"></div>
        <div class="legend"><span style="--c:var(--sun)">PV-Ertrag</span><span style="--c:var(--grid)">Netzbezug</span><span style="--c:var(--house)">Wallbox</span></div>
      </section>
    </div></div>`;

    this._k = {};
    root.querySelectorAll('[data-k]').forEach(e => { this._k[e.dataset.k] = e; });
    root.addEventListener('input', e => { const d = e.target.closest('[data-dim]'); if (d) d.dataset.drag = '1'; });
    root.addEventListener('change', e => {
      const d = e.target.closest('[data-dim]'); if (!d) return;
      delete d.dataset.drag;
      this._hass.callService('light', 'turn_on', { entity_id: d.dataset.dim, brightness_pct: +d.value });
    });
    root.addEventListener('click', e => {
      if (e.target.closest('[data-dim]')) return;
      const t = e.target.closest('[data-toggle]');
      if (t) {
        const id = t.dataset.toggle;
        if (id && this._s(id)) this._hass.callService('homeassistant', 'toggle', { entity_id: id });
        return;
      }
      const sc = e.target.closest('[data-scene]');
      if (sc) { this._hass.callService('scene', 'turn_on', { entity_id: sc.dataset.scene }); return; }
      const cam = e.target.closest('[data-cam]');
      if (cam) {
        const id = this._camId(this._cfg.cameras[+cam.dataset.cam]);
        if (id) this._more(id);
        return;
      }
      const m = e.target.closest('[data-more]');
      if (m && m.dataset.more) this._more(m.dataset.more);
    });
    this._built = true;
  }

  // Kamera-Entität: feste ID, Suche per Stichwort (find/Name) oder freie Kamera der Marke
  _camId(m) { return this._camMap()[this._cfg.cameras.indexOf(m)] || null; }

  _camMap() {
    const cams = this._cfg.cameras, st = this._hass.states;
    const all = Object.keys(st).filter(id => id.startsWith('camera.')).sort();
    const map = [], keys = [];
    cams.forEach((m, i) => {
      if (m.entity && st[m.entity]) { map[i] = m.entity; return; }
      const f = this._key(m);
      const ids = f ? all.filter(id => id.includes(f)) : [];
      const id = ids.find(x => !/clear|klar|snapshot/.test(x)) || ids[0];
      if (id) { map[i] = id; keys.push(f); }
    });
    // übrige Einträge: noch freie Kameras, deren ID/Name/Quelle die Marke enthält
    const used = new Set(map.filter(Boolean));
    cams.forEach((m, i) => {
      if (map[i] || !m.brand) return;
      const b = m.brand.toLowerCase();
      const id = all.find(x => {
        if (used.has(x) || keys.some(k => x.includes(k))) return false;
        const a = st[x].attributes;
        const txt = (x + ' ' + (a.friendly_name || '') + ' ' + (a.attribution || '')).toLowerCase();
        return txt.includes(b) || (b === 'blink' && txt.includes('immedia'));
      });
      if (id) { map[i] = id; used.add(id); this._camAuto = this._camAuto || {}; this._camAuto[i] = true; }
    });
    // falls die Marke nirgends steht: restliche freie Kameras der Reihe nach
    cams.forEach((m, i) => {
      if (map[i] || !m.brand) return;
      const id = all.find(x => !used.has(x) && !keys.some(k => x.includes(k)));
      if (id) { map[i] = id; used.add(id); this._camAuto = this._camAuto || {}; this._camAuto[i] = true; }
    });
    return map;
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

  _more(entityId) {
    const ev = new Event('hass-more-info', { bubbles: true, composed: true });
    ev.detail = { entityId };
    this.dispatchEvent(ev);
  }
  _set(k, v) { const e = this._k[k]; if (e && e.textContent !== String(v)) e.textContent = v; }

  _update() {
    const c = this._cfg, k = this._k;
    const h = new Date().getHours();
    this._set('greet', h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend');

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
    const pv = this._kw(c.pv), gin = this._kw(c.grid_in) || 0, gout = this._kw(c.grid_out) || 0, wb = this._kw(c.wallbox) || 0;
    const grid = gin - gout;
    const batP = c.batteries.reduce((a, b) => a + (this._kw(b.power) || 0), 0); // positiv = lädt
    const house = Math.max(0, (pv || 0) + grid - wb - batP);
    this._set('vpv', pv === null ? '–' : de(pv, 2));
    this._set('vhouse', de(house, 2));
    this._set('vgrid', de(grid, 2));
    this._set('sgrid', grid < -0.01 ? 'Einspeisung' : grid > 0.01 ? 'Bezug' : 'ausgeglichen');
    this._set('esub', (pv || 0) > 0.05
      ? (grid < 0 ? 'Die Sonne liefert mehr, als du gerade brauchst.' : 'Die Sonne liefert gerade Energie.')
      : 'Gerade kommt kein Sonnenstrom, du beziehst aus dem Netz.');
    k.lpv.classList.toggle('idle', !((pv || 0) > 0.05));
    k.lgrid.classList.toggle('idle', Math.abs(grid) < 0.02);
    k.lgrid.classList.toggle('rev', grid > 0); // Bezug: vom Netz zum Haus
    k.lbat.classList.toggle('rev', batP < 0); // Entladen: vom Speicher zum Haus
    k.lwb.classList.toggle('idle', wb < 0.05);
    k.lbat.classList.toggle('idle', Math.abs(batP) < 0.02);

    // Batterien
    const socs = [];
    c.batteries.forEach((b, i) => {
      const soc = this._n(b.soc), p = this._kw(b.power);
      if (soc === null) {
        k['bsoc' + i].className = 'pill off'; this._set('bsoc' + i, 'noch nicht verbunden');
        k['bbar' + i].style.width = '0'; this._set('bsub' + i, 'wird angezeigt, sobald das Gerät in Home Assistant ist');
      } else {
        socs.push(soc);
        k['bsoc' + i].className = 'num'; this._set('bsoc' + i, `${Math.round(soc)} %`);
        k['bbar' + i].style.width = `${Math.max(0, Math.min(100, soc))}%`;
        this._set('bsub' + i, p === null ? '' : p > 0.02 ? `lädt ${de(p, 1)} kW` : p < -0.02 ? `entlädt ${de(-p, 1)} kW` : 'Ruhe');
      }
    });
    this._set('vbat', socs.length ? Math.round(socs.reduce((a, b) => a + b, 0) / socs.length) : '–');
    this._set('sbat', socs.length ? 'Anker + Marstek' : 'noch nicht verbunden');
    this._set('bsub', socs.length ? 'Ladestand deiner Speicher' : 'Vorbereitet, Anbindung folgt');

    // Wallbox und Auto
    const soc = this._n(c.car_soc);
    this._set('csoc', soc === null ? '–' : `${Math.round(soc)} %`);
    k.cbar.style.width = soc === null ? '0' : `${soc}%`;
    this._set('wbp', de(wb, 1));
    this._set('wbh', wb > 0.05 ? 'Auto lädt' : 'Wallbox bereit');
    this._set('wbs', wb > 0.05 ? ((pv || 0) > wb ? 'Mit Sonnenstrom' : 'Mit Netz- und Sonnenstrom') : 'Gerade kein Ladevorgang');
    const rel = this._s(c.wallbox_release);
    k.wbr.setAttribute('aria-checked', rel && rel.state === 'on' ? 'true' : 'false');

    // Sicherheit
    const open = c.contacts.filter(x => { const s = this._s(x.entity); return s && s.state === 'on'; });
    c.contacts.forEach((x, i) => {
      const s = this._s(x.entity), e = k['ct' + i];
      if (!s) { e.className = 'pill off'; this._set('ct' + i, 'nicht gefunden'); }
      else if (s.state === 'unavailable' || s.state === 'unknown') { e.className = 'pill warn'; this._set('ct' + i, 'nicht erreichbar'); }
      else if (s.state === 'on') { e.className = 'pill warn'; this._set('ct' + i, 'offen'); }
      else { e.className = 'pill off'; this._set('ct' + i, 'zu'); }
    });
    const lost = c.contacts.filter(x => { const s = this._s(x.entity); return s && (s.state === 'unavailable' || s.state === 'unknown'); });
    const known = c.contacts.filter(x => this._s(x.entity)).length - lost.length;
    this._set('nopen', open.length);
    this._set('nclosed', known - open.length);
    k.shield.classList.toggle('alert', open.length > 0 || lost.length > 0);
    this._set('sech', open.length ? `${open.length} offen` : lost.length ? `${lost.length} ohne Verbindung` : 'Alles im Blick');
    this._set('secs', open.length ? 'Bitte prüfen, ob das so gewollt ist.' : lost.length ? 'Ein Kontakt meldet sich nicht, vielleicht ist die Batterie leer.' : 'Alle Türen und Fenster sind zu.');

    // Kopfzeile
    const lightsOn = Object.keys(this._hass.states).filter(id => id.startsWith('light.') && this._hass.states[id].state === 'on').length;
    this._set('chOpen', open.length === 1 ? '1 Tür/Fenster offen' : `${open.length} Türen/Fenster offen`);
    this._set('chLights', lightsOn === 1 ? '1 Licht an' : `${lightsOn} Lichter an`);

    // Räume
    c.rooms.forEach((r, i) => {
      const t = this._n(r.t), hu = this._n(r.h);
      this._set('rt' + i, t === null ? '–' : de(t, 1));
      this._set('rh' + i, hu === null ? '' : `${Math.round(hu)} % Luftfeuchte`);
    });

    // Hue-Szenen je Raum, automatisch gefunden
    const rooms = (c.scene_rooms || []).map(room => [room, Object.values(this._hass.states)
      .filter(s => s.entity_id.startsWith('scene.') && (s.attributes.group_name || '').toLowerCase() === room.toLowerCase())
      .sort((a, b) => (a.attributes.name || a.entity_id).localeCompare(b.attributes.name || b.entity_id))]).filter(r => r[1].length);
    const sk = rooms.map(r => r[1].map(s => s.entity_id).join()).join('|');
    if (k.scenes.dataset.v !== sk) {
      k.scenes.dataset.v = sk;
      k.scenes.innerHTML = rooms.map(([room, list]) => `<div class="scn"><div class="scl">Szenen ${room}</div><div class="scw">${list.map(s =>
        `<button class="scb" type="button" data-scene="${s.entity_id}">${s.attributes.name || s.attributes.friendly_name}</button>`).join('')}</div></div>`).join('');
    }

    // Schalter
    c.switches.forEach((s, i) => {
      const st = this._s(s.entity);
      k['swt' + i].setAttribute('aria-checked', st && st.state === 'on' ? 'true' : 'false');
      const d = k['swd' + i];
      const dimmable = st && st.entity_id.startsWith('light.') && (st.attributes.supported_color_modes || []).some(m => m !== 'onoff');
      const pct = st && st.attributes.brightness != null ? Math.round(st.attributes.brightness / 2.55) : null;
      if (d) {
        d.hidden = !(dimmable && st.state === 'on');
        if (pct !== null && !d.dataset.drag) d.value = pct;
      }
      this._set('sws' + i, !st ? 'nicht gefunden' : st.state === 'on' ? (pct !== null ? `An · ${pct} %` : 'Eingeschaltet') : st.state === 'off' ? 'Ausgeschaltet' : 'nicht erreichbar');
    });

    // Kameras
    c.cameras.forEach((m, i) => {
      const s = this._s(this._camId(m)), v = k['cv' + i];
      if (s && s.attributes.entity_picture) {
        const src = s.attributes.entity_picture;
        if (v.dataset.src !== src) { v.dataset.src = src; v.innerHTML = `<img src="${src}" alt="${m.name}"><span class="live">LIVE</span>`; }
        this._set('cs' + i, this._camAuto && this._camAuto[i] ? `${m.brand} · ${s.attributes.friendly_name}` : m.brand);
      } else {
        if (v.dataset.src !== '') { v.dataset.src = ''; v.innerHTML = svg('cam'); }
        this._set('cs' + i, m.app ? `${m.brand} · nur App` : `${m.brand} · folgt`);
      }
    });

    // Hinweise
    const hints = [];
    open.forEach(x => {
      const s = this._s(x.entity);
      const min = Math.round((Date.now() - new Date(s.last_changed)) / 60000);
      hints.push([`${x.name} offen`, min < 60 ? `seit ${min} min` : `seit ${Math.round(min / 60)} h`, 'warn']);
    });
    c.cameras.forEach(m => { if (this._ringing(m)) hints.push([`Es klingelt: ${m.name}`, 'jetzt', 'warn']); });
    lost.forEach(x => hints.push([`${x.name} meldet sich nicht`, 'Batterie?', 'warn']));
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
        ? hints.slice(0, 6).map(([a, b, cl]) => `<div class="row"><div class="txt"><b>${a}</b></div><span class="pill ${cl}">${b}</span></div>`).join('')
        : '<div class="row"><div class="txt"><b>Alles in Ordnung</b><span>Gerade gibt es nichts zu tun.</span></div></div>';
    }
  }

  _subForecast() {
    this._fcSub = true;
    this._hass.connection.subscribeMessage(msg => {
      const fc = (msg.forecast || []).slice(0, 5);
      const k = this._k.fc; if (!k) return;
      k.innerHTML = fc.map(d => {
        const dt = new Date(d.datetime);
        return `<div>${DAYS[dt.getDay()]}${wxIcon(d.condition)}<b class="num">${Math.round(d.temperature)}°</b><span class="num" style="color:var(--muted)">${d.templow != null ? Math.round(d.templow) + '°' : ''}</span></div>`;
      }).join('');
      if (fc[1]) this._set('wxs', `Morgen ${WX[fc[1].condition] || ''}, bis ${Math.round(fc[1].temperature)} °C`);
    }, { type: 'weather/subscribe_forecast', forecast_type: 'daily', entity_id: this._cfg.weather }).catch(() => { this._fcSub = false; });
  }

  async _loadHistory() {
    try {
      const prefs = await this._hass.callWS({ type: 'energy/get_prefs' });
      let pvId = null, inIds = [], outIds = [], wbId = null;
      (prefs.energy_sources || []).forEach(s => {
        if (s.type === 'solar' && !pvId) pvId = s.stat_energy_from;
        if (s.type === 'grid') {
          (s.flow_from || []).forEach(f => inIds.push(f.stat_energy_from));
          (s.flow_to || []).forEach(f => outIds.push(f.stat_energy_to));
          if (s.stat_energy_from) inIds.push(s.stat_energy_from);
          if (s.stat_energy_to) outIds.push(s.stat_energy_to);
        }
      });
      (prefs.device_consumption || []).forEach(d => { if (/ladestation|smaev|wallbox/i.test(d.stat_consumption)) wbId = d.stat_consumption; });
      const ids = [pvId, ...inIds, ...outIds, wbId].filter(Boolean);
      if (!ids.length) { this._k.hist.innerHTML = '<p class="sub">Keine Energie-Konfiguration gefunden.</p>'; return; }
      const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6);
      const stats = await this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: start.toISOString(), period: 'day', statistic_ids: ids, types: ['change'], units: { energy: 'kWh' } });
      const days = [];
      for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
      const series = id => days.map(d => {
        const row = (stats[id] || []).find(r => new Date(r.start).toDateString() === d.toDateString());
        return row && row.change ? Math.max(0, row.change) : 0;
      });
      const sum = arr => arr.reduce((a, b) => a.map((x, i) => x + b[i]), days.map(() => 0));
      const pv = pvId ? series(pvId) : days.map(() => 0);
      const gin = sum(inIds.map(series)), gout = sum(outIds.map(series));
      const wb = wbId ? series(wbId) : days.map(() => 0);
      const t = 6;
      this._set('today', `${de(pv[t], 1)} kWh`);
      const use = pv[t] + gin[t] - gout[t];
      this._set('aut', use > 0 ? `${Math.round(Math.max(0, Math.min(1, 1 - gin[t] / use)) * 100)} %` : '–');
      this._set('wbtoday', de(wb[t], 1));
      this._drawHist(days, [[pv, 'var(--sun)'], [gin, 'var(--grid)'], [wb, 'var(--house)']]);
    } catch (e) {
      this._k.hist.innerHTML = '<p class="sub">Verlauf konnte nicht geladen werden.</p>';
    }
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
