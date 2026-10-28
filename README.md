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

## Räume (ab 2.0)

Die Karte baut die Raum-Steuerung selbst aus den Bereichen in Home Assistant: Lichter (Hue-Gruppen statt Einzellampen), Schalter, Jalousien mit Positions-Slider, Thermostate mit Boost und die Hue-Szenen des Raums. Mit „Anordnen“ lassen sich Räume verschieben und ausblenden; das wird pro Benutzer in Home Assistant gespeichert. Dort steht auch die Boost-Dauer für die Restzeit-Anzeige.

Alarmanlage: optional `alarm_on`, `alarm_off` (button/script) und `alarm_state`; sonst sucht die Karte nach Entitäten namens „Schärfen“, „Entschärfen“ bzw. „Alarmanlage“.

Kameras: angezeigt werden nur Kameras mit Livebild.
