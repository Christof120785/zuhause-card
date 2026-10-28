#!/bin/sh
# Erzeugt zuhause-card.js (die Datei, die HACS lädt) aus card.js.
# zuhause-card.js holt beim Laden immer die neueste card.js von GitHub,
# ohne Browser-Zwischenspeicher. Ohne Internet läuft die eingebaute Kopie.
set -e
cd "$(dirname "$0")"
{
  cat <<'HEAD'
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
HEAD
  cat card.js
  echo '}'
} > zuhause-card.js
node --check zuhause-card.js
