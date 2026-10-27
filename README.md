# Zuhause Card

Eine Startseite für Home Assistant als einzelne Karte: Energiefluss, Speicher, Wallbox, Sicherheit, Raumklima, Schalter mit Szenen, Kameras, Wetter und Hinweise. Optimiert für Tablet und Handy.

Installation über HACS als benutzerdefiniertes Repository vom Typ „Dashboard“. Alle Geräte werden in der Dashboard-Konfiguration eingetragen:

```yaml
type: custom:zuhause-card
name: Dein Name
weather: weather.forecast_home
pv: sensor.pv_power
grid_in: sensor.grid_import_power
grid_out: sensor.grid_export_power
rooms:
  - name: Wohnzimmer
    icon: sofa
    t: sensor.wohnzimmer_temperatur
    h: sensor.wohnzimmer_luftfeuchtigkeit
switches:
  - name: Wohnzimmer
    icon: lamp
    entity: light.wohnzimmer
scene_rooms: [Wohnzimmer]
```

Bilder (`haus.webp`, `auto.webp`, `wallbox.webp`, `anker.webp`) liegen lokal unter `/config/www/dashboard/`; der Pfad lässt sich mit `images:` ändern.

## Kameras

```yaml
cameras:
  - name: Haustür
    brand: Reolink
    find: haustuer        # sucht camera.*haustuer* selbst, statt fester entity
  - name: Garten
    brand: Blink
    entity: camera.garten
```

Ohne `entity` und `find` sucht die Karte nach dem Namen (Haustür -> camera.*haustuer*). Einträge mit `app: true` werden ausgeblendet. Es erscheint außerdem ein Hinweis „Es klingelt“, solange ein passender Besucher-Sensor (`binary_sensor.*haustuer*besucher*` bzw. `*visitor*`) an ist.
